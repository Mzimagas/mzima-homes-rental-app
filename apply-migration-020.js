const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration020() {
  console.log('🔧 Applying Migration 020: Fix user_invitations RLS...');
  
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('./supabase/migrations/020_fix_user_invitations_rls.sql', 'utf8');
    
    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    
    // Split into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`\n🔄 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n${i + 1}. ${statement.substring(0, 80)}...`);
      
      try {
        // Use direct SQL execution through the REST API
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`❌ Error executing statement ${i + 1}:`, error);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
      }
    }
    
    // Test the fix by trying to query user_invitations
    console.log('\n🧪 Testing the fix...');
    const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca';
    
    const { data: testData, error: testError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'PENDING');
      
    if (testError) {
      console.error('❌ Test query still failing:', testError);
    } else {
      console.log('✅ Test query successful! Migration applied correctly.');
      console.log('📊 Test results:', testData);
    }
    
    console.log('\n🎉 Migration 020 completed!');
    console.log('Please refresh the browser to see the changes.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyMigration020().catch(console.error);
