import classNames from 'classnames'
import React from 'react'

import { ForwardReferenceComponent } from '../../../types'
import typographyStyles from '../typography.module.scss'
import { getAlignmentStyle, getFontWeightStyle, getModeStyle, TypographyProps } from '../utils'

import styles from './Label.module.scss'

interface LabelProps extends React.HTMLAttributes<HTMLLabelElement>, TypographyProps {
    size?: 'small' | 'base'
    weight?: 'regular' | 'medium' | 'bold'
    isUnderline?: boolean
    isUppercase?: boolean
}

export const Label = React.forwardRef(
    (
        { children, as: Component = 'label', size, weight, alignment, mode, isUnderline, isUppercase, className },
        reference
    ) => (
        <Component
            className={classNames(
                isUnderline && styles.underline,
                isUppercase && styles.uppercase,
                size === 'small' && typographyStyles.small,
                weight && getFontWeightStyle({ weight }),
                alignment && getAlignmentStyle({ alignment }),
                mode && getModeStyle({ mode }),
                className
            )}
            ref={reference}
        >
            {children}
        </Component>
    )
) as ForwardReferenceComponent<'label', LabelProps>
