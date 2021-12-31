import { render } from '@testing-library/react'
import React from 'react'

import { H3 } from './H3'

describe('H3', () => {
    it('renders a simple heading correctly', () => {
        const { container } = render(<H3>This is H3</H3>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <h3
              class=""
            >
              This is H3
            </h3>
        `)
    })
})
