package database

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"fmt"
	"time"

	"github.com/cockroachdb/errors"
	"github.com/keegancsmith/sqlf"

	"github.com/sourcegraph/sourcegraph/internal/database/basestore"
	"github.com/sourcegraph/sourcegraph/internal/database/dbutil"
)

// UserEmail represents a row in the `user_emails` table.
type UserEmail struct {
	UserID                 int32
	Email                  string
	CreatedAt              time.Time
	VerificationCode       *string
	VerifiedAt             *time.Time
	LastVerificationSentAt *time.Time
	Primary                bool
}

// NeedsVerificationCoolDown returns true if the verification cooled down time is behind current time.
func (email *UserEmail) NeedsVerificationCoolDown() bool {
	const defaultDur = 30 * time.Second
	return email.LastVerificationSentAt != nil &&
		time.Now().UTC().Before(email.LastVerificationSentAt.Add(defaultDur))
}

// userEmailNotFoundError is the error that is returned when a user email is not found.
type userEmailNotFoundError struct {
	args []interface{}
}

func (err userEmailNotFoundError) Error() string {
	return fmt.Sprintf("user email not found: %v", err.args)
}

func (err userEmailNotFoundError) NotFound() bool {
	return true
}

type UserEmailsStore interface {
	Add(ctx context.Context, userID int32, email string, verificationCode *string) error
	Done(error) error
	Get(ctx context.Context, userID int32, email string) (emailCanonicalCase string, verified bool, err error)
	GetInitialSiteAdminEmail(ctx context.Context) (email string, err error)
	GetLatestVerificationSentEmail(ctx context.Context, email string) (*UserEmail, error)
	GetPrimaryEmail(ctx context.Context, id int32) (email string, verified bool, err error)
	GetVerifiedEmails(ctx context.Context, emails ...string) ([]*UserEmail, error)
	ListByUser(ctx context.Context, opt UserEmailsListOptions) ([]*UserEmail, error)
	Remove(ctx context.Context, userID int32, email string) error
	SetLastVerification(ctx context.Context, userID int32, email, code string) error
	SetPrimaryEmail(ctx context.Context, userID int32, email string) error
	SetVerified(ctx context.Context, userID int32, email string, verified bool) error
	Transact(ctx context.Context) (UserEmailsStore, error)
	Verify(ctx context.Context, userID int32, email, code string) (bool, error)
	With(other basestore.ShareableStore) UserEmailsStore
	basestore.ShareableStore
}

// userEmailsStore provides access to the `user_emails` table.
type userEmailsStore struct {
	*basestore.Store
}

// UserEmails instantiates and returns a new UserEmailsStore with prepared statements.
func UserEmails(db dbutil.DB) UserEmailsStore {
	return &userEmailsStore{Store: basestore.NewWithDB(db, sql.TxOptions{})}
}

// UserEmailsWith instantiates and returns a new UserEmailsStore using the other store handle.
func UserEmailsWith(other basestore.ShareableStore) UserEmailsStore {
	return &userEmailsStore{Store: basestore.NewWithHandle(other.Handle())}
}

func (s *userEmailsStore) With(other basestore.ShareableStore) UserEmailsStore {
	return &userEmailsStore{Store: s.Store.With(other)}
}

func (s *userEmailsStore) Transact(ctx context.Context) (UserEmailsStore, error) {
	txBase, err := s.Store.Transact(ctx)
	return &userEmailsStore{Store: txBase}, err
}

// GetInitialSiteAdminEmail returns a best guess of the email of the initial Sourcegraph installer/site admin.
// Because the initial site admin's email isn't marked, this returns the email of the active site admin with
// the lowest user ID.
//
// If the site has not yet been initialized, returns an empty string.
func (s *userEmailsStore) GetInitialSiteAdminEmail(ctx context.Context) (email string, err error) {
	if init, err := GlobalStateWith(s).SiteInitialized(ctx); err != nil || !init {
		return "", err
	}
	if err := s.Handle().DB().QueryRowContext(ctx, "SELECT email FROM user_emails JOIN users ON user_emails.user_id=users.id WHERE users.site_admin AND users.deleted_at IS NULL ORDER BY users.id ASC LIMIT 1").Scan(&email); err != nil {
		return "", errors.New("initial site admin email not found")
	}
	return email, nil
}

// GetPrimaryEmail gets the oldest email associated with the user, preferring a verified email to an
// unverified email.
func (s *userEmailsStore) GetPrimaryEmail(ctx context.Context, id int32) (email string, verified bool, err error) {
	if err := s.Handle().DB().QueryRowContext(ctx, "SELECT email, verified_at IS NOT NULL AS verified FROM user_emails WHERE user_id=$1 AND is_primary",
		id,
	).Scan(&email, &verified); err != nil {
		return "", false, userEmailNotFoundError{[]interface{}{fmt.Sprintf("id %d", id)}}
	}
	return email, verified, nil
}

// SetPrimaryEmail sets the primary email for a user.
// The address must be verified.
// All other addresses for the user will be set as not primary.
func (s *userEmailsStore) SetPrimaryEmail(ctx context.Context, userID int32, email string) error {
	tx, err := s.Transact(ctx)
	if err != nil {
		return err
	}
	defer func() { err = tx.Done(err) }()

	// Get the email. It needs to exist and be verified.
	var verified bool
	if err := tx.Handle().DB().QueryRowContext(ctx, "SELECT verified_at IS NOT NULL AS verified FROM user_emails WHERE user_id=$1 AND email=$2",
		userID, email,
	).Scan(&verified); err != nil {
		return err
	}
	if !verified {
		return errors.New("primary email must be verified")
	}

	// We need to set all as non primary and then set the correct one as primary in two steps
	// so that we don't violate our index.

	// Set all as not primary
	if _, err := tx.Handle().DB().ExecContext(ctx, "UPDATE user_emails SET is_primary = false WHERE user_id=$1", userID); err != nil {
		return err
	}

	// Set selected as primary
	if _, err := tx.Handle().DB().ExecContext(ctx, "UPDATE user_emails SET is_primary = true WHERE user_id=$1 AND email=$2", userID, email); err != nil {
		return err
	}

	return nil
}

// Get gets information about the user's associated email address.
func (s *userEmailsStore) Get(ctx context.Context, userID int32, email string) (emailCanonicalCase string, verified bool, err error) {
	if err := s.Handle().DB().QueryRowContext(ctx, "SELECT email, verified_at IS NOT NULL AS verified FROM user_emails WHERE user_id=$1 AND email=$2",
		userID, email,
	).Scan(&emailCanonicalCase, &verified); err != nil {
		return "", false, userEmailNotFoundError{[]interface{}{fmt.Sprintf("userID %d email %q", userID, email)}}
	}
	return emailCanonicalCase, verified, nil
}

// Add adds new user email. When added, it is always unverified.
func (s *userEmailsStore) Add(ctx context.Context, userID int32, email string, verificationCode *string) error {
	_, err := s.Handle().DB().ExecContext(ctx, "INSERT INTO user_emails(user_id, email, verification_code) VALUES($1, $2, $3)", userID, email, verificationCode)
	return err
}

// Remove removes a user email. It returns an error if there is no such email associated with the user or the email
// is the user's primary address
func (s *userEmailsStore) Remove(ctx context.Context, userID int32, email string) error {
	tx, err := s.Transact(ctx)
	if err != nil {
		return err
	}
	defer func() { err = tx.Done(err) }()

	// Get the email. It needs to exist and be verified.
	var isPrimary bool
	if err := tx.Handle().DB().QueryRowContext(ctx, "SELECT is_primary FROM user_emails WHERE user_id=$1 AND email=$2",
		userID, email,
	).Scan(&isPrimary); err != nil {
		return errors.Errorf("fetching email address: %w", err)
	}
	if isPrimary {
		return errors.New("can't delete primary email address")
	}

	_, err = tx.Handle().DB().ExecContext(ctx, "DELETE FROM user_emails WHERE user_id=$1 AND email=$2", userID, email)
	if err != nil {
		return err
	}
	return nil
}

// Verify verifies the user's email address given the email verification code. If the code is not
// correct (not the one originally used when creating the user or adding the user email), then it
// returns false.
func (s *userEmailsStore) Verify(ctx context.Context, userID int32, email, code string) (bool, error) {
	var dbCode sql.NullString
	if err := s.Handle().DB().QueryRowContext(ctx, "SELECT verification_code FROM user_emails WHERE user_id=$1 AND email=$2", userID, email).Scan(&dbCode); err != nil {
		return false, err
	}
	if !dbCode.Valid {
		return false, errors.New("email already verified")
	}
	// 🚨 SECURITY: Use constant-time comparisons to avoid leaking the verification code via timing attack. It is not important to avoid leaking the *length* of the code, because the length of verification codes is constant.
	if len(dbCode.String) != len(code) || subtle.ConstantTimeCompare([]byte(dbCode.String), []byte(code)) != 1 {
		return false, nil
	}
	if _, err := s.Handle().DB().ExecContext(ctx, "UPDATE user_emails SET verification_code=null, verified_at=now() WHERE user_id=$1 AND email=$2", userID, email); err != nil {
		return false, err
	}

	return true, nil
}

// SetVerified bypasses the normal email verification code process and manually sets the verified
// status for an email.
func (s *userEmailsStore) SetVerified(ctx context.Context, userID int32, email string, verified bool) error {
	var res sql.Result
	var err error
	if verified {
		// Mark as verified.
		res, err = s.Handle().DB().ExecContext(ctx, "UPDATE user_emails SET verification_code=null, verified_at=now() WHERE user_id=$1 AND email=$2", userID, email)
	} else {
		// Mark as unverified.
		res, err = s.Handle().DB().ExecContext(ctx, "UPDATE user_emails SET verification_code=null, verified_at=null WHERE user_id=$1 AND email=$2", userID, email)
	}
	if err != nil {
		return err
	}
	nrows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if nrows == 0 {
		return errors.New("user email not found")
	}
	return nil
}

// SetLastVerification sets the "last_verification_sent_at" column to now() and updates the verification code for given email of the user.
func (s *userEmailsStore) SetLastVerification(ctx context.Context, userID int32, email, code string) error {
	res, err := s.Handle().DB().ExecContext(ctx, "UPDATE user_emails SET last_verification_sent_at=now(), verification_code = $3 WHERE user_id=$1 AND email=$2", userID, email, code)
	if err != nil {
		return err
	}
	nrows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if nrows == 0 {
		return errors.New("user email not found")
	}
	return nil
}

// GetLatestVerificationSentEmail returns the email with the lastest time of "last_verification_sent_at" column,
// it excludes rows with "last_verification_sent_at IS NULL".
func (s *userEmailsStore) GetLatestVerificationSentEmail(ctx context.Context, email string) (*UserEmail, error) {
	q := sqlf.Sprintf(`
WHERE email=%s AND last_verification_sent_at IS NOT NULL
ORDER BY last_verification_sent_at DESC
LIMIT 1
`, email)
	emails, err := s.getBySQL(ctx, q.Query(sqlf.PostgresBindVar), q.Args()...)
	if err != nil {
		return nil, err
	} else if len(emails) < 1 {
		return nil, userEmailNotFoundError{[]interface{}{fmt.Sprintf("email %q", email)}}
	}
	return emails[0], nil
}

// GetVerifiedEmails returns a list of verified emails from the candidate list. Some emails are excluded
// from the results list because of unverified or simply don't exist.
func (s *userEmailsStore) GetVerifiedEmails(ctx context.Context, emails ...string) ([]*UserEmail, error) {
	if len(emails) == 0 {
		return []*UserEmail{}, nil
	}

	items := make([]*sqlf.Query, len(emails))
	for i := range emails {
		items[i] = sqlf.Sprintf("%s", emails[i])
	}
	q := sqlf.Sprintf("WHERE email IN (%s) AND verified_at IS NOT NULL", sqlf.Join(items, ","))
	return s.getBySQL(ctx, q.Query(sqlf.PostgresBindVar), q.Args()...)
}

// UserEmailsListOptions specifies the options for listing user emails.
type UserEmailsListOptions struct {
	// UserID specifies the id of the user for listing emails.
	UserID int32
	// OnlyVerified excludes unverified emails from the list.
	OnlyVerified bool
}

// ListByUser returns a list of emails that are associated to the given user.
func (s *userEmailsStore) ListByUser(ctx context.Context, opt UserEmailsListOptions) ([]*UserEmail, error) {
	if Mocks.UserEmails.ListByUser != nil {
		return Mocks.UserEmails.ListByUser(ctx, opt)
	}

	conds := []*sqlf.Query{
		sqlf.Sprintf("user_id=%s", opt.UserID),
	}
	if opt.OnlyVerified {
		conds = append(conds, sqlf.Sprintf("verified_at IS NOT NULL"))
	}

	q := sqlf.Sprintf("WHERE %s ORDER BY created_at ASC, email ASC", sqlf.Join(conds, "AND"))
	return s.getBySQL(ctx, q.Query(sqlf.PostgresBindVar), q.Args()...)
}

// getBySQL returns user emails matching the SQL query, if any exist.
func (s *userEmailsStore) getBySQL(ctx context.Context, query string, args ...interface{}) ([]*UserEmail, error) {
	rows, err := s.Handle().DB().QueryContext(ctx,
		`SELECT user_emails.user_id, user_emails.email, user_emails.created_at, user_emails.verification_code,
				user_emails.verified_at, user_emails.last_verification_sent_at, user_emails.is_primary FROM user_emails `+query, args...)
	if err != nil {
		return nil, err
	}

	var userEmails []*UserEmail
	defer rows.Close()
	for rows.Next() {
		var v UserEmail
		err := rows.Scan(&v.UserID, &v.Email, &v.CreatedAt, &v.VerificationCode, &v.VerifiedAt, &v.LastVerificationSentAt, &v.Primary)
		if err != nil {
			return nil, err
		}
		userEmails = append(userEmails, &v)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return userEmails, nil
}
