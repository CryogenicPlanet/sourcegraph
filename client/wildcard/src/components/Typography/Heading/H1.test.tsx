import { render } from '@testing-library/react'
import React from 'react'

import { H1 } from './H1'

describe('H1', () => {
    it('renders a simple heading correctly', () => {
        const { container } = render(<H1>This is H1</H1>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <h1
              class=""
            >
              This is H1
            </h1>
        `)
    })
})
