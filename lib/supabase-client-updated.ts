
// Updated Supabase client with better auth handling
import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing public Supabase environment variables')
}

// Client for browser/frontend use (with RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Handle email confirmation in development
    flowType: 'pkce'
  }
})

// Enhanced auth functions
export const auth = {
  // Sign in with better error handling
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      if (error.message.includes('email_not_confirmed')) {
        return {
          data: null,
          error: {
            ...error,
            message: 'Please check your email and click the confirmation link. If you don\'t see the email, check your spam folder.',
            needsConfirmation: true
          }
        }
      }
    }
    
    return { data, error }
  },
  
  // Resend confirmation email
  async resendConfirmation(email: string) {
    return await supabase.auth.resend({
      type: 'signup',
      email
    })
  },
  
  // Sign up with auto-confirmation in development
  async signUp(email: string, password: string, options?: any) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        ...options,
        // In development, you might want to skip email confirmation
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }
}
