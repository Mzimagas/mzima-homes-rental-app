'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '../../../lib/auth-context'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import supabase from '../../../lib/supabase-client'
import { validateEmailSimple } from '../../../lib/email-validation'
import MfaChallenge from './mfa-challenge'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showMfa, setShowMfa] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')

  const [token, setToken] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  useEffect(() => {
    if (user) {
      router.push(redirectTo)
    }
  }, [user, router, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    const emailError = validateEmailSimple(email)
    if (emailError) {
      setError(emailError)
      setIsLoading(false)
      return
    }

    try {
      // Soft lockout via localStorage
      const lockKey = `lockout:${email.slice(0,3)}`
      const until = localStorage.getItem(lockKey)
      if (until && Date.now() < Number(until)) {
        setError('Too many attempts. Please wait and try again.')
        setIsLoading(false)
        return
      }

      // CSRF + rate-limit + CAPTCHA prechecks
      const csrf = document.cookie.split(';').map(p => p.trim()).find(p => p.startsWith('csrf-token='))?.split('=')[1] || ''
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && token) {
        const vRes = await fetch('/api/security/turnstile-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!vRes.ok) {
          setError('Please complete the verification challenge and try again.')
          setIsLoading(false)
          return
        }
      }
      const rlRes = await fetch('/api/security/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf,
        },
        body: JSON.stringify({ action: 'login', email }),
      })
      if (!rlRes.ok) {
        setError('Too many attempts. Please wait a minute and try again.')
        setIsLoading(false)
        return
      }

      const { error } = await signIn(email, password)

      if (error) {
        // Exponential backoff soft lockout
        const attemptKey = `attempts:${email.slice(0,3)}`
        const attempts = Number(localStorage.getItem(attemptKey) || '0') + 1
        localStorage.setItem(attemptKey, String(attempts))
        const backoffMs = Math.min(5 * 60_000, 5000 * attempts)
        localStorage.setItem(lockKey, String(Date.now() + backoffMs))
        // Notify server lockout tracker
        fetch('/api/security/lockout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', identifier: email, success: false }) })
        fetch('/api/security/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'login_failed', identifier: email }) })
        setError('Invalid email or password. Please try again.')
      } else {
        localStorage.removeItem(lockKey)
        localStorage.removeItem(`attempts:${email.slice(0,3)}`)
      if (error === 'MFA_REQUIRED') {
        setPendingEmail(email)
        setShowMfa(true)
        setIsLoading(false)
        return
      }

        fetch('/api/security/lockout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', identifier: email, success: true }) })
      if (error === 'MFA_REQUIRED') {
        // Redirect to dedicated MFA route
        router.push('/auth/mfa')
        setIsLoading(false)
        return
      }

      }
    } catch {
      setError('An unexpected error occurred during login')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            KodiRent
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />

              {showMfa && (
                <div className="border rounded p-3 mt-3">
                  <h3 className="font-medium mb-2">Multi-factor authentication required</h3>
                  <MfaChallenge
                    onVerify={async (code)=>{
                      setIsLoading(true)
                      try {
                        const { data: factors } = await supabase.auth.mfa.listFactors()
                        const factor = factors.totp?.find((f: { status?: string }) => f.status === 'verified') || factors.totp?.[0]
                        if (factor && 'id' in factor && factor.id) {
                          const { data, error } = await supabase.auth.mfa.verify({ factorId: factor.id, code })
                          if (!error) {
                            setShowMfa(false)
                            router.push('/dashboard')
                          }
                        }
                      } finally {
                        setIsLoading(false)
                      }
                    }}
                    onCancel={()=>setShowMfa(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
              <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string} onSuccess={setToken} />
            ) : null}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
