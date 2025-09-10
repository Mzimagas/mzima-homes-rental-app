'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { detectUserTypeFromMetadata } from '../../lib/user-type-detection-client'

// Sign Out Button Component
function SignOutButton() {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Sign Out
    </button>
  )
}

interface ClientPortalLayoutProps {
  children: React.ReactNode
}

export default function ClientPortalLayout({ children }: ClientPortalLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [userTypeChecked, setUserTypeChecked] = useState(false)

  // Check user type and redirect if necessary
  useEffect(() => {
    if (!loading && user) {
      // Detect user type from metadata (client-side detection)
      const userTypeInfo = detectUserTypeFromMetadata(user)

      // If user is staff, redirect to admin dashboard
      if (userTypeInfo.type === 'staff') {
        console.log(`🔄 Staff user ${user.email} redirected from client portal to dashboard`)
        router.replace('/dashboard')
        return
      }

      // If user is client, allow access
      if (userTypeInfo.type === 'client') {
        setUserTypeChecked(true)
        return
      }

      // For unknown user types, perform server-side detection
      const checkUserTypeAsync = async () => {
        try {
          const response = await fetch('/api/auth/user-type')
          const data = await response.json()

          if (data.success) {
            if (data.userType === 'staff') {
              console.log(
                `🔄 Staff user ${user.email} redirected from client portal to dashboard (server detection)`
              )
              router.replace('/dashboard')
            } else {
              setUserTypeChecked(true)
            }
          } else {
            // Default to allowing access if detection fails
            setUserTypeChecked(true)
          }
        } catch (error) {
          console.error('Error detecting user type:', error)
          // Default to allowing access if detection fails
          setUserTypeChecked(true)
        }
      }

      checkUserTypeAsync()
    } else if (!loading && !user) {
      // Redirect to login if not authenticated
      router.replace(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, router, pathname])

  // Show loading while checking authentication and user type
  if (loading || !userTypeChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client Portal Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <img src="/kodirent-logo.svg" alt="KodiRent" className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Client Portal</h1>
                <p className="text-sm text-gray-500">Manage your property interests</p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.user_metadata?.full_name?.full_name || user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-xs text-gray-500">Client</p>
              </div>

              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
