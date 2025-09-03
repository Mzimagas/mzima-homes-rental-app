import React from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const base =
  'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}
const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
  tertiary: 'bg-transparent text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  outline:
    'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      aria-busy={loading || undefined}
      aria-disabled={props.disabled || loading || undefined}
      {...props}
    >
      {leftIcon ? (
        <span className="mr-2" aria-hidden>
          {leftIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {rightIcon ? (
        <span className="ml-2" aria-hidden>
          {rightIcon}
        </span>
      ) : null}
    </button>
  )
}

export default Button
