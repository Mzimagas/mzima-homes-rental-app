
// Enhanced signup function with auto-confirmation
export async function enhancedSignUp(email: string, password: string, fullName: string) {
  try {
    console.log('🔐 Enhanced signup called:', { email, fullName })
    
    // Step 1: Create user with Supabase
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        // Don't send confirmation email in development
        emailRedirectTo: undefined
      }
    })
    
    if (signUpError) {
      console.error('❌ Signup error:', signUpError)
      return { data: null, error: signUpError.message }
    }
    
    console.log('✅ User created:', signUpData.user?.email)
    
    // Step 2: Auto-confirm user in development
    if (process.env.NODE_ENV === 'development' || !signUpData.user?.email_confirmed_at) {
      console.log('🔧 Auto-confirming user for development...')
      
      try {
        // Use admin API to confirm email
        const response = await fetch('/api/auth/confirm-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: signUpData.user?.id,
            email: signUpData.user?.email
          })
        })
        
        if (response.ok) {
          console.log('✅ User auto-confirmed')
          
          // Step 3: Sign in the user immediately
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          })
          
          if (signInError) {
            console.error('❌ Auto sign-in failed:', signInError)
            return { data: signUpData, error: 'Account created but auto sign-in failed. Please try logging in.' }
          }
          
          console.log('✅ User auto-signed in')
          return { data: signInData, error: null }
        } else {
          console.log('⚠️ Auto-confirmation failed, user needs to confirm email')
          return { data: signUpData, error: 'Account created. Please check your email for confirmation.' }
        }
      } catch (err) {
        console.error('❌ Auto-confirmation error:', err)
        return { data: signUpData, error: 'Account created but confirmation failed. Please contact support.' }
      }
    }
    
    return { data: signUpData, error: null }
  } catch (err) {
    console.error('❌ Enhanced signup error:', err)
    return { data: null, error: 'An unexpected error occurred during registration.' }
  }
}
