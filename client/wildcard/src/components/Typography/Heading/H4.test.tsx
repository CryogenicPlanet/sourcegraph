import { render } from '@testing-library/react'
import React from 'react'

import { H4 } from './H4'

describe('H4', () => {
    it('renders a simple heading correctly', () => {
        const { container } = render(<H4>This is H4</H4>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <h4
              class=""
            >
              This is H4
            </h4>
        `)
    })
})
