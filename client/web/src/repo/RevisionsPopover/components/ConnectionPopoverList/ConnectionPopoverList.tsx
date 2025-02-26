import classNames from 'classnames'
import React, { HTMLAttributes } from 'react'

import { ConnectionList } from '../../../../components/FilteredConnection/ui'

import styles from './ConnectionPopoverList.module.scss'

type ConnectionPopoverListProps = HTMLAttributes<HTMLDivElement>

export const ConnectionPopoverList: React.FunctionComponent<ConnectionPopoverListProps> = ({
    className,
    children,
    ...rest
}) => (
    <ConnectionList className={classNames(styles.connectionPopoverNodes, className)} compact={true} {...rest}>
        {children}
    </ConnectionList>
)
