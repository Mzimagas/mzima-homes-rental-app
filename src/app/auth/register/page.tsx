'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import { validateEmailSimple } from '../../../lib/email-validation'
import { Turnstile } from '@marsidev/react-turnstile'

function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [propertyContext, setPropertyContext] = useState<{
    propertyId?: string
    action?: string
  }>({})

  const { signUp, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (user) {
      router.push('/client-portal')
    }

    // Get property context from URL params
    const propertyId = searchParams.get('property')
    const action = searchParams.get('action')
    if (propertyId) {
      setPropertyContext({ propertyId, action: action || 'express-interest' })
    }
  }, [user, router, searchParams])

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return false
    }

    // Always require email for Supabase authentication
    if (!formData.email || !formData.email.trim()) {
      setError('Email address is required')
      return false
    }

    const emailValidationError = validateEmailSimple(formData.email.trim())
    if (emailValidationError) {
      console.log('Email validation failed for:', formData.email, 'Error:', emailValidationError)
      setError(emailValidationError)
      return false
    }

    // Validate phone if provided
    if (formData.phone && formData.phone.trim()) {
      if (!/^\+?[0-9\s\-()]{10,}$/.test(formData.phone)) {
        setError('Please enter a valid phone number')
        return false
      }
    }

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !token) {
      setError('Please complete the security verification')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Prepare user metadata
      const userMetadata = {
        full_name: formData.fullName,
        phone: formData.phone || null,
        user_type: 'client',
        property_interest: propertyContext.propertyId || null,
        registration_context: propertyContext.action || null
      }

      // Use the provided email for Supabase auth
      const email = formData.email

      const { error } = await signUp(email, formData.password, formData.fullName)

      if (error) {
        const errorMessage = error.message || error.toString() || 'Registration failed'
        if (errorMessage.includes('already registered')) {
          setError('An account with this information already exists. Please sign in instead.')
        } else {
          setError(errorMessage)
        }
        return
      }

      // If registration is successful, confirm the user's email automatically
      await confirmUserEmail(email)

      // Create client record
      await createClientRecord()

      // Redirect based on context
      if (propertyContext.propertyId) {
        router.push(`/client-portal?welcome=true&property=${propertyContext.propertyId}`)
      } else {
        router.push('/client-portal?welcome=true')
      }

    } catch (err) {
      setError('An unexpected error occurred during registration')
      console.error('Registration error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const confirmUserEmail = async (email: string) => {
    console.log('🔧 Attempting to confirm email for:', email)
    try {
      const response = await fetch('/api/auth/confirm-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        console.warn('❌ Failed to confirm user email:', response.status, response.statusText)
        const errorText = await response.text()
        console.warn('❌ Error details:', errorText)
      } else {
        console.log('✅ User email confirmed successfully')
      }
    } catch (error) {
      console.warn('❌ Error confirming user email:', error)
    }
  }

  const createClientRecord = async () => {
    try {
      const response = await fetch('/api/clients/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          loginMethod: 'email', // Always email-based now
          propertyInterest: propertyContext.propertyId,
          registrationContext: propertyContext.action
        }),
      })

      if (!response.ok) {
        console.warn('Failed to create client record, but registration succeeded')
      }
    } catch (error) {
      console.warn('Error creating client record:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join Mzima Homes to track your property journey
          </p>
          {propertyContext.propertyId && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 text-center">
                🏠 Registering interest for a property
              </p>
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>


          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name *
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email - Always Required */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter your email address"
            />
          </div>

          {/* Phone Number - Optional */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number (Optional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter your phone number (optional)"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Create a password (min 8 characters)"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Confirm your password"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Turnstile */}
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={setToken}
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in here
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
