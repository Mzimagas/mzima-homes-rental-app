'use client'
import React from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

type Toast = {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  timeout?: number
}

const ToastContext = React.createContext<{
  show: (
    message: string,
    opts?: { title?: string; variant?: ToastVariant; timeout?: number }
  ) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const show = React.useCallback(
    (message: string, opts?: { title?: string; variant?: ToastVariant; timeout?: number }) => {
      const id = Math.random().toString(36).slice(2)
      const toast: Toast = {
        id,
        message,
        variant: opts?.variant || 'info',
        title: opts?.title,
        timeout: opts?.timeout ?? 4000,
      }
      setToasts((t) => [...t, toast])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.timeout)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`min-w-[260px] rounded-md border p-3 shadow bg-white ${
              t.variant === 'success'
                ? 'border-green-200'
                : t.variant === 'error'
                  ? 'border-red-200'
                  : t.variant === 'warning'
                    ? 'border-yellow-200'
                    : 'border-gray-200'
            }`}
          >
            {t.title && <div className="text-sm font-semibold mb-0.5">{t.title}</div>}
            <div className="text-sm text-gray-800">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
