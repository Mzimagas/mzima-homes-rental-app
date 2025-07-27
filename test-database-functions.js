const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseKey, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey || !serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase clients
const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function testDatabaseFunctions() {
  console.log('🔍 Testing database functions...\n')

  // Test 1: Check if get_cron_job_stats function exists
  console.log('1. Testing get_cron_job_stats function...')
  try {
    const { data, error } = await supabaseAdmin.rpc('get_cron_job_stats', {
      p_job_name: null,
      p_days: 7
    })

    if (error) {
      console.error('❌ get_cron_job_stats function error:', error)
      console.log('   This suggests the migration 007_cron_job_history.sql has not been applied')
    } else {
      console.log('✅ get_cron_job_stats function exists and works')
      console.log('   Data returned:', data)
    }
  } catch (err) {
    console.error('❌ get_cron_job_stats function failed:', err.message)
  }

  // Test 2: Check if cron_job_history table exists
  console.log('\n2. Testing cron_job_history table...')
  try {
    const { data, error } = await supabaseAdmin
      .from('cron_job_history')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ cron_job_history table error:', error)
      console.log('   This suggests the table does not exist')
    } else {
      console.log('✅ cron_job_history table exists')
      console.log('   Records found:', data?.length || 0)
    }
  } catch (err) {
    console.error('❌ cron_job_history table failed:', err.message)
  }

  // Test 3: Test Edge Functions
  console.log('\n3. Testing Edge Functions...')
  
  // Test process-notifications function
  console.log('   Testing process-notifications...')
  try {
    const { data, error } = await supabase.functions.invoke('process-notifications', {
      body: {}
    })

    if (error) {
      console.error('❌ process-notifications function error:', error)
    } else {
      console.log('✅ process-notifications function works')
      console.log('   Response:', data)
    }
  } catch (err) {
    console.error('❌ process-notifications function failed:', err.message)
  }

  // Test cron-scheduler function
  console.log('   Testing cron-scheduler...')
  try {
    const { data, error } = await supabase.functions.invoke('cron-scheduler', {
      body: {}
    })

    if (error) {
      console.error('❌ cron-scheduler function error:', error)
    } else {
      console.log('✅ cron-scheduler function works')
      console.log('   Response:', data)
    }
  } catch (err) {
    console.error('❌ cron-scheduler function failed:', err.message)
  }

  // Test 4: Check notification-related tables
  console.log('\n4. Testing notification tables...')
  
  const tables = ['notification_rules', 'notification_templates', 'notification_history', 'notification_settings']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.error(`❌ ${table} table error:`, error)
      } else {
        console.log(`✅ ${table} table exists (${data?.length || 0} records)`)
      }
    } catch (err) {
      console.error(`❌ ${table} table failed:`, err.message)
    }
  }

  console.log('\n🏁 Database function tests completed!')
}

testDatabaseFunctions().catch(console.error)
