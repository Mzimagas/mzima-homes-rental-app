'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import supabase from '../../../lib/supabase-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logEmailSuccess, logEmailFailure, logEmailBounce } from '../../../lib/email-monitoring'
import { preflightEmailCheck, suggestEmailCorrection } from '../../../lib/email-verification'
import { validateEmailSimple } from '../../../lib/email-validation'

import dynamic from 'next/dynamic'
const PasswordStrength = dynamic(() => import('../../../components/PasswordStrength'), {
  ssr: false,
})

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [emailWarnings, setEmailWarnings] = useState<string[]>([])
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const { signUp, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Real-time email validation and suggestions
    if (name === 'email' && value) {
      setEmailWarnings([])
      setEmailSuggestion(null)

      // Check for typos and suggest corrections
      const suggestion = suggestEmailCorrection(value)
      if (suggestion) {
        setEmailSuggestion(suggestion)
      }

      // Perform preflight check after user stops typing
      setTimeout(async () => {
        if (value.length > 5) {
          // Only check if email looks substantial
          try {
            const preflightResult = await preflightEmailCheck(value)
            if (preflightResult.suggestions) {
              setEmailWarnings(preflightResult.suggestions)
            }
          } catch (err) {
            // Ignore preflight errors for now
          }
        }
      }, 1000)
    }
  }

  const validateEmail = (email: string): string | null => {
    return validateEmailSimple(email)
  }

  const validateForm = () => {
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      return 'Please fill in all fields'
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match'
    }

    // Stronger password policy: min 10, 3 of 4 classes
    const strongPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,}$/
    const atLeastThreeClasses = (pw: string) => {
      let classes = 0
      if (/[a-z]/.test(pw)) classes++
      if (/[A-Z]/.test(pw)) classes++
      if (/[0-9]/.test(pw)) classes++
      if (/[^A-Za-z0-9]/.test(pw)) classes++
      return pw.length >= 10 && classes >= 3
    }
    if (!atLeastThreeClasses(formData.password)) {
      return 'Password must be at least 10 characters and include a mix of letters, numbers, and symbols.'
    }

    const emailError = validateEmail(formData.email)
    if (emailError) {
      return emailError
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    try {
      // Step 1: Pre-flight email verification
      const preflightResult = await preflightEmailCheck(formData.email)

      if (!preflightResult.canProceed) {
        setError(preflightResult.message)
        if (preflightResult.suggestions) {
          setEmailWarnings(preflightResult.suggestions)
        }
        setIsLoading(false)
        return
      }

      // Step 2: Create user with Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      })

      if (signUpError) {

        // Log the email failure for monitoring
        if (
          signUpError.message.includes('bounce') ||
          signUpError.message.includes('invalid email')
        ) {
          logEmailBounce(formData.email, 'signup', signUpError.message)
        } else {
          logEmailFailure(formData.email, 'signup', signUpError.message)
        }

        // Handle specific email-related errors
        if (signUpError.message.includes('email') && signUpError.message.includes('invalid')) {
          setError(
            'Please enter a valid, deliverable email address. Avoid using test or example email domains.'
          )
        } else if (
          signUpError.message.includes('email') &&
          signUpError.message.includes('already')
        ) {
          setError(
            'An account with this email already exists. Please sign in instead or use a different email.'
          )
        } else if (signUpError.message.includes('rate limit')) {
          setError('Too many signup attempts. Please wait a few minutes before trying again.')
        } else {
          setError(signUpError.message)
        }

        setIsLoading(false)
        return
      }



      // Log successful email sending for monitoring
      logEmailSuccess(formData.email, 'signup')

      // Step 2: Auto-confirm user in development
      if (!signUpData.user?.email_confirmed_at) {


        try {
          // Use API endpoint to confirm user (with CSRF header)
          const csrf = document.cookie
            .split(';')
            .map((p) => p.trim())
            .find((p) => p.startsWith('csrf-token='))
            ?.split('=')[1]
          const response = await fetch('/api/auth/confirm-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrf || '',
            },
            body: JSON.stringify({
              userId: signUpData.user?.id,
              email: signUpData.user?.email,
            }),
          })

          if (response.ok) {

            // Step 3: Sign in the user immediately
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(
              {
                email: formData.email,
                password: formData.password,
              }
            )

            if (signInError) {
              setError('Account created but auto sign-in failed. Please try logging in.')
            } else {
              // The auth context will handle the redirect
              return
            }
          } else {
            setSuccess(true)
          }
        } catch (err) {
          setSuccess(true) // Fall back to email confirmation
        }
      } else {
        // User was already confirmed, try to sign them in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (signInError) {
          setSuccess(true) // Fall back to email confirmation message
        }
        // If successful, auth context will handle redirect
      }
    } catch (err) {
      setError('An unexpected error occurred during registration.')
    }

    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Account Created Successfully!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your account has been created with email <strong>{formData.email}</strong>
            </p>
            <p className="mt-4 text-center text-sm text-gray-600">
              If you don't see a confirmation email, you can try logging in directly. Your account
              may already be activated.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href="/auth/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Logging In
              </Link>
              <p className="text-center text-xs text-gray-500">
                If you have issues, please contact support
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join Voi Rental Management System
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />

              {/* Email suggestion */}
              {emailSuggestion && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Did you mean{' '}
                    <button
                      type="button"
                      className="font-medium text-yellow-900 underline hover:text-yellow-700"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, email: emailSuggestion }))
                        setEmailSuggestion(null)
                      }}
                    >
                      {emailSuggestion}
                    </button>
                    ?
                  </p>
                </div>
              )}

              {/* Email warnings */}
              {emailWarnings.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  {emailWarnings.map((warning, index) => (
                    <p key={index} className="text-sm text-blue-800">
                      💡 {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                  placeholder="Create a strong password (min 10 chars, 3 types)"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  aria-label="Show password"
                  className="absolute inset-y-0 right-0 px-3 text-gray-500"
                >
                  👁️
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Minimum 10 characters and at least 3 of: lowercase, uppercase, number, symbol.
              </p>
              {/* Strength meter */}
              <PasswordStrength value={formData.password} />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-blue-500 group-hover:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              )}
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
