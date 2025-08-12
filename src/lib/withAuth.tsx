'use client'

import { useAuth } from './auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function Protected(props: T) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/auth/login')
      }
    }, [loading, user, router])

    if (!user) {
      return null
    }
    return <Component {...props} />
  }
}

