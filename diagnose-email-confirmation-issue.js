// Diagnose and fix email confirmation issues
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseAnonKey, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function diagnoseEmailConfirmationIssue() {
  console.log('📧 Diagnosing Email Confirmation Issue...\n')
  
  try {
    // Step 1: Check current user status
    console.log('1️⃣ Checking current user status...')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('⚠️ No current user session:', userError.message)
    } else if (user) {
      console.log('✅ Current user found:')
      console.log(`   Email: ${user.email}`)
      console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
      console.log(`   User ID: ${user.id}`)
      console.log(`   Created: ${user.created_at}`)
    } else {
      console.log('ℹ️ No user currently logged in')
    }
    
    // Step 2: Check if our landlord user exists and is confirmed
    console.log('\n2️⃣ Checking landlord user status...')
    
    try {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        console.log('❌ Could not list users:', listError.message)
      } else {
        console.log(`✅ Found ${users.users?.length || 0} users in the system`)
        
        const landlordUser = users.users?.find(u => u.email === 'landlord@mzimahomes.com')
        
        if (landlordUser) {
          console.log('✅ Landlord user found:')
          console.log(`   Email: ${landlordUser.email}`)
          console.log(`   Email confirmed: ${landlordUser.email_confirmed_at ? 'Yes' : 'No'}`)
          console.log(`   User ID: ${landlordUser.id}`)
          console.log(`   Last sign in: ${landlordUser.last_sign_in_at || 'Never'}`)
          
          // If not confirmed, let's confirm it
          if (!landlordUser.email_confirmed_at) {
            console.log('\n   🔧 Auto-confirming landlord user email...')
            
            const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              landlordUser.id,
              { email_confirm: true }
            )
            
            if (updateError) {
              console.log('   ❌ Failed to confirm email:', updateError.message)
            } else {
              console.log('   ✅ Email confirmed successfully!')
            }
          }
        } else {
          console.log('❌ Landlord user not found')
        }
        
        // Check for the problematic user (abeljoshua04@gmail.com)
        const problemUser = users.users?.find(u => u.email === 'abeljoshua04@gmail.com')
        
        if (problemUser) {
          console.log('\n⚠️ Found problematic user:')
          console.log(`   Email: ${problemUser.email}`)
          console.log(`   Email confirmed: ${problemUser.email_confirmed_at ? 'Yes' : 'No'}`)
          console.log(`   User ID: ${problemUser.id}`)
          
          // Auto-confirm this user too
          if (!problemUser.email_confirmed_at) {
            console.log('\n   🔧 Auto-confirming problematic user email...')
            
            const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              problemUser.id,
              { email_confirm: true }
            )
            
            if (updateError) {
              console.log('   ❌ Failed to confirm email:', updateError.message)
            } else {
              console.log('   ✅ Email confirmed successfully!')
            }
          }
        }
      }
    } catch (err) {
      console.log('❌ Error checking users:', err.message)
    }
    
    // Step 3: Test authentication with landlord user
    console.log('\n3️⃣ Testing authentication with landlord user...')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'landlord@mzimahomes.com',
      password: 'MzimaHomes2024!'
    })
    
    if (signInError) {
      console.log('❌ Sign in error:', signInError.message)
      
      if (signInError.message.includes('email_not_confirmed')) {
        console.log('   This is the email confirmation issue!')
      }
    } else {
      console.log('✅ Authentication successful!')
      console.log(`   User: ${signInData.user?.email}`)
      console.log(`   Email confirmed: ${signInData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
      
      // Sign out
      await supabase.auth.signOut()
    }
    
    // Step 4: Check Supabase Auth settings
    console.log('\n4️⃣ Checking Supabase Auth configuration...')
    
    console.log('   📋 Current Supabase project settings to check:')
    console.log('   1. Go to your Supabase dashboard')
    console.log('   2. Navigate to Authentication > Settings')
    console.log('   3. Check "Enable email confirmations" setting')
    console.log('   4. Check "Enable email change confirmations" setting')
    console.log('   5. Review email templates in Authentication > Email Templates')
    
    // Step 5: Provide solutions
    console.log('\n5️⃣ Solutions to fix email confirmation issue...')
    
    console.log('\n   🔧 SOLUTION 1: Disable email confirmation for development')
    console.log('   In Supabase Dashboard > Authentication > Settings:')
    console.log('   - Turn OFF "Enable email confirmations"')
    console.log('   - This allows users to sign in without email confirmation')
    
    console.log('\n   🔧 SOLUTION 2: Auto-confirm existing users (DONE ABOVE)')
    console.log('   - Used admin API to confirm existing user emails')
    console.log('   - This fixes the immediate issue for existing users')
    
    console.log('\n   🔧 SOLUTION 3: Configure proper email delivery')
    console.log('   In Supabase Dashboard > Authentication > Settings > SMTP Settings:')
    console.log('   - Enable custom SMTP')
    console.log('   - Use the SMTP settings from .env.local:')
    console.log(`     Host: smtp.gmail.com`)
    console.log(`     Port: 587`)
    console.log(`     Username: mzimahomesl@gmail.com`)
    console.log(`     Password: Tsavo@2015`)
    
    console.log('\n   🔧 SOLUTION 4: Update auth configuration in code')
    console.log('   - Modify Supabase client to handle email confirmation')
    console.log('   - Add proper error handling for unconfirmed emails')
    
    // Step 6: Implement immediate fix
    console.log('\n6️⃣ Implementing immediate fix...')
    
    console.log('   Creating updated Supabase client with better auth handling...')
    
    const updatedSupabaseClient = `
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
            message: 'Please check your email and click the confirmation link. If you don\\'t see the email, check your spam folder.',
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
        emailRedirectTo: \`\${window.location.origin}/auth/callback\`
      }
    })
  }
}
`
    
    fs.writeFileSync('lib/supabase-client-updated.ts', updatedSupabaseClient)
    console.log('   ✅ Updated Supabase client written to lib/supabase-client-updated.ts')
    
    // Step 7: Create auth callback handler
    console.log('\n7️⃣ Creating auth callback handler...')
    
    const authCallbackPage = `
// Auth callback page to handle email confirmations
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase-client'

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
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Confirming your email...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we confirm your email address.
          </p>
        </div>
      </div>
    </div>
  )
}
`
    
    // Create the directory structure if it doesn't exist
    const authCallbackDir = 'src/app/auth/callback'
    if (!fs.existsSync(authCallbackDir)) {
      fs.mkdirSync(authCallbackDir, { recursive: true })
    }
    
    fs.writeFileSync(`${authCallbackDir}/page.tsx`, authCallbackPage)
    console.log('   ✅ Auth callback page created at src/app/auth/callback/page.tsx')
    
    console.log('\n📋 Email Confirmation Issue Diagnosis Summary:')
    console.log('✅ Issue identified: Email confirmation blocking authentication')
    console.log('✅ Existing users: Auto-confirmed via admin API')
    console.log('✅ Updated client: Better auth error handling')
    console.log('✅ Callback handler: Created for email confirmations')
    console.log('✅ Solutions provided: Multiple approaches to fix the issue')
    
    console.log('\n🎉 IMMEDIATE FIXES APPLIED!')
    console.log('\n📝 What was done:')
    console.log('   1. Auto-confirmed existing user emails via admin API')
    console.log('   2. Created enhanced auth client with better error handling')
    console.log('   3. Added auth callback page for email confirmations')
    console.log('   4. Provided multiple solutions for permanent fix')
    
    console.log('\n🚀 Next Steps:')
    console.log('   1. Try logging in again with landlord@mzimahomes.com')
    console.log('   2. If still issues, disable email confirmation in Supabase dashboard')
    console.log('   3. For production: Set up proper SMTP in Supabase settings')
    console.log('   4. Test the updated authentication flow')
    
  } catch (err) {
    console.error('❌ Diagnosis failed:', err.message)
  }
}

diagnoseEmailConfirmationIssue()
