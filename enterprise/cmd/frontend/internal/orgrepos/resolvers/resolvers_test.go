package resolvers

import (
	"context"
	"testing"

	"github.com/graph-gophers/graphql-go"

	"github.com/sourcegraph/sourcegraph/cmd/frontend/graphqlbackend"
	"github.com/sourcegraph/sourcegraph/internal/actor"
	"github.com/sourcegraph/sourcegraph/internal/database"
	"github.com/sourcegraph/sourcegraph/internal/types"
)

func TestOrgRepositories(t *testing.T) {
	users := database.NewMockUserStore()
	users.GetByCurrentAuthUserFunc.SetDefaultReturn(&types.User{ID: 1}, nil)

	orgs := database.NewMockOrgStore()
	orgs.GetByNameFunc.SetDefaultReturn(&types.Org{ID: 1, Name: "acme"}, nil)

	orgMembers := database.NewMockOrgMemberStore()
	orgMembers.GetByOrgIDAndUserIDFunc.SetDefaultReturn(&types.OrgMembership{OrgID: 1, UserID: 1}, nil)

	featureFlags := database.NewMockFeatureFlagStore()
	featureFlags.GetOrgFeatureFlagFunc.SetDefaultReturn(true, nil)

	repos := database.NewMockRepoStore()
	repos.ListFunc.SetDefaultReturn(
		[]*types.Repo{
			{Name: "acme-repo"},
		},
		nil,
	)

	db := database.NewMockDB()
	db.OrgsFunc.SetDefaultReturn(orgs)
	db.UsersFunc.SetDefaultReturn(users)
	db.OrgMembersFunc.SetDefaultReturn(orgMembers)
	db.FeatureFlagsFunc.SetDefaultReturn(featureFlags)
	db.ReposFunc.SetDefaultReturn(repos)

	ctx := actor.WithActor(context.Background(), &actor.Actor{UID: 1})

	graphqlbackend.RunTests(t, []*graphqlbackend.Test{
		{
			Schema: func() *graphql.Schema {
				t.Helper()

				parsedSchema, parseSchemaErr := graphqlbackend.NewSchema(db, nil, nil, nil, nil, nil, nil, nil, nil, NewResolver(db), nil)
				if parseSchemaErr != nil {
					t.Fatal(parseSchemaErr)
				}

				return parsedSchema
			}(),
			Query: `
				{
					organization(name: "acme") {
						name,
						repositories {
							nodes {
								name
							}
						}
					}
				}
			`,
			ExpectedResult: `
				{
					"organization": {
						"name": "acme",
						"repositories": {
							"nodes": [{
								"name": "acme-repo"
							}]
						}
					}
				}
			`,
			Context: ctx,
		},
	})
}
