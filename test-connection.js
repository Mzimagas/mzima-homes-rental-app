// Simple test to verify Supabase connection
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  console.log('📄 .env.local file found, parsing...')
  const lines = envContent.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
      console.log('Found URL:', supabaseUrl ? 'Yes' : 'No')
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmedLine.split('=')[1]
      console.log('Found Key:', supabaseKey ? 'Yes' : 'No')
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

console.log('Environment check:')
console.log('- Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('- Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing')
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.log('Make sure your .env.local file has:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...')

    // Test basic connection first
    const { data: healthCheck, error: healthError } = await supabase
      .from('_supabase_health_check')
      .select('*')
      .limit(1)

    // Try to query landlords table
    const { data, error } = await supabase
      .from('landlords')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Database error:', error.message)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)

      if (error.message.includes('relation "landlords" does not exist') ||
          error.code === 'PGRST116' ||
          error.message.includes('schema "public" does not exist')) {
        console.log('\n📋 Database tables not created yet!')
        console.log('You need to run the database migrations first.')
        console.log('\nGo to your Supabase dashboard:')
        console.log('1. Visit: https://supabase.com/dashboard/project/ajrxvnakphkpkcssisxm')
        console.log('2. Go to SQL Editor')
        console.log('3. Run these files in order:')
        console.log('   a. supabase/migrations/001_initial_schema.sql')
        console.log('   b. supabase/migrations/002_rls_policies.sql')
        console.log('   c. supabase/functions/business-logic.sql')
      } else if (error.message.includes('JWT')) {
        console.log('\n🔑 Authentication issue - check your API keys')
      }
    } else {
      console.log('✅ Supabase connection successful!')
      console.log('✅ Database tables exist and are accessible!')
      console.log('🎉 Ready to proceed with testing!')
    }
  } catch (err) {
    console.error('❌ Test failed with exception:', err.message)
    console.error('Stack trace:', err.stack)
  }
}

testConnection()
