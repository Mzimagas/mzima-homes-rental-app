import * as React from 'react'

interface FormFieldProps {
  name: string
  label: string
  hint?: string
  error?: string
  children: (props: { id: string }) => React.ReactNode
}

export function FormField({ name, label, hint, error, children }: FormFieldProps) {
  const id = React.useId()
  const describedBy: string[] = []
  if (hint) describedBy.push(`${id}-hint`)
  if (error) describedBy.push(`${id}-error`)

  const isRequired = false // wrapper cannot detect required automatically; callers can include '*' in label if needed

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {isRequired && <span className="text-red-600" aria-hidden>*</span>}
      </label>
      {children({ id })}
      {hint && <p id={`${id}-hint`} className="text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default FormField

