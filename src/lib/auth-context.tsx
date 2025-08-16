'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import supabase from './supabase-client'
import { validateEmailSimple } from './email-validation'
import { logger, shouldLogAuth, redactEmail } from './logger'

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
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)

    // Get initial session
    const getInitialSession = async () => {
      try {
        if (shouldLogAuth()) logger.info('AuthProvider: Getting initial session')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          logger.error('AuthProvider: Error getting session', error)
        } else {
          if (shouldLogAuth()) logger.debug('AuthProvider: Initial session', redactEmail(session?.user?.email || ''))
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (err) {
        logger.error('AuthProvider: Exception getting session', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (shouldLogAuth()) logger.info('AuthProvider: Auth state change', event, redactEmail(session?.user?.email || ''))

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle different auth events - only if component is mounted
        if (isMounted) {
          if (event === 'SIGNED_IN') {
            if (shouldLogAuth()) logger.info('AuthProvider: User signed in, redirecting to dashboard')
            router.push('/dashboard')
          } else if (event === 'SIGNED_OUT') {
            if (shouldLogAuth()) logger.info('AuthProvider: User signed out, redirecting to login')
            router.push('/auth/login')
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      setIsMounted(false)
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      if (shouldLogAuth()) logger.info('AuthContext signIn called', { email: redactEmail(email) })
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (shouldLogAuth()) logger.debug('AuthContext signIn result', { user: redactEmail(data?.user?.email || '') })

      if (error) {
        logger.warn('AuthContext signIn error', { message: error.message })

        // Handle MFA required (surface as generic error; login page will prompt for OTP)
        if (error.name === 'AuthApiError' && (error as any).status === 400 && error.message?.includes('mfa')) {
          return { error: 'MFA_REQUIRED' }
        }

        if (error.message.includes('email_not_confirmed') || error.message.includes('Email not confirmed')) {
          return { error: 'If the email or password is incorrect or your email is not confirmed, please try again or check your inbox.' }
        }
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'If the email or password is incorrect or your email is not confirmed, please try again or check your inbox.' }
        }
        if (error.message.includes('Network error')) {
          return { error: 'Network error. Please check your internet connection and try again.' }
        }
        if (error.message.includes('timeout')) {
          return { error: 'Request timeout. Please check your internet connection and try again.' }
        }

        return { error: 'If the email or password is incorrect or your email is not confirmed, please try again or check your inbox.' }
      }

      if (shouldLogAuth()) logger.info('AuthContext signIn successful')
      return { error: null }
    } catch (err) {
      logger.error('AuthContext signIn exception', err)
      return { error: 'An unexpected error occurred during sign in. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      if (shouldLogAuth()) logger.info('AuthContext signUp called', { email: redactEmail(email) })
      setLoading(true)

      // Validate email before attempting signup
      const emailError = validateEmailSimple(email)
      if (emailError) {
        logger.warn('AuthContext email validation failed', { email: redactEmail(email), error: emailError })
        return { error: emailError }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      })

      if (shouldLogAuth()) logger.debug('AuthContext signUp result', { user: redactEmail(data?.user?.email || '') })

      if (error) {
        logger.warn('AuthContext signUp error', { message: error.message })

        if (error.message.includes('User already registered')) {
          return { error: 'An account with this email already exists. Please sign in instead.' }
        }
        if (error.message.includes('Password should be at least')) {
          return { error: 'Password does not meet the required strength.' }
        }
        if (error.message.includes('Invalid email')) {
          return { error: 'Please enter a valid, deliverable email address.' }
        }
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          return { error: 'Too many signup attempts. Please wait a few minutes before trying again.' }
        }
        if (error.message.includes('email') && error.message.includes('bounce')) {
          return { error: 'Email delivery failed. Please verify your email address and try again.' }
        }

        return { error: 'Unable to sign up at this time. Please try again.' }
      }

      if (shouldLogAuth()) logger.info('AuthContext signUp successful')
      return { error: null }
    } catch (err) {
      logger.error('AuthContext signUp exception', err)
      return { error: 'An unexpected error occurred during sign up. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      if (shouldLogAuth()) logger.info('AuthContext signOut called')
      setLoading(true)

      const { error } = await supabase.auth.signOut()

      if (error) {
        logger.warn('AuthContext signOut error', { message: error.message })
        return { error: 'Unable to sign out at this time. Please try again.' }
      }

      if (shouldLogAuth()) logger.info('AuthContext signOut successful')
      return { error: null }
    } catch (err) {
      logger.error('AuthContext signOut exception', err)
      return { error: 'An unexpected error occurred during sign out. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      if (shouldLogAuth()) logger.info('AuthContext resetPassword called', { email: redactEmail(email) })
      setLoading(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        logger.warn('AuthContext resetPassword error', { message: error.message })
        return { error: 'If the email exists, a reset link will be sent.' }
      }

      if (shouldLogAuth()) logger.info('AuthContext resetPassword successful')
      return { error: null }
    } catch (err) {
      logger.error('AuthContext resetPassword exception', err)
      return { error: 'An unexpected error occurred during password reset. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (password: string) => {
    try {
      if (shouldLogAuth()) logger.info('AuthContext updatePassword called')
      setLoading(true)

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        logger.warn('AuthContext updatePassword error', { message: error.message })
        return { error: 'Unable to update password at this time. Please try again.' }
      }

      if (shouldLogAuth()) logger.info('AuthContext updatePassword successful')
      return { error: null }
    } catch (err) {
      logger.error('AuthContext updatePassword exception', err)
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

  // Prevent hydration issues by not rendering until mounted
  if (!isMounted) {
    return (
      <AuthContext.Provider value={{ ...value, loading: true }}>
        {children}
      </AuthContext.Provider>
    )
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
