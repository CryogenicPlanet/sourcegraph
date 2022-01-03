import { upperFirst } from 'lodash'

import styles from './Button.module.scss'
import { BUTTON_VARIANTS, BUTTON_SIZES } from './constants'

interface GetButtonStyleParameters {
    variant: typeof BUTTON_VARIANTS[number]
    outline?: boolean
}

export const getButtonStyle = ({ variant, outline }: GetButtonStyleParameters): string =>
    styles[`btn${outline ? 'Outline' : ''}${upperFirst(variant)}` as keyof typeof styles]

interface GetButtonSizeParameters {
    size: typeof BUTTON_SIZES[number]
}

export const getButtonSize = ({ size }: GetButtonSizeParameters): string =>
    styles[`btn${upperFirst(size)}` as keyof typeof styles]
