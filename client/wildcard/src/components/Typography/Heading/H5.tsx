import React from 'react'

import { ForwardReferenceComponent } from '../../../types'

import { Heading, HeadingProps } from './Heading'

type H5Props = HeadingProps

// eslint-disable-next-line id-length
export const H5 = React.forwardRef(({ children, as = 'h5', ...props }, reference) => (
    <Heading as={as} {...props} ref={reference}>
        {children}
    </Heading>
)) as ForwardReferenceComponent<'h5', H5Props>
