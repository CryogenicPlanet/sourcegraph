import classNames from 'classnames'
import React, { useRef } from 'react'

import styles from './Panel.module.scss'
import { usePanelResizer } from './usePanelResizer'

interface PanelProps {
    className?: string
    storageKey?: string
    defaultHeight?: number
}

export const Panel: React.FunctionComponent<PanelProps> = ({
    children,
    className,
    defaultHeight = 200,
    storageKey = 'panel-height',
}) => {
    const resizeReference = useRef<HTMLDivElement | null>(null)
    const { panelHeight } = usePanelResizer(resizeReference, storageKey, defaultHeight)

    return (
        <div
            // eslint-disable-next-line react/forbid-dom-props
            style={{ height: `${panelHeight}px` }}
            className={classNames(className, styles.panel)}
        >
            <div ref={resizeReference} className={classNames(styles.handleResize)} />
            {children}
        </div>
    )
}
