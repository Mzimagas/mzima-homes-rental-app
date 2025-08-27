'use client'

import React from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'

interface MobileMenuButtonProps {
  onClick: () => void
  isOpen: boolean
  className?: string
}

export default function MobileMenuButton({
  onClick,
  isOpen,
  className = '',
}: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden min-h-[44px] min-w-[44px] ${className}`}
      onClick={onClick}
      aria-controls="mobile-menu"
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Close main menu' : 'Open main menu'}
    >
      <span className="sr-only">{isOpen ? 'Close main menu' : 'Open main menu'}</span>
      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
    </button>
  )
}
