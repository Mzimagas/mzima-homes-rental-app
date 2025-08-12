const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create frontend client exactly like the app does
const frontendClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      retryAttempts: 3,
      timeout: 30000
    },
    global: {
      headers: {
        'X-Client-Info': 'voi-rental-app@1.0.0'
      },
      fetch: (url, options = {}) => {
        console.log('🌐 Supabase fetch:', url)
        
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000)
        }).catch(error => {
          console.error('🚨 Supabase fetch error:', error)
          
          if (error.name === 'AbortError') {
            throw new Error('Request timeout - please check your internet connection')
          }
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Network error - please check your internet connection and try again')
          }
          
          throw error
        })
      }
    },
    db: {
      schema: 'public'
    }
  }
)

async function debugFrontendInvitationError() {
  console.log('🔍 Debugging frontend invitation error exactly as it happens in the app...\n');
  
  try {
    const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca';
    
    // Step 1: Try to authenticate as Abel
    console.log('1️⃣ Attempting to authenticate as Abel...');
    const { data: authData, error: authError } = await frontendClient.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'test123' // This might not be the correct password
    });
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('🔧 This might be why the invitation query fails');
      
      // Try to get current session instead
      console.log('\n2️⃣ Checking for existing session...');
      const { data: { session }, error: sessionError } = await frontendClient.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
      } else if (session) {
        console.log('✅ Found existing session:', session.user.email);
      } else {
        console.log('❌ No existing session found');
      }
    } else {
      console.log('✅ Authentication successful:', authData.user.email);
    }
    
    // Step 2: Test the exact query that fails in the frontend
    console.log('\n3️⃣ Testing the exact invitation query...');
    
    // Simulate the exact loadInvitations function
    const loadInvitations = async () => {
      console.log('🔍 loadInvitations: Starting invitation load process');
      console.log('📍 Property ID:', propertyId);
      
      try {
        // Check authentication state first
        console.log('🔐 Checking authentication state...');
        const { data: { user }, error: authError } = await frontendClient.auth.getUser();
        
        if (authError) {
          console.error('❌ Authentication error:', authError);
          throw new Error(`Authentication failed: ${authError.message}`);
        }
        
        if (!user) {
          console.error('❌ No authenticated user found');
          throw new Error('No authenticated user found');
        }
        
        console.log('✅ User authenticated:', user.id, user.email);
        
        console.log('📨 Executing invitation query...');
        const queryStart = Date.now();
        
        const { data, error } = await frontendClient
          .from('user_invitations')
          .select('*')
          .eq('property_id', propertyId)
          .eq('status', 'PENDING');
        
        const queryTime = Date.now() - queryStart;
        console.log(`⏱️ Query completed in ${queryTime}ms`);
        
        if (error) {
          console.error('❌ Supabase query error:', {
            message: error.message || 'No message',
            details: error.details || 'No details',
            hint: error.hint || 'No hint',
            code: error.code || 'No code',
            fullError: error
          });
          throw error;
        }
        
        console.log('✅ Invitations loaded successfully:', {
          count: data?.length || 0,
          data: data
        });
        
        return data;
        
      } catch (err) {
        console.error('❌ Error in loadInvitations:', {
          errorType: typeof err,
          errorConstructor: err?.constructor?.name,
          errorMessage: err?.message,
          errorDetails: err?.details,
          errorCode: err?.code,
          errorHint: err?.hint,
          fullError: err,
          errorString: String(err),
          errorJSON: JSON.stringify(err, Object.getOwnPropertyNames(err))
        });
        
        throw err;
      }
    };
    
    // Execute the function
    await loadInvitations();
    
    // Step 3: Test with service role to compare
    console.log('\n4️⃣ Testing with service role for comparison...');
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'PENDING');
    
    if (serviceError) {
      console.error('❌ Service role query error:', serviceError);
    } else {
      console.log('✅ Service role query successful:', serviceData?.length || 0, 'invitations');
    }
    
    // Step 4: Test RLS policy directly
    console.log('\n5️⃣ Testing RLS policy compliance...');
    
    // Check if Abel has OWNER access
    const { data: abelAccess, error: accessError } = await serviceClient
      .from('property_users')
      .select('*')
      .eq('user_id', '16d2d9e9-accb-4a79-bb74-52a734169f12')
      .eq('property_id', propertyId)
      .eq('role', 'OWNER')
      .eq('status', 'ACTIVE');
    
    if (accessError) {
      console.error('❌ Access check error:', accessError);
    } else {
      console.log('✅ Abel\'s OWNER access:', abelAccess?.length > 0 ? 'CONFIRMED' : 'NOT FOUND');
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('The issue is likely one of the following:');
    console.log('1. Authentication session not properly established in frontend');
    console.log('2. RLS policy not recognizing the authenticated user');
    console.log('3. Custom fetch function in Supabase client causing issues');
    console.log('4. Error object being modified by the custom error handling');
    
  } catch (err) {
    console.error('❌ Debug script failed:', {
      error: err,
      message: err?.message,
      stack: err?.stack
    });
  }
}

debugFrontendInvitationError();
