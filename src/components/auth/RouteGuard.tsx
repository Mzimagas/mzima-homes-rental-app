'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useRouter } from 'next/navigation'
import { detectUserTypeFromMetadata } from '../../lib/user-type-detection-client'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRole?: 'staff' | 'client' | 'any'
  fallbackPath?: string
  loadingComponent?: React.ReactNode
}

export default function RouteGuard({
  children,
  requiredRole = 'any',
  fallbackPath,
  loadingComponent,
}: RouteGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [accessGranted, setAccessGranted] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return

      // Not authenticated
      if (!user) {
        router.replace('/auth/login')
        return
      }

      // If any role is allowed, grant access
      if (requiredRole === 'any') {
        setAccessGranted(true)
        setChecking(false)
        return
      }

      try {
        // Detect user type
        const userTypeInfo = detectUserTypeFromMetadata(user)

        // Check if user has required role
        const hasRequiredRole = userTypeInfo.type === requiredRole

        if (hasRequiredRole) {
          setAccessGranted(true)
        } else {
          // Redirect to appropriate fallback
          const redirectPath =
            fallbackPath || (requiredRole === 'staff' ? '/client-portal' : '/dashboard')

          console.log(
            `🚫 Access denied: User type ${userTypeInfo.type} cannot access ${requiredRole} route`
          )
          router.replace(redirectPath)
          return
        }
      } catch (error) {
        console.error('Error checking route access:', error)
        // On error, redirect to safe fallback
        router.replace(fallbackPath || '/auth/login')
        return
      }

      setChecking(false)
    }

    checkAccess()
  }, [user, loading, requiredRole, fallbackPath, router])

  // Show loading while checking
  if (loading || checking) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Don't render if access not granted (will redirect)
  if (!accessGranted) {
    return null
  }

  return <>{children}</>
}

// Convenience components for specific roles
export function AdminRouteGuard({ children, ...props }: Omit<RouteGuardProps, 'requiredRole'>) {
  return (
    <RouteGuard requiredRole="staff" fallbackPath="/client-portal" {...props}>
      {children}
    </RouteGuard>
  )
}

export function ClientRouteGuard({ children, ...props }: Omit<RouteGuardProps, 'requiredRole'>) {
  return (
    <RouteGuard requiredRole="client" fallbackPath="/dashboard" {...props}>
      {children}
    </RouteGuard>
  )
}
