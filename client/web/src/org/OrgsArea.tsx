import MapSearchIcon from 'mdi-react/MapSearchIcon'
import * as React from 'react'
import { Route, RouteComponentProps, Switch } from 'react-router'

import { ExtensionsControllerProps } from '@sourcegraph/shared/src/extensions/controller'
import { PlatformContextProps } from '@sourcegraph/shared/src/platform/context'
import { SettingsCascadeProps } from '@sourcegraph/shared/src/settings/settings'
import { TelemetryProps } from '@sourcegraph/shared/src/telemetry/telemetryService'
import { ThemeProps } from '@sourcegraph/shared/src/theme'

import { AuthenticatedUser } from '../auth'
import { withAuthenticatedUser } from '../auth/withAuthenticatedUser'
import { BatchChangesProps } from '../batches'
import { BreadcrumbsProps, BreadcrumbSetters } from '../components/Breadcrumbs'
import { HeroPage } from '../components/HeroPage'
import { PatternTypeProps } from '../search'

import { OrgArea, OrgAreaRoute } from './area/OrgArea'
import { OrgAreaHeaderNavItem } from './area/OrgHeader'
import { NewOrganizationPage } from './new/NewOrganizationPage'

const NotFoundPage: React.FunctionComponent = () => (
    <HeroPage
        icon={MapSearchIcon}
        title="404: Not Found"
        subtitle="Sorry, the requested organization page was not found."
    />
)

interface Props
    extends RouteComponentProps<{}>,
        ExtensionsControllerProps,
        PlatformContextProps,
        SettingsCascadeProps,
        ThemeProps,
        TelemetryProps,
        BreadcrumbsProps,
        BreadcrumbSetters,
        BatchChangesProps,
        Omit<PatternTypeProps, 'setPatternType'> {
    orgAreaRoutes: readonly OrgAreaRoute[]
    orgAreaHeaderNavItems: readonly OrgAreaHeaderNavItem[]

    authenticatedUser: AuthenticatedUser
    isSourcegraphDotCom: boolean
}

/**
 * Renders a layout of a sidebar and a content area to display organization-related pages.
 */
const AuthenticatedOrgsArea: React.FunctionComponent<Props> = props => (
    <Switch>
        <Route path={`${props.match.url}/new`} component={NewOrganizationPage} exact={true} />
        <Route
            path={`${props.match.url}/:name`}
            render={routeComponentProps => <OrgArea {...props} {...routeComponentProps} />}
        />
        <Route component={NotFoundPage} />
    </Switch>
)

export const OrgsArea = withAuthenticatedUser(AuthenticatedOrgsArea)
