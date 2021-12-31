import { render } from '@testing-library/react'
import React from 'react'

import { H2 } from './H2'

describe('H2', () => {
    it('renders a simple heading correctly', () => {
        const { container } = render(<H2>This is H2</H2>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <h2
              class=""
            >
              This is H2
            </h2>
        `)
    })
})
