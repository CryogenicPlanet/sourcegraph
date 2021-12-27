import { DecoratorFn, Meta, Story } from '@storybook/react'
import classNames from 'classnames'
import CloseIcon from 'mdi-react/CloseIcon'
import React from 'react'

import { BrandedStory } from '@sourcegraph/branded/src/components/BrandedStory'
import { panels } from '@sourcegraph/branded/src/components/panel/Panel.fixtures'
import { EmptyPanelView } from '@sourcegraph/branded/src/components/panel/views/EmptyPanelView'
import webStyles from '@sourcegraph/web/src/SourcegraphWebApp.scss'

import { Grid } from '..'
import { Tabs, Tab, TabList, TabPanel, TabPanels } from '../Tabs'

import { Panel } from './Panel'

const decorator: DecoratorFn = story => <BrandedStory styles={webStyles}>{() => <div>{story()}</div>}</BrandedStory>

const config: Meta = {
    title: 'wildcard/Panel',

    decorators: [decorator],

    parameters: {
        component: Panel,
        design: {
            type: 'figma',
            name: 'Figma',
            url: 'https://www.figma.com/file/NIsN34NH7lPu04olBzddTw/Wildcard-Design-System?node-id=3008%3A502',
        },
    },
}

export default config

export const Simple: Story = props => <Panel defaultHeight={150} storageKey="simple" {...props} />

export const WithChildren: Story = props => {
    const [tabIndex, setTabIndex] = React.useState(0)
    const activeTab = panels[tabIndex]

    const closePanel = () => setTabIndex(-1)

    return (
        <Panel {...props}>
            <Tabs index={tabIndex} size="small">
                <div className={classNames('tablist-wrapper d-flex justify-content-between sticky-top')}>
                    <TabList>
                        {panels.map((item, index) => (
                            <Tab key={item.id}>
                                <span
                                    className="tablist-wrapper--tab-label"
                                    onClick={() => setTabIndex(index)}
                                    role="none"
                                >
                                    {item.title}
                                </span>
                            </Tab>
                        ))}
                    </TabList>
                    <div className="align-items-center d-flex mr-2">
                        <button
                            type="button"
                            onClick={closePanel}
                            className={classNames('btn btn-icon ml-2')}
                            title="Close panel"
                            data-tooltip="Close panel"
                            data-placement="left"
                        >
                            <CloseIcon className="icon-inline" />
                        </button>
                    </div>
                </div>
                <TabPanels>
                    {activeTab ? (
                        panels.map(({ id, content }) => (
                            <TabPanel key={id}>
                                <Grid columnCount={3} spacing={2}>
                                    {new Array(6).fill(0).map((_value, index) => (
                                        <div key={index}>
                                            Content {index + 1} of {content}
                                        </div>
                                    ))}
                                </Grid>
                            </TabPanel>
                        ))
                    ) : (
                        <EmptyPanelView />
                    )}
                </TabPanels>
            </Tabs>
        </Panel>
    )
}
