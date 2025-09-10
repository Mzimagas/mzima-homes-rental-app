import { useState, useEffect } from 'react'
import { useAuth } from '../components/auth/AuthProvider'
import { detectUserTypeFromMetadata, UserTypeInfo } from '../lib/user-type-detection'

export function useUserType() {
  const { user } = useAuth()
  const [userTypeInfo, setUserTypeInfo] = useState<UserTypeInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setUserTypeInfo(null)
      setIsLoading(false)
      return
    }

    const detectType = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // First try client-side detection from metadata
        const metadataResult = detectUserTypeFromMetadata(user)
        setUserTypeInfo(metadataResult)

        // Then try server-side detection for more accurate results
        try {
          const response = await fetch('/api/auth/user-type')
          const data = await response.json()

          if (data.success) {
            const serverResult: UserTypeInfo = {
              type: data.userType,
              redirectPath: data.redirectPath,
              metadata: data.metadata
            }
            setUserTypeInfo(serverResult)
          }
        } catch (serverError) {
          console.warn('Server-side user type detection failed, using metadata result:', serverError)
          // Keep the metadata result if server detection fails
        }

      } catch (err) {
        console.error('Error detecting user type:', err)
        setError('Failed to detect user type')
        
        // Fallback to client type
        setUserTypeInfo({
          type: 'client',
          redirectPath: '/client-portal',
          metadata: { isClient: true, clientId: user.id }
        })
      } finally {
        setIsLoading(false)
      }
    }

    detectType()
  }, [user])

  return {
    userType: userTypeInfo?.type || 'unknown',
    redirectPath: userTypeInfo?.redirectPath || '/client-portal',
    metadata: userTypeInfo?.metadata || {},
    isLoading,
    error,
    isClient: userTypeInfo?.type === 'client',
    isStaff: userTypeInfo?.type === 'staff',
    userTypeInfo
  }
}
