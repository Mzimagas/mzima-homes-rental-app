const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test both client configurations
const frontendClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugEmptyErrorObjects() {
  console.log('🔍 DEBUGGING EMPTY ERROR OBJECTS - Comprehensive Analysis\n');
  
  const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca';
  const abelUserId = '16d2d9e9-accb-4a79-bb74-52a734169f12';
  
  try {
    // Step 1: Test error object structure with known failing query
    console.log('1️⃣ Testing error object structure with unauthenticated query...');
    
    const { data: unauthData, error: unauthError } = await frontendClient
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId);
    
    console.log('Unauthenticated query result:');
    console.log('  data:', unauthData);
    console.log('  error:', unauthError);
    console.log('  error type:', typeof unauthError);
    console.log('  error constructor:', unauthError?.constructor?.name);
    console.log('  error keys:', unauthError ? Object.keys(unauthError) : 'null');
    console.log('  error properties:', unauthError ? Object.getOwnPropertyNames(unauthError) : 'null');
    console.log('  error JSON:', JSON.stringify(unauthError, null, 2));
    console.log('  error toString:', unauthError ? unauthError.toString() : 'null');
    
    // Step 2: Test with service role to see proper error structure
    console.log('\n2️⃣ Testing with service role for comparison...');
    
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId);
    
    console.log('Service role query result:');
    console.log('  data:', serviceData);
    console.log('  error:', serviceError);
    console.log('  data length:', serviceData?.length || 0);
    
    // Step 3: Test authentication methods
    console.log('\n3️⃣ Testing authentication methods...');
    
    // Test getUser without session
    console.log('Testing getUser() without session:');
    const { data: { user: noSessionUser }, error: noSessionError } = await frontendClient.auth.getUser();
    console.log('  user:', noSessionUser);
    console.log('  error:', noSessionError);
    console.log('  error type:', typeof noSessionError);
    console.log('  error properties:', noSessionError ? Object.getOwnPropertyNames(noSessionError) : 'null');
    
    // Test getSession
    console.log('\nTesting getSession():');
    const { data: { session }, error: sessionError } = await frontendClient.auth.getSession();
    console.log('  session:', session);
    console.log('  error:', sessionError);
    
    // Step 4: Test manual authentication
    console.log('\n4️⃣ Testing manual authentication...');
    
    // Try to sign in (this might fail but we want to see the error structure)
    const { data: authData, error: authError } = await frontendClient.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'wrongpassword' // Intentionally wrong to see error structure
    });
    
    console.log('Authentication attempt result:');
    console.log('  data:', authData);
    console.log('  error:', authError);
    console.log('  error type:', typeof authError);
    console.log('  error constructor:', authError?.constructor?.name);
    console.log('  error keys:', authError ? Object.keys(authError) : 'null');
    console.log('  error properties:', authError ? Object.getOwnPropertyNames(authError) : 'null');
    console.log('  error message:', authError?.message);
    console.log('  error status:', authError?.status);
    console.log('  error code:', authError?.code);
    
    // Step 5: Test the exact query that fails in the frontend
    console.log('\n5️⃣ Simulating exact frontend query...');
    
    // Simulate the loadInvitations function exactly
    const simulateLoadInvitations = async () => {
      console.log('🔍 Simulating loadInvitations function...');
      
      try {
        // Check authentication (this will likely fail)
        const { data: { user }, error: authError } = await frontendClient.auth.getUser();
        
        console.log('Auth check result:');
        console.log('  user:', user);
        console.log('  authError:', authError);
        console.log('  authError type:', typeof authError);
        console.log('  authError instanceof Error:', authError instanceof Error);
        console.log('  authError constructor:', authError?.constructor?.name);
        
        if (authError) {
          console.log('  authError message:', authError.message);
          console.log('  authError stack:', authError.stack);
          console.log('  authError properties:', Object.getOwnPropertyNames(authError));
          
          // Test how the error gets thrown and caught
          throw authError;
        }
        
        if (!user) {
          throw new Error('No authenticated user found');
        }
        
        // If we get here, try the query
        const { data, error } = await frontendClient
          .from('user_invitations')
          .select('*')
          .eq('property_id', propertyId)
          .eq('status', 'PENDING');
        
        if (error) {
          console.log('Query error details:');
          console.log('  error:', error);
          console.log('  error type:', typeof error);
          console.log('  error properties:', Object.getOwnPropertyNames(error));
          throw error;
        }
        
        return data;
        
      } catch (err) {
        console.log('❌ Caught error in simulation:');
        console.log('  err:', err);
        console.log('  err type:', typeof err);
        console.log('  err instanceof Error:', err instanceof Error);
        console.log('  err constructor:', err?.constructor?.name);
        console.log('  err message:', err?.message);
        console.log('  err stack:', err?.stack);
        console.log('  err properties:', err ? Object.getOwnPropertyNames(err) : 'null');
        console.log('  err toString():', err ? err.toString() : 'null');
        console.log('  err JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        
        // Test how the error looks when logged like in the frontend
        console.log('  Frontend-style error log:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
        
        throw err;
      }
    };
    
    await simulateLoadInvitations();
    
  } catch (err) {
    console.log('\n❌ Final catch block:');
    console.log('  err:', err);
    console.log('  err type:', typeof err);
    console.log('  err constructor:', err?.constructor?.name);
    console.log('  err message:', err?.message);
    console.log('  err properties:', err ? Object.getOwnPropertyNames(err) : 'null');
    
    // Test different ways of extracting error information
    console.log('\n🔍 Testing error extraction methods:');
    console.log('  String(err):', String(err));
    console.log('  err.toString():', err?.toString());
    console.log('  JSON.stringify(err):', JSON.stringify(err));
    console.log('  JSON.stringify with getOwnPropertyNames:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    console.log('  Object.entries(err):', err ? Object.entries(err) : 'null');
    
    // Check if it's a specific Supabase error type
    console.log('\n🔍 Checking Supabase error types:');
    console.log('  err.__isAuthError:', err?.__isAuthError);
    console.log('  err.status:', err?.status);
    console.log('  err.statusCode:', err?.statusCode);
    console.log('  err.code:', err?.code);
    console.log('  err.details:', err?.details);
    console.log('  err.hint:', err?.hint);
    console.log('  err.name:', err?.name);
  }
  
  // Step 6: Test with a valid session (using service role to create one)
  console.log('\n6️⃣ Testing with valid user session...');
  
  try {
    // Get Abel's user details from auth.users
    const { data: users, error: usersError } = await serviceClient.auth.admin.listUsers();
    
    if (usersError) {
      console.log('Error listing users:', usersError);
      return;
    }
    
    const abelUser = users.users.find(u => u.email === 'abeljoshua04@gmail.com');
    if (!abelUser) {
      console.log('Abel user not found in auth.users');
      return;
    }
    
    console.log('Found Abel user:', abelUser.id, abelUser.email);
    
    // Test the query with Abel's user ID directly using service role
    const { data: abelInvitations, error: abelError } = await serviceClient
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'PENDING');
    
    console.log('Abel invitations query (service role):');
    console.log('  data:', abelInvitations);
    console.log('  error:', abelError);
    
  } catch (err) {
    console.log('Error in valid session test:', err);
  }
  
  console.log('\n🎯 ANALYSIS COMPLETE');
  console.log('Check the detailed error object structures above to understand why they appear empty.');
}

debugEmptyErrorObjects();
