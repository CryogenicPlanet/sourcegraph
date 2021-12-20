import { useCallback, useMemo } from 'react'
import { BehaviorSubject } from 'rxjs'

import { TelemetryProps } from '@sourcegraph/shared/src/telemetry/telemetryService'
import { useObservable } from '@sourcegraph/shared/src/util/useObservable'

import { OnboardingTourStepItem, ONBOARDING_STEP_ITEMS } from './data'

const STORAGE_KEY = 'ONBOARDING_TOUR'

interface OnboardingTourStore {
    completedStepIds?: string[]
    isClosed?: boolean
}

const data = new BehaviorSubject<OnboardingTourStore>(
    JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as OnboardingTourStore
)

// eslint-disable-next-line rxjs/no-ignored-subscription
data.subscribe(data => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)))

const clear = (): void => {
    localStorage.removeItem(STORAGE_KEY)
    data.next({})
}

const set = <K extends keyof OnboardingTourStore>(key: K, value: OnboardingTourStore[K]): void => {
    data.next({ ...data.value, [key]: value })
}

export function useOnboardingTourTracking(
    telemetryService: TelemetryProps['telemetryService']
): {
    onStepClick: (step: OnboardingTourStepItem) => void
} {
    const onStepClick = useCallback(
        (step: OnboardingTourStepItem) => () => {
            const args = { language: 'Go', page: location.href }
            telemetryService.log(step.id + 'Clicked', args, args)
        },
        [telemetryService]
    )

    return { onStepClick }
}

export function useOnboardingTourCompletion(): {
    onStepComplete: (step: OnboardingTourStepItem) => void
} {
    const store = useObservable(data)

    const onStepComplete = useCallback(
        (step: OnboardingTourStepItem) => {
            set('completedStepIds', [...(store?.completedStepIds ?? []), step.id])
        },
        [store?.completedStepIds]
    )

    return { onStepComplete }
}

export function useOnboardingTour(): {
    steps: OnboardingTourStepItem[]
    isTourCompleted: boolean
    isClosed: boolean
    onClose: () => void
    onRestart: () => void
} {
    const store = useObservable(data)

    const onClose = useCallback(() => {
        set('isClosed', true)
    }, [])

    const onRestart = useCallback(() => {
        clear()
    }, [])

    const { steps, isTourCompleted, isClosed } = useMemo(() => {
        const steps = ONBOARDING_STEP_ITEMS.map(step => ({
            ...step,
            isCompleted: !!store?.completedStepIds?.includes(step.id),
        }))
        return {
            steps,
            isTourCompleted: steps.filter(step => step.isCompleted).length === steps.length,
            isClosed: !!store?.isClosed,
        }
    }, [store])

    return { steps, isTourCompleted, isClosed, onClose, onRestart }
}
