import { render } from '@testing-library/react'
import React from 'react'

import { H6 } from './H6'

describe('H6', () => {
    it('renders a simple heading correctly', () => {
        const { container } = render(<H6>This is H6</H6>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <h6
              class=""
            >
              This is H6
            </h6>
        `)
    })
})
