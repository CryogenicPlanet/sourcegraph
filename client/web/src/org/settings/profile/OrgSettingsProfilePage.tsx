import React, { useCallback, useEffect, useState } from 'react'

import { Form } from '@sourcegraph/branded/src/components/Form'
import { asError, isErrorLike } from '@sourcegraph/common'
import { LoadingSpinner } from '@sourcegraph/react-loading-spinner'
import { Container, PageHeader } from '@sourcegraph/wildcard'

import { ORG_DISPLAY_NAME_MAX_LENGTH } from '../..'
import { ErrorAlert } from '../../../components/alerts'
import { PageTitle } from '../../../components/PageTitle'
import { Timestamp } from '../../../components/time/Timestamp'
import { eventLogger } from '../../../tracking/eventLogger'
import { OrgAreaPageProps } from '../../area/OrgArea'
import { updateOrganization } from '../../backend'

interface Props extends Pick<OrgAreaPageProps, 'org' | 'onOrganizationUpdate'> {}

/**
 * The organization profile settings page.
 */
export const OrgSettingsProfilePage: React.FunctionComponent<Props> = ({ org, onOrganizationUpdate }) => {
    useEffect(() => {
        eventLogger.logViewEvent('OrgSettingsProfile')
    }, [org.id])

    const [displayName, setDisplayName] = useState<string>(org.displayName ?? '')
    const onDisplayNameFieldChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(event => {
        setDisplayName(event.target.value)
    }, [])
    const [isLoading, setIsLoading] = useState<boolean | Error>(false)
    const [updated, setIsUpdated] = useState<boolean>(false)
    const [updateResetTimer, setUpdateResetTimer] = useState<NodeJS.Timer>()

    useEffect(
        () => () => {
            if (updateResetTimer) {
                clearTimeout(updateResetTimer)
            }
        },
        [updateResetTimer]
    )

    const onSubmit = useCallback<React.FormEventHandler>(
        async event => {
            event.preventDefault()
            setIsLoading(true)
            try {
                await updateOrganization(org.id, displayName)
                onOrganizationUpdate()
                // Reenable submit button, flash "updated" text
                setIsLoading(false)
                setIsUpdated(true)
                setUpdateResetTimer(
                    setTimeout(() => {
                        // Hide "updated" text again after 1s
                        setIsUpdated(false)
                    }, 1000)
                )
            } catch (error) {
                setIsLoading(asError(error))
            }
        },
        [displayName, onOrganizationUpdate, org.id]
    )

    return (
        <div className="org-settings-profile-page">
            <PageTitle title={org.name} />
            <PageHeader
                path={[{ text: 'Organization profile' }]}
                headingElement="h2"
                description={
                    <>
                        {org.displayName ? (
                            <>
                                {org.displayName} ({org.name})
                            </>
                        ) : (
                            org.name
                        )}{' '}
                        was created <Timestamp date={org.createdAt} />.
                    </>
                }
                className="mb-3"
            />
            <Container>
                <Form className="org-settings-profile-page" onSubmit={onSubmit}>
                    <div className="form-group">
                        <label htmlFor="org-settings-profile-page-display-name">Display name</label>
                        <input
                            id="org-settings-profile-page-display-name"
                            type="text"
                            className="form-control org-settings-profile-page__display-name"
                            placeholder="Organization name"
                            onChange={onDisplayNameFieldChange}
                            value={displayName}
                            spellCheck={false}
                            maxLength={ORG_DISPLAY_NAME_MAX_LENGTH}
                        />
                    </div>
                    <button type="submit" disabled={isLoading === true} className="btn btn-primary">
                        Update
                    </button>
                    {isLoading === true && <LoadingSpinner className="icon-inline" />}
                    {updated && (
                        <p className="mb-0">
                            <small>Updated!</small>
                        </p>
                    )}
                    {isErrorLike(isLoading) && <ErrorAlert error={isLoading} />}
                </Form>
            </Container>
        </div>
    )
}
