import classNames from 'classnames'
import React, { useCallback, useMemo } from 'react'
import { Observable } from 'rxjs'
import { catchError, map, startWith, tap } from 'rxjs/operators'

import { asError, createAggregateError, isErrorLike } from '@sourcegraph/common'
import { LoadingSpinner } from '@sourcegraph/react-loading-spinner'
import { gql } from '@sourcegraph/shared/src/graphql/graphql'
import * as GQL from '@sourcegraph/shared/src/graphql/schema'
import { useObservable } from '@sourcegraph/shared/src/util/useObservable'
import { RadioButton } from '@sourcegraph/wildcard'

import { queryGraphQL } from '../../../backend/graphql'
import { ErrorAlert } from '../../../components/alerts'

import { ProductPlanPrice } from './ProductPlanPrice'

interface Props {
    /** The selected plan's billing ID. */
    value: string | null

    /** Called when the selected plan changes (with its billing ID). */
    onChange: (value: string | null) => void

    disabled?: boolean
    className?: string

    /** For mocking in tests only. */
    _queryProductPlans?: typeof queryProductPlans
}

const LOADING = 'loading' as const

/**
 * Displays a form group for selecting a product plan.
 */
export const ProductPlanFormControl: React.FunctionComponent<Props> = ({
    value,
    onChange,
    disabled,
    className = '',
    _queryProductPlans = queryProductPlans,
}) => {
    const noPlanSelected = value === null // don't recompute observable below on every value change

    /**
     * The list of all possible product plans, loading, or an error.
     */
    const plans =
        useObservable(
            useMemo(
                () =>
                    _queryProductPlans().pipe(
                        tap(plans => {
                            // If no plan is selected, select the 1st plan when the plans have loaded.
                            if (plans.length > 0 && noPlanSelected) {
                                onChange(plans[0].billingPlanID)
                            }
                        }),
                        catchError(error => [asError(error)]),
                        startWith(LOADING)
                    ),
                [_queryProductPlans, onChange, noPlanSelected]
            )
        ) || LOADING

    const onPlanChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
        event => {
            onChange(event.currentTarget.value)
        },
        [onChange]
    )

    const disableInputs = disabled || plans === LOADING || isErrorLike(plans)

    return (
        <div className={classNames('product-plan-form-control', className)}>
            {plans === LOADING ? (
                <LoadingSpinner className="icon-inline" />
            ) : isErrorLike(plans) ? (
                <ErrorAlert error={plans.message} />
            ) : (
                <>
                    <div className="list-group">
                        {plans.map((plan, index) => (
                            <div key={plan.billingPlanID} className="list-group-item p-0">
                                <div className="p-3 mb-0 d-flex">
                                    <RadioButton
                                        name="product-plan-form-control__plan"
                                        className="mr-2"
                                        id={`product-plan-form-control__plan${index}`}
                                        value={plan.billingPlanID}
                                        onChange={onPlanChange}
                                        required={true}
                                        disabled={disableInputs}
                                        checked={plan.billingPlanID === value}
                                        label={
                                            <div>
                                                <strong>{plan.name}</strong>
                                                <div className="text-muted">
                                                    <ProductPlanPrice plan={plan} />
                                                </div>
                                            </div>
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <a href="https://about.sourcegraph.com/pricing" className="small">
                        Compare plans
                    </a>
                </>
            )}
        </div>
    )
}

function queryProductPlans(): Observable<GQL.IProductPlan[]> {
    return queryGraphQL(
        gql`
            query ProductPlans {
                dotcom {
                    productPlans {
                        productPlanID
                        billingPlanID
                        name
                        pricePerUserPerYear
                        minQuantity
                        maxQuantity
                        tiersMode
                        planTiers {
                            unitAmount
                            upTo
                            flatAmount
                        }
                    }
                }
            }
        `
    ).pipe(
        map(({ data, errors }) => {
            if (!data || !data.dotcom || !data.dotcom.productPlans || (errors && errors.length > 0)) {
                throw createAggregateError(errors)
            }
            return data.dotcom.productPlans
        })
    )
}
