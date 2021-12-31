import { select } from '@storybook/addon-knobs'
import { DecoratorFn, Meta, Story } from '@storybook/react'
import React from 'react'

import { BrandedStory } from '@sourcegraph/branded/src/components/BrandedStory'
import webStyles from '@sourcegraph/web/src/SourcegraphWebApp.scss'

import { TYPOGRAPHY_ALIGNMENTS, TYPOGRAPHY_MODES } from '../constants'

import { Heading } from './Heading'

import { H1, H2, H3, H4, H5, H6 } from '.'

const decorator: DecoratorFn = story => <BrandedStory styles={webStyles}>{() => <div>{story()}</div>}</BrandedStory>

const config: Meta = {
    title: 'wildcard/Headings',

    decorators: [decorator],

    parameters: {
        component: Heading,
        design: {
            type: 'figma',
            name: 'Figma',
            url: 'https://www.figma.com/file/NIsN34NH7lPu04olBzddTw/Wildcard-Design-System?node-id=5601%3A65477',
        },
    },
}

export default config

export const Alignment: Story = props => (
    <div>
        <H1 alignment={select('alignment', TYPOGRAPHY_ALIGNMENTS, undefined)} {...props}>
            This is H1
        </H1>
        <H2 alignment={select('alignment', TYPOGRAPHY_ALIGNMENTS, undefined)} {...props}>
            This is H2
        </H2>
        <H3 alignment={select('alignment', TYPOGRAPHY_ALIGNMENTS, undefined)} {...props}>
            This is H3
        </H3>
        <H4 alignment={select('alignment', TYPOGRAPHY_ALIGNMENTS, undefined)} {...props}>
            This is H4
        </H4>
        <H5 alignment={select('alignment', TYPOGRAPHY_ALIGNMENTS, undefined)} {...props}>
            This is H5
        </H5>
        <H6 alignment={select('alignment', TYPOGRAPHY_ALIGNMENTS, undefined)} {...props}>
            This is H6
        </H6>
    </div>
)

export const Mode: Story = props => (
    <div style={{ width: '10rem' }}>
        <H1 mode={select('mode', TYPOGRAPHY_MODES, undefined)} {...props}>
            This is H1 Lorem ipsum dolor sit amet.
        </H1>
        <H2 mode={select('mode', TYPOGRAPHY_MODES, undefined)} {...props}>
            This is H2 Lorem ipsum dolor sit amet.
        </H2>
        <H3 mode={select('mode', TYPOGRAPHY_MODES, undefined)} {...props}>
            This is H3 Lorem ipsum dolor sit amet.
        </H3>
        <H4 mode={select('mode', TYPOGRAPHY_MODES, undefined)} {...props}>
            This is H4 Lorem ipsum dolor sit amet.
        </H4>
        <H5 mode={select('mode', TYPOGRAPHY_MODES, undefined)} {...props}>
            This is H5 Lorem ipsum dolor sit amet.
        </H5>
        <H6 mode={select('mode', TYPOGRAPHY_MODES, undefined)} {...props}>
            This is H6 Lorem ipsum dolor sit amet.
        </H6>
    </div>
)
