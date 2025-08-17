import * as React from 'react'

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, className = '', ...props }, ref
) {
  const inputId = React.useId()
  const fieldId = id || inputId
  const describedBy: string[] = []
  if (hint) describedBy.push(`${fieldId}-hint`)
  if (error) describedBy.push(`${fieldId}-error`)

  const isRequired = !!(props.required || props['aria-required'])
  const showAsterisk = !!label && isRequired && !String(label).includes('*')

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
          {label} {showAsterisk && <span className="text-red-600" aria-hidden>*</span>}
        </label>
      )}
      <input
        id={fieldId}
        ref={ref}
        className={`block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy.length ? describedBy.join(' ') : undefined}
        {...props}
      />
      {hint && <p id={`${fieldId}-hint`} className="text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${fieldId}-error`} className="text-xs text-red-600">{error}</p>}
    </div>
  )
})

export default TextField

