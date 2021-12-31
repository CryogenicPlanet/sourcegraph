import { boolean, select } from '@storybook/addon-knobs'
import { DecoratorFn, Meta, Story } from '@storybook/react'
import React from 'react'

import { BrandedStory } from '@sourcegraph/branded/src/components/BrandedStory'
import webStyles from '@sourcegraph/web/src/SourcegraphWebApp.scss'

import { TYPOGRAPHY_ALIGNMENTS, TYPOGRAPHY_MODES, TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from '../constants'

import { Label } from './Label'

const decorator: DecoratorFn = story => <BrandedStory styles={webStyles}>{() => <div>{story()}</div>}</BrandedStory>

const config: Meta = {
    title: 'wildcard/Label',

    decorators: [decorator],

    parameters: {
        component: Label,
        design: {
            type: 'figma',
            name: 'Figma',
            url: 'https://www.figma.com/file/NIsN34NH7lPu04olBzddTw/Wildcard-Design-System?node-id=5601%3A65477',
        },
    },
}

export default config

export const Simple: Story = props => (
    <Label
        size={select('size', TYPOGRAPHY_SIZES, 'base')}
        weight={select('weight', TYPOGRAPHY_WEIGHTS, undefined)}
        alignment={select('alignment', TYPOGRAPHY_ALIGNMENTS, undefined)}
        mode={select('mode', TYPOGRAPHY_MODES, undefined)}
        isUnderline={boolean('underline', false)}
        isUppercase={boolean('uppercase', false)}
        {...props}
    >
        Hello World!
    </Label>
)
