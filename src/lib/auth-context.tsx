'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase-client'
import { validateEmailSimple } from './email-validation'

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
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔐 AuthProvider: Getting initial session')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ AuthProvider: Error getting session:', error)
        } else {
          console.log('🔐 AuthProvider: Initial session:', session?.user?.email || 'No session')
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (err) {
        console.error('❌ AuthProvider: Exception getting session:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthProvider: Auth state change:', event, session?.user?.email || 'No session')
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle different auth events
        if (event === 'SIGNED_IN') {
          console.log('✅ AuthProvider: User signed in, redirecting to dashboard')
          router.push('/dashboard')
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 AuthProvider: User signed out, redirecting to login')
          router.push('/auth/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext signIn called:', { email, password: '***' })
      setLoading(true)

      // Use Supabase auth signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

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
      console.log('🔐 AuthContext signUp called:', { email, fullName, password: '***' })
      setLoading(true)

      // Validate email before attempting signup
      const emailError = validateEmailSimple(email)
      if (emailError) {
        console.error('❌ Email validation failed:', emailError)
        return { error: emailError }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      console.log('🔐 Supabase signUp result:', { data: data?.user?.email, error })

      if (error) {
        console.error('❌ Supabase signUp error:', error)

        // Provide more user-friendly error messages
        if (error.message.includes('User already registered')) {
          return { error: 'An account with this email already exists. Please sign in instead.' }
        }
        if (error.message.includes('Password should be at least')) {
          return { error: 'Password should be at least 6 characters long.' }
        }
        if (error.message.includes('Invalid email')) {
          return { error: 'Please enter a valid, deliverable email address. Avoid test or example domains.' }
        }
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          return { error: 'Too many signup attempts. Please wait a few minutes before trying again.' }
        }
        if (error.message.includes('email') && error.message.includes('bounce')) {
          return { error: 'Email delivery failed. Please verify your email address and try again.' }
        }

        return { error: error.message }
      }

      console.log('✅ Supabase signUp successful')
      return { error: null }
    } catch (err) {
      console.error('❌ SignUp exception:', err)
      return { error: 'An unexpected error occurred during sign up. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log('🔐 AuthContext signOut called')
      setLoading(true)

      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('❌ Supabase signOut error:', error)
        return { error: error.message }
      }

      console.log('✅ Supabase signOut successful')
      return { error: null }
    } catch (err) {
      console.error('❌ SignOut exception:', err)
      return { error: 'An unexpected error occurred during sign out. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      console.log('🔐 AuthContext resetPassword called:', { email })
      setLoading(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        console.error('❌ Supabase resetPassword error:', error)
        return { error: error.message }
      }

      console.log('✅ Supabase resetPassword successful')
      return { error: null }
    } catch (err) {
      console.error('❌ ResetPassword exception:', err)
      return { error: 'An unexpected error occurred during password reset. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (password: string) => {
    try {
      console.log('🔐 AuthContext updatePassword called')
      setLoading(true)

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        console.error('❌ Supabase updatePassword error:', error)
        return { error: error.message }
      }

      console.log('✅ Supabase updatePassword successful')
      return { error: null }
    } catch (err) {
      console.error('❌ UpdatePassword exception:', err)
      return { error: 'An unexpected error occurred during password update. Please try again.' }
    } finally {
      setLoading(false)
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
