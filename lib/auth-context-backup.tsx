'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase-client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session with enhanced error handling
    const getInitialSession = async () => {
      try {
        console.log('🔐 Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Error getting session:', error)
          // Don't throw here, just log and continue
        } else {
          console.log('✅ Initial session retrieved:', session?.user?.email || 'No user')
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('❌ Exception getting initial session:', error)
        // Handle network errors gracefully
        if (error instanceof Error && error.message.includes('Network error')) {
          console.warn('⚠️ Network error during session initialization - will retry on next interaction')
        }
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('🔐 Auth state changed:', event, session?.user?.email || 'No user')
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)

          // Enhanced redirect logic
          if (event === 'SIGNED_IN' && session) {
            const redirectTo = new URLSearchParams(window.location.search).get('redirectTo')
            router.push(redirectTo || '/dashboard')
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 SIGNED_OUT event received, redirecting to login...')

            // Ensure state is cleared
            setSession(null)
            setUser(null)

            // Clear any cached data or local storage if needed
            if (typeof window !== 'undefined') {
              // Clear any application-specific cached data
              localStorage.removeItem('supabase.auth.token')
              sessionStorage.clear()
            }

            // Redirect to login
            router.push('/auth/login')
          }
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error)
          setLoading(false)
        }
      }
    )

    return () => {
      try {
        subscription.unsubscribe()
      } catch (error) {
        console.error('❌ Error unsubscribing from auth changes:', error)
      }
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext signIn called:', { email, password: '***' })
      setLoading(true)

      // Use the enhanced auth function
      const { data, error } = await auth.signIn(email, password)

      console.log('🔐 Enhanced signIn result:', { data: data?.user?.email, error })

      if (error) {
        console.error('❌ Enhanced signIn error:', error)

        // Handle email confirmation specifically
        if (error.message.includes('email_not_confirmed') || error.message.includes('Email not confirmed')) {
          return { error: 'Please check your email and click the confirmation link. If you don\'t see the email, check your spam folder or contact support.' }
        }

        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password. Please check your credentials and try again.' }
        }
        if (error.message.includes('Network error')) {
          return { error: 'Network error. Please check your internet connection and try again.' }
        }
        if (error.message.includes('timeout')) {
          return { error: 'Request timeout. Please check your internet connection and try again.' }
        }

        return { error: error.message }
      }

      console.log('✅ Enhanced signIn successful')
      return { error: null }
    } catch (err) {
      console.error('❌ SignIn exception:', err)

      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('Network error')) {
          return { error: 'Network error during sign in. Please check your internet connection and try again.' }
        }
        if (err.message.includes('timeout')) {
          return { error: 'Sign in request timeout. Please check your internet connection and try again.' }
        }
        if (err.message.includes('email_not_confirmed')) {
          return { error: 'Please check your email and click the confirmation link to complete your registration.' }
        }
      }

      return { error: 'An unexpected error occurred during sign in. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        return { error: error.message }
      }

      // If signup successful but email confirmation required
      if (data.user && !data.session) {
        return { error: 'Please check your email to confirm your account' }
      }

      return { error: null }
    } catch (err) {
      return { error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 Starting signOut process...')
      setLoading(true)

      // Call Supabase signOut with explicit scope
      const { error } = await supabase.auth.signOut({ scope: 'global' })

      if (error) {
        console.error('❌ Supabase signOut failed:', error)
        return { error: error.message }
      }

      console.log('✅ Supabase signOut successful')

      // Explicitly clear local state immediately
      setSession(null)
      setUser(null)

      // Verify signOut was successful
      try {
        const { data: sessionCheck } = await supabase.auth.getSession()
        if (sessionCheck.session) {
          console.warn('⚠️ Session still exists after signOut, forcing clear...')
          // Force clear any remaining session data
          setSession(null)
          setUser(null)
        } else {
          console.log('✅ Session successfully cleared')
        }
      } catch (sessionError) {
        console.log('✅ Session check failed as expected after signOut')
      }

      return { error: null }
    } catch (err) {
      console.error('❌ SignOut exception:', err)

      // Even if there's an error, try to clear local state
      setSession(null)
      setUser(null)

      return {
        error: err instanceof Error ? err.message : 'An unexpected error occurred during sign out'
      }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : 'http://localhost:3004/auth/reset-password'

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/login')
      }
    }, [user, loading, router])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}
