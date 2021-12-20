import { Accordion, AccordionButton, AccordionItem, AccordionPanel } from '@reach/accordion'
import classNames from 'classnames'
import { groupBy } from 'lodash'
import ArrowDropDownIcon from 'mdi-react/ArrowDropDownIcon'
import CheckCircleIcon from 'mdi-react/CheckCircleIcon'
import CloseIcon from 'mdi-react/CloseIcon'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CircularProgressbar } from 'react-circular-progressbar'
import ReactDOM from 'react-dom'
import { Link, useLocation } from 'react-router-dom'

import { TelemetryProps } from '@sourcegraph/shared/src/telemetry/telemetryService'
import { Button } from '@sourcegraph/wildcard'

import { ErrorBoundary } from '../components/ErrorBoundary'

import { OnboardingTourStepItem } from './lib/data'
import { useOnboardingTour, useOnboardingTourCompletion, useOnboardingTourTracking } from './lib/useOnboardingTour'
import styles from './OnboardingTour.module.scss'

interface CardProps {
    onClose: () => void
    title: string
    className?: string
}

const Card: React.FunctionComponent<CardProps> = ({ title, children, onClose, className }) => (
    <article className={classNames(styles.card, className)}>
        <div className={styles.cardInner}>
            <header className={styles.cardHeader}>
                <h3 className={classNames(styles.cardTitle)}>{title}</h3>
                <CloseIcon onClick={onClose} className="icon-inline" size="1rem" />
            </header>
            {children}
        </div>
    </article>
)
const buildUriMarkers = (href: string, stepId: string): string => {
    try {
        const url = new URL(href, `${location.protocol}//${location.host}`)
        url.searchParams.set('tour', 'true')
        url.searchParams.set('stepId', stepId)
        return url.toString().slice(url.origin.length)
    } catch {
        return '#'
    }
}

const parseUriMarkers = (searchParameters: string): { isTour: boolean; stepId: string | null } => {
    const parameters = new URLSearchParams(searchParameters)
    const isTour = parameters.has('tour')
    const stepId = parameters.get('stepId')
    return { isTour, stepId }
}

interface OnboardingTourStepsListProps extends TelemetryProps {
    className?: string
    steps: OnboardingTourStepItem[]
}

const OnboardingTourStepsList: React.FunctionComponent<OnboardingTourStepsListProps> = ({
    steps,
    className,
    telemetryService,
}) => {
    const location = useLocation()
    const [expandedIndex, setExpandedIndex] = useState<number[]>([])
    const { onStepClick } = useOnboardingTourTracking(telemetryService)
    const { onStepComplete } = useOnboardingTourCompletion()
    const groups = useMemo(
        () =>
            Object.entries(groupBy(steps, 'group')).map(([title, steps]) => ({
                title,
                steps,
                completed: Math.round((100 * steps.filter(step => step.isCompleted).length) / steps.length),
            })),
        [steps]
    )

    const toggleExpandedIndexes = useCallback((currentIndex: number) => {
        setExpandedIndex(indexes => {
            if (indexes.includes(currentIndex)) {
                return indexes.filter(index => index !== currentIndex)
            }

            return [...indexes, currentIndex]
        })
    }, [])

    useEffect(() => {
        const { stepId } = parseUriMarkers(location.search)
        const currentIndex = groups.findIndex(group => group.steps.find(step => step.id === stepId))
        if (currentIndex >= 0) {
            setExpandedIndex(indexes => [...indexes, currentIndex])
        }
    }, [location, groups])

    return (
        <Accordion className={className} index={expandedIndex} onChange={toggleExpandedIndexes}>
            {groups.map(({ title, steps, completed }) => (
                <AccordionItem key={title}>
                    <AccordionButton as="div">
                        <span className={styles.arrowIconContainer}>
                            <ArrowDropDownIcon size="1rem" />
                        </span>
                        <span className={styles.label}>{title}</span>
                        {completed < 100 ? (
                            <CircularProgressbar className={styles.progressBar} strokeWidth={12} value={completed} />
                        ) : (
                            <CheckCircleIcon className={classNames('icon-inline', 'text-success')} size="1rem" />
                        )}
                    </AccordionButton>
                    <AccordionPanel>
                        {steps.map(step => {
                            const linkProps = {
                                onClick: () => {
                                    onStepClick(step)
                                    if (!step.completeAfterEvents) {
                                        onStepComplete(step)
                                    }
                                },
                                className: classNames(styles.label, styles.link),
                            }
                            return (
                                <div key={step.id} className={styles.step}>
                                    {step.to.startsWith('http') ? (
                                        <a href={step.to} {...linkProps} target="_blank" rel="noopener noreferrer">
                                            {step.title}
                                        </a>
                                    ) : (
                                        <Link to={buildUriMarkers(step.to, step.id)} {...linkProps}>
                                            {step.title}
                                        </Link>
                                    )}
                                    <CheckCircleIcon
                                        className={classNames(
                                            'icon-inline',
                                            step.isCompleted ? 'text-success' : 'text-muted'
                                        )}
                                        size="1rem"
                                    />
                                </div>
                            )
                        })}
                    </AccordionPanel>
                </AccordionItem>
            ))}
        </Accordion>
    )
}

interface OnboardingTourContentProps extends TelemetryProps {
    isFixedHeight?: boolean
    className?: string
}

export const OnboardingTourContent: React.FunctionComponent<OnboardingTourContentProps> = ({
    className,
    isFixedHeight,
    telemetryService,
}) => {
    const { isClosed, isTourCompleted, steps, onClose, onRestart } = useOnboardingTour()
    const completedCount = useMemo(() => steps.filter(step => step.isCompleted).length, [steps])

    if (isClosed) {
        return null
    }

    if (isTourCompleted) {
        return (
            <Card title="Tour complete!" className={className} onClose={onClose}>
                <p className={styles.text}>
                    Sign up to connect your personal code, use code monitors and other features.
                </p>
                <Link className="btn btn-primary" type="button" to="/sign-up">
                    Sign up
                </Link>
                <Button variant="link" onClick={onRestart}>
                    Restart
                </Button>
            </Card>
        )
    }

    return (
        <Card title="Getting started" className={className} onClose={onClose}>
            <hr className={styles.divider} />
            <OnboardingTourStepsList
                steps={steps}
                className={classNames({ [styles.isFixedHeight]: isFixedHeight })}
                telemetryService={telemetryService}
            />
            <footer>
                <CheckCircleIcon className="icon-inline text-success" size="1rem" />
                <span className={styles.footerText}>
                    {completedCount} of {steps.length}
                </span>
            </footer>
            <OnboardingTourAgent steps={steps} telemetryService={telemetryService} />
        </Card>
    )
}

export const OnboardingTour: React.FunctionComponent<OnboardingTourContentProps> = props => (
    <ErrorBoundary
        location={null}
        render={error => (
            <div>
                Onboarding Tour. Something went wrong :(.
                <pre>{JSON.stringify(error)}</pre>
            </div>
        )}
    >
        <OnboardingTourContent {...props} />
    </ErrorBoundary>
)

interface OnboardingTourAgentProps extends Partial<TelemetryProps> {
    steps: OnboardingTourStepItem[]
}

/**
 * Agent component that tracks step completions and/or shows info popups
 */
const OnboardingTourAgent: React.FunctionComponent<OnboardingTourAgentProps> = React.memo(
    ({ steps, telemetryService }) => {
        const [info, setInfo] = useState<OnboardingTourStepItem['info'] | undefined>()
        const { onStepComplete } = useOnboardingTourCompletion()

        const location = useLocation()

        useEffect(() => {
            const filteredSteps = steps.filter(step => step.completeAfterEvents)
            telemetryService?.addEventLogListener?.(eventName => {
                const stepToComplete = filteredSteps.find(step => step.completeAfterEvents?.includes(eventName))
                if (stepToComplete) {
                    onStepComplete(stepToComplete)
                }
            })
        }, [telemetryService, steps, onStepComplete])

        useEffect(() => {
            const { isTour, stepId } = parseUriMarkers(location.search)

            if (!isTour || !stepId) {
                return
            }

            const info = steps.find(step => stepId === step.id)?.info

            if (info) {
                setInfo(info)
            }
        }, [steps, location])

        if (!info) {
            return null
        }

        const domNode = document.querySelector(info.selector)
        if (!domNode) {
            return null
        }

        return ReactDOM.createPortal(
            <div className={styles.infoPanel} dangerouslySetInnerHTML={{ __html: info.content }} />,
            domNode
        )
    }
)
