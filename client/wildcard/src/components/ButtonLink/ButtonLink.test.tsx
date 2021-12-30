import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import sinon from 'sinon'

import { ButtonLink } from './ButtonLink'

describe('Button link', () => {
    test('renders correctly', () => {
        const { asFragment } = render(<ButtonLink to="http://example.com">Button link</ButtonLink>)
        expect(asFragment()).toMatchSnapshot()
    })
    test('Works when to is undefined', () => {
        const { container } = render(<ButtonLink>I am a link</ButtonLink>)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <a
              class="anchorLink nav-link"
              href=""
              role="button"
              tabindex="0"
            >
              I am a link
            </a>
        `)
    })
    test('Works with onSelect', () => {
        const handleClick = sinon.spy()
        render(<ButtonLink onSelect={handleClick}>Click Me</ButtonLink>)
        fireEvent.click(screen.getByText(/click me/i))
        sinon.assert.called(handleClick)
    })
    test('Should be disabled with disabled prop', () => {
        render(
            <ButtonLink className="btn" disabled={true}>
                Disabled button
            </ButtonLink>
        )
        expect(screen.getByText(/disabled button/i)).toHaveClass('disabled')
    })
})
