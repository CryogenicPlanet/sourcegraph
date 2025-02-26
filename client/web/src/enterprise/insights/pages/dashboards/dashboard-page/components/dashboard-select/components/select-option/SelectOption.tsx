import { ListboxOption } from '@reach/listbox'
import classNames from 'classnames'
import React from 'react'

import { RealInsightDashboard } from '../../../../../../../core/types'
import { getDashboardOwnerName, getDashboardTitle } from '../../helpers/get-dashboard-title'
import { InsightsBadge } from '../insights-badge/InsightsBadge'
import { TruncatedText } from '../trancated-text/TrancatedText'

import styles from './SelectOption.module.scss'

export interface SelectOptionProps {
    /** Value for the list-option element */
    value: string

    /** List-box label text */
    label: string

    /** Badge text */
    badge?: string

    className?: string
}

/**
 * Displays simple text (label) list select (list-box) option.
 */
export const SelectOption: React.FunctionComponent<SelectOptionProps> = props => {
    const { value, label, badge, className } = props

    return (
        <ListboxOption className={classNames(styles.option, className)} value={value}>
            <TruncatedText title={label} className={styles.text}>
                {label}
            </TruncatedText>
            {badge && <InsightsBadge value={badge} className={styles.badge} />}
        </ListboxOption>
    )
}

interface SelectDashboardOptionProps {
    dashboard: RealInsightDashboard
    className?: string
}

/**
 * Displays select dashboard list-box options.
 */
export const SelectDashboardOption: React.FunctionComponent<SelectDashboardOptionProps> = props => {
    const { dashboard, className } = props

    return (
        <SelectOption
            value={dashboard.id}
            label={getDashboardTitle(dashboard)}
            badge={getDashboardOwnerName(dashboard)}
            className={className}
        />
    )
}
