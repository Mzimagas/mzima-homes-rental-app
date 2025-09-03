// Auth callback page to handle email confirmations
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '../../../lib/supabase-client'

const supabase = getSupabaseClient()

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/login?error=callback_error')
          return
        }

        if (data.session) {
          console.log('User confirmed and logged in:', data.session.user.email)
          router.push('/dashboard')
        } else {
          router.push('/auth/login')
        }
      } catch (err) {
        console.error('Callback handling error:', err)
        router.push('/auth/login?error=callback_error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Confirming your email...</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we confirm your email address.
          </p>
        </div>
      </div>
    </div>
  )
}
