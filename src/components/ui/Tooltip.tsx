'use client'

import { useState, ReactNode } from 'react'
import { Transition } from '@headlessui/react'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({
  content,
  children,
  className = '',
  position = 'top',
}: TooltipProps) {
  const [open, setOpen] = useState(false)

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position]

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <Transition
        show={open}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <div
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-xs rounded bg-gray-900 text-white shadow ${posClasses}`}
        >
          {content}
        </div>
      </Transition>
    </span>
  )
}
