import classNames from 'classnames'
import React from 'react'

import { ForwardReferenceComponent } from '../../../types'
import typographyStyles from '../typography.module.scss'
import { getFontWeightStyle } from '../utils'

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
    size?: 'small' | 'base'
    weight?: 'regular' | 'medium' | 'bold'
}

export const Code = React.forwardRef(({ children, as: Component = 'code', size, weight, className }, reference) => (
    <Component
        className={classNames(
            size === 'small' && typographyStyles.small,
            weight && getFontWeightStyle({ weight }),
            className
        )}
        ref={reference}
    >
        {children}
    </Component>
)) as ForwardReferenceComponent<'code', CodeProps>
