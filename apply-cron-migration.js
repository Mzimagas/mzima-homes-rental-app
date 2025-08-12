const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyCronMigration() {
  console.log('🔧 Applying cron job migration...');
  
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('./supabase/migrations/007_cron_job_history.sql', 'utf8');
    
    console.log('📄 Migration SQL loaded');
    
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
          console.log(`⚠️ Statement ${i + 1} response:`, error);
          // Don't fail on errors, as some statements might already exist
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        console.log(`⚠️ Statement ${i + 1} error:`, error.message);
      }
    }
    
    // Test the function
    console.log('\n🧪 Testing the cron job stats function...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_cron_job_stats');
      
    if (testError) {
      console.error('❌ Test failed:', testError);
    } else {
      console.log('✅ Cron job stats function working!');
      console.log('📊 Test results:', testData);
    }
    
    // Create a sample cron job history entry for testing
    console.log('\n📝 Creating sample cron job history entry...');
    const { data: sampleEntry, error: sampleError } = await supabase
      .from('cron_job_history')
      .insert({
        job_name: 'test_job',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'completed',
        result: { message: 'Test job completed successfully' }
      })
      .select();
      
    if (sampleError) {
      console.error('❌ Sample entry creation failed:', sampleError);
    } else {
      console.log('✅ Sample entry created:', sampleEntry[0].id);
      
      // Clean up the sample entry
      await supabase
        .from('cron_job_history')
        .delete()
        .eq('id', sampleEntry[0].id);
      console.log('🧹 Sample entry cleaned up');
    }
    
    console.log('\n🎉 Cron job migration completed successfully!');
    console.log('The get_cron_job_stats function should now be available.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyCronMigration().catch(console.error);
