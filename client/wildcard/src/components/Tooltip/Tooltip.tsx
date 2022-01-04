import classNames from 'classnames'
import React, { ReactNode } from 'react'
import { Tooltip as BootstrapTooltip } from 'reactstrap'

import styles from './Tooltip.module.scss'
import { useTooltipState } from './useTooltipState'
import { getTooltipStyle } from './utils'

interface TooltipProps {
    className?: string
    children?: ReactNode
}

export const Tooltip: React.FunctionComponent<TooltipProps> = ({ className }) => {
    const { subject, content, subjectSeq, placement = 'auto', delay } = useTooltipState()

    if (!subject || !content) {
        return null
    }

    return (
        <BootstrapTooltip
            // Set key prop to work around a bug where quickly mousing between 2 elements with tooltips
            // displays the 2nd element's tooltip as still pointing to the first.
            key={subjectSeq}
            isOpen={true}
            target={subject}
            placement={placement}
            // in order to add our own placement classes we need to set the popperClassNames
            // here is where bootstrap injects it's placement classes such as 'bs-tooltip-auto' automatically.
            popperClassName={classNames(styles.tooltip, styles.show, className, getTooltipStyle(placement))}
            innerClassName={styles.tooltipInner}
            delay={delay}
        >
            {content}
        </BootstrapTooltip>
    )
}
