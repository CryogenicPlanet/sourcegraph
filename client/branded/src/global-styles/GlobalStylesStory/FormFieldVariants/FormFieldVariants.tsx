import classNames from 'classnames'
import React, { ReactNode } from 'react'

import { RadioButton } from '@sourcegraph/wildcard'
import 'storybook-addon-designs'

import styles from './FormFieldVariants.module.scss'

type FieldVariants = 'standard' | 'invalid' | 'valid' | 'disabled'

interface WithVariantsProps {
    field: React.ComponentType<{
        className?: string
        disabled?: boolean
        message?: ReactNode
        variant: FieldVariants
    }>
}

const FieldMessageText = 'Helper text'

const FieldMessage: React.FunctionComponent<{ className?: string }> = ({ className }) => (
    <small className={className}>{FieldMessageText}</small>
)

// Use this temporarily for form components which ones we haven't implemented in wilcard package yet
const WithVariantsAndMessageElements: React.FunctionComponent<WithVariantsProps> = ({ field: Field }) => (
    <>
        <Field variant="standard" message={<FieldMessage className="field-message" />} />
        <Field variant="invalid" className="is-invalid" message={<FieldMessage className="invalid-feedback" />} />
        <Field variant="valid" className="is-valid" message={<FieldMessage className="valid-feedback" />} />
        <Field variant="disabled" disabled={true} message={<FieldMessage className="field-message" />} />
    </>
)

const WithVariants: React.FunctionComponent<WithVariantsProps> = ({ field: Field }) => (
    <>
        <Field variant="standard" message={FieldMessageText} />
        <Field variant="invalid" message={FieldMessageText} />
        <Field variant="valid" message={FieldMessageText} />
        <Field variant="disabled" message={FieldMessageText} />
    </>
)

export const FormFieldVariants: React.FunctionComponent = () => (
    <div className={styles.grid}>
        <WithVariantsAndMessageElements
            field={({ className, message, ...props }) => (
                <fieldset className="form-group">
                    <input
                        type="text"
                        placeholder="Form field"
                        className={classNames('form-control', className)}
                        {...props}
                    />
                    {message}
                </fieldset>
            )}
        />
        <WithVariantsAndMessageElements
            field={({ className, message, ...props }) => (
                <fieldset className="form-group">
                    <select className={classNames('custom-select', className)} {...props}>
                        <option>Option A</option>
                        <option>Option B</option>
                        <option>Option C</option>
                    </select>
                    {message}
                </fieldset>
            )}
        />
        <WithVariantsAndMessageElements
            field={({ className, message, ...props }) => (
                <fieldset className="form-group">
                    <textarea
                        placeholder="This is sample content in a text area that spans four lines to see how it fits."
                        className={classNames('form-control', className)}
                        rows={4}
                        {...props}
                    />
                    {message}
                </fieldset>
            )}
        />
        <WithVariantsAndMessageElements
            field={({ className, message, variant, ...props }) => (
                <fieldset className="form-check">
                    <input
                        id={`inputFieldsetCheck - ${variant}`}
                        type="checkbox"
                        className={classNames('form-check-input', className)}
                        {...props}
                    />
                    <label className="form-check-label" htmlFor={`inputFieldsetCheck - ${variant}`}>
                        Checkbox
                    </label>
                    {message}
                </fieldset>
            )}
        />
        <WithVariants
            field={({ className, message, variant, ...props }) => (
                <RadioButton
                    id={`inputFieldsetRadio - ${variant}`}
                    className={className}
                    name={`inputFieldsetRadio - ${variant}`}
                    label="Radio button"
                    isValid={variant === 'invalid' ? false : variant === 'valid' ? true : undefined}
                    message={message}
                    {...props}
                />
            )}
        />
    </div>
)
