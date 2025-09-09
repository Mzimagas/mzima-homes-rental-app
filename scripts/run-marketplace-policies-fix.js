const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runPoliciesFix() {
  console.log('🔧 Running marketplace policies fix...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '081_marketplace_policies_fix.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📝 Executing policies fix SQL...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.log('❌ Error with exec_sql, trying direct approach...')
      console.error('Error:', error)
      
      // If exec_sql doesn't work, we'll need to run it manually
      console.log('📋 Please run this SQL manually in Supabase SQL editor:')
      console.log('=' * 50)
      console.log(sql)
      console.log('=' * 50)
      return
    }
    
    console.log('✅ Policies fix completed successfully!')
    console.log('📊 Result:', data)
    
  } catch (error) {
    console.error('❌ Error running policies fix:', error)
    
    // Fallback: show the SQL to run manually
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '081_marketplace_policies_fix.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📋 Please run this SQL manually in Supabase SQL editor:')
    console.log('=' * 50)
    console.log(sql)
    console.log('=' * 50)
  }
}

runPoliciesFix()
