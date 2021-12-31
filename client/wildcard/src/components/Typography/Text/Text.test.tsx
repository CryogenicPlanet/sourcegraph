import { render } from '@testing-library/react'
import React from 'react'

import { Text } from './Text'

describe('Text', () => {
    it('renders a simple text correctly', () => {
        const { container } = render(<Text>Hello world</Text>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <p
              class=""
            >
              Hello world
            </p>
        `)
    })

    it('supports rendering as different elements', () => {
        const { container } = render(<Text as="div">I am a text</Text>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <div
              class=""
            >
              I am a text
            </div>
        `)
    })

    it('renders Text content correctly', () => {
        const { container } = render(<Text>Text Typography component</Text>)
        expect(container.firstChild).toHaveTextContent('Text Typography component')
    })
})
