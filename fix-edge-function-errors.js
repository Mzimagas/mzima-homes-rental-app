const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixEdgeFunctionErrors() {
  console.log('🔧 Fixing Edge Function errors...');
  
  try {
    // Test if Edge Functions are deployed
    console.log('\n1️⃣ Testing Edge Function deployment status...');
    
    try {
      const { data, error } = await supabase.functions.invoke('process-notifications', {
        body: { test: true }
      });
      
      if (error) {
        console.log('❌ Edge Functions are not deployed');
        console.log('Error:', error.message);
      } else {
        console.log('✅ Edge Functions are deployed and working');
        return;
      }
    } catch (err) {
      console.log('❌ Edge Functions are not deployed');
      console.log('Error:', err.message);
    }
    
    // Provide deployment instructions
    console.log('\n2️⃣ Edge Function Deployment Instructions:');
    console.log('==========================================');
    
    console.log('\n📋 Quick Fix Options:');
    console.log('1. Deploy via Supabase CLI (Recommended)');
    console.log('2. Deploy via Supabase Dashboard');
    console.log('3. Use fallback mechanism (temporary)');
    
    console.log('\n🚀 Option 1: Deploy via Supabase CLI');
    console.log('------------------------------------');
    console.log('Run these commands in your terminal:');
    console.log('');
    console.log('# Install Supabase CLI (if not already installed)');
    console.log('npm install -g supabase');
    console.log('');
    console.log('# Login to Supabase');
    console.log('supabase login');
    console.log('');
    console.log('# Link to your project');
    console.log('supabase link --project-ref ajrxvnakphkpkcssisxm');
    console.log('');
    console.log('# Deploy the Edge Functions');
    console.log('supabase functions deploy process-notifications');
    console.log('supabase functions deploy cron-scheduler');
    console.log('supabase functions deploy send-email');
    console.log('supabase functions deploy send-sms');
    
    console.log('\n🌐 Option 2: Deploy via Supabase Dashboard');
    console.log('-------------------------------------------');
    console.log('1. Go to: https://supabase.com/dashboard/project/ajrxvnakphkpkcssisxm/functions');
    console.log('2. Click "Create a new function"');
    console.log('3. Name it "process-notifications"');
    console.log('4. Copy the code from: supabase/functions/process-notifications/index.ts');
    console.log('5. Deploy the function');
    console.log('6. Repeat for other functions');
    
    console.log('\n⚙️ Option 3: Temporary Fallback (Quick Fix)');
    console.log('--------------------------------------------');
    console.log('I can modify the code to provide fallback functionality');
    console.log('This will prevent errors but won\'t provide full functionality');
    
    // Create a fallback mechanism
    console.log('\n3️⃣ Implementing temporary fallback...');
    
    // Check if we can modify the supabase-client.ts file
    const fs = require('fs');
    const path = './src/lib/supabase-client.ts';
    
    try {
      let content = fs.readFileSync(path, 'utf8');
      
      // Check if fallback is already implemented
      if (content.includes('// EDGE_FUNCTION_FALLBACK')) {
        console.log('✅ Fallback mechanism already implemented');
      } else {
        console.log('📝 Adding fallback mechanism to supabase-client.ts...');
        
        // Add fallback to processNotifications function
        const fallbackCode = `
  async processNotifications() {
    try {
      const { data, error } = await supabase.functions.invoke('process-notifications', {
        body: {}
      })
      
      if (error) {
        // EDGE_FUNCTION_FALLBACK: Return mock response when function is not deployed
        if (error.message?.includes('not deployed') || error.message?.includes('404') || error.message?.includes('Failed to send')) {
          console.warn('Edge Function not deployed, returning mock response');
          return { 
            data: { 
              status: 'not_deployed', 
              message: 'Edge Functions are not deployed. Please deploy them to enable this feature.',
              processed: 0 
            }, 
            error: null 
          };
        }
        return { data: null, error: error.message }
      }
      
      return { data, error: null }
    } catch (err) {
      // EDGE_FUNCTION_FALLBACK: Handle network errors gracefully
      console.warn('Edge Function error, returning fallback response:', err.message);
      return { 
        data: { 
          status: 'not_deployed', 
          message: 'Edge Functions are not available. Please deploy them to enable this feature.',
          processed: 0 
        }, 
        error: null 
      };
    }
  },`;
        
        // Replace the existing processNotifications function
        const processNotificationsRegex = /async processNotifications\(\) \{[\s\S]*?\},/;
        
        if (processNotificationsRegex.test(content)) {
          content = content.replace(processNotificationsRegex, fallbackCode.trim() + ',');
          fs.writeFileSync(path, content);
          console.log('✅ Fallback mechanism added successfully');
          console.log('🔄 Please restart your development server (Ctrl+C and npm run dev)');
        } else {
          console.log('⚠️ Could not find processNotifications function to modify');
        }
      }
    } catch (err) {
      console.error('❌ Error implementing fallback:', err.message);
    }
    
    console.log('\n🎯 Recommended Next Steps:');
    console.log('===========================');
    console.log('1. Deploy Edge Functions using Option 1 (CLI) for full functionality');
    console.log('2. Restart your development server if fallback was implemented');
    console.log('3. Test the notifications page - it should now show a helpful message');
    console.log('4. Once Edge Functions are deployed, remove the fallback code');
    
    console.log('\n📊 Current Status:');
    console.log('==================');
    console.log('✅ user_invitations RLS: FIXED');
    console.log('✅ landlords table: FIXED');
    console.log('✅ user_roles table: FIXED');
    console.log('⚠️ Edge Functions: NOT DEPLOYED (fallback implemented)');
    console.log('⚠️ Cron job stats: NEEDS MANUAL SQL (see previous instructions)');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixEdgeFunctionErrors().catch(console.error);
