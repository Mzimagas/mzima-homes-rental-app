const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function diagnoseFetchErrors() {
  console.log('🔍 Diagnosing fetch errors...');
  
  try {
    // Check environment variables
    console.log('\n1️⃣ Checking environment variables...');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Missing required environment variables');
      return;
    }
    
    // Test basic connectivity
    console.log('\n2️⃣ Testing basic connectivity...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    try {
      const response = await fetch(supabaseUrl + '/rest/v1/', {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });
      
      console.log('Basic fetch response status:', response.status);
      if (response.ok) {
        console.log('✅ Basic connectivity working');
      } else {
        console.log('⚠️ Basic connectivity issues:', response.statusText);
      }
    } catch (err) {
      console.error('❌ Basic fetch failed:', err.message);
      console.log('This suggests network connectivity issues');
    }
    
    // Test Supabase client creation
    console.log('\n3️⃣ Testing Supabase client...');
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      console.log('✅ Supabase client created successfully');
      
      // Test a simple query
      console.log('\n4️⃣ Testing simple query...');
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error('❌ Query failed:', error);
      } else {
        console.log('✅ Simple query successful');
      }
      
    } catch (err) {
      console.error('❌ Supabase client error:', err.message);
    }
    
    // Test with service role
    console.log('\n5️⃣ Testing with service role...');
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const { data, error } = await supabaseAdmin
          .from('properties')
          .select('id')
          .limit(1);
          
        if (error) {
          console.error('❌ Service role query failed:', error);
        } else {
          console.log('✅ Service role query successful');
        }
        
      } catch (err) {
        console.error('❌ Service role error:', err.message);
      }
    }
    
    // Check for common issues
    console.log('\n6️⃣ Checking for common issues...');
    
    // Check if URL is correct format
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
      console.error('❌ Supabase URL should start with https://');
    }
    
    // Check if URL ends with supabase.co
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
      console.error('❌ Supabase URL should contain supabase.co');
    }
    
    // Check key format
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
      console.error('❌ Anon key seems too short');
    }
    
    console.log('\n📋 Troubleshooting Steps:');
    console.log('========================');
    console.log('1. Check your internet connection');
    console.log('2. Verify Supabase project is active and not paused');
    console.log('3. Check if your IP is blocked by any firewall');
    console.log('4. Try accessing your Supabase dashboard directly');
    console.log('5. Regenerate API keys if necessary');
    console.log('6. Check browser network tab for specific error details');
    
    console.log('\n🔗 Quick Links:');
    console.log('===============');
    console.log('Supabase Dashboard:', `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0]}`);
    console.log('Project Settings:', `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0]}/settings/api`);
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnosis:', error);
  }
}

diagnoseFetchErrors().catch(console.error);
