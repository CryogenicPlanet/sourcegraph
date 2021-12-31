import { render } from '@testing-library/react'
import React from 'react'

import { H5 } from './H5'

describe('H5', () => {
    it('renders a simple heading correctly', () => {
        const { container } = render(<H5>This is H5</H5>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <h5
              class=""
            >
              This is H5
            </h5>
        `)
    })
})
