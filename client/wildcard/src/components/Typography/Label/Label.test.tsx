import { render } from '@testing-library/react'
import React from 'react'

import { Label } from './Label'

describe('Label', () => {
    it('renders a simple label text correctly', () => {
        const { container } = render(<Label>Hello world</Label>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <label
              class=""
            >
              Hello world
            </label>
        `)
    })

    it('supports rendering as different elements', () => {
        const { container } = render(<Label as="div">I am a label</Label>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <div
              class=""
            >
              I am a label
            </div>
        `)
    })

    it('renders Label content correctly', () => {
        const { container } = render(<Label>Label Typography component</Label>)
        expect(container.firstChild).toHaveTextContent('Label Typography component')
    })
})
