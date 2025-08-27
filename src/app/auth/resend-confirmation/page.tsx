'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'

export default function ResendConfirmationPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const csrf =
        document.cookie
          .split(';')
          .map((p) => p.trim())
          .find((p) => p.startsWith('csrf-token='))
          ?.split('=')[1] || ''
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && token) {
        const vRes = await fetch('/api/security/turnstile-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!vRes.ok) {
          setError('Please complete the verification challenge and try again.')
          setLoading(false)
          return
        }
      }

      const r = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ email }),
      })
      if (!r.ok) {
        setError('Please try again later.')
        setLoading(false)
        return
      }
      setOk(true)
    } catch {
      setError('Unexpected error, please try again.')
    }

    setLoading(false)
  }

  if (ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <h2 className="text-2xl font-bold">If an account exists, an email has been sent</h2>
          <p className="text-sm text-gray-600">Please check your inbox for a confirmation email.</p>
          <Link href="/auth/login" className="text-blue-600">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-2xl font-bold text-center">Resend confirmation email</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
            onSuccess={setToken}
          />
          {error && (
            <div className="text-red-600 text-sm" role="alert">
              {error}
            </div>
          )}
          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
        <div className="text-center text-sm">
          <Link className="text-blue-600" href="/auth/login">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
