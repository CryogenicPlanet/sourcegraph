import { render } from '@testing-library/react'
import React from 'react'

import { Code } from './Code'

describe('Code', () => {
    it('renders a simple text code correctly', () => {
        const { container } = render(<Code>Hello world</Code>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <code
              class=""
            >
              Hello world
            </code>
        `)
    })

    it('supports rendering as different elements', () => {
        const { container } = render(<Code as="div">I am a code</Code>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <div
              class=""
            >
              I am a code
            </div>
        `)
    })
})
