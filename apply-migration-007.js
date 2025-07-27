const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function applyMigration007() {
  console.log('🚀 Applying migration 007: Cron Job History...\n')

  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('supabase/migrations/007_cron_job_history.sql', 'utf8')
    
    console.log('📄 Migration file loaded successfully')
    console.log('📝 SQL content preview:')
    console.log(migrationSQL.substring(0, 200) + '...\n')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`🔧 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql: statement
        })

        if (error) {
          // Try direct execution if exec_sql doesn't exist
          console.log('   Trying alternative execution method...')
          
          // For CREATE TABLE and CREATE FUNCTION statements, we'll use a different approach
          if (statement.includes('CREATE TABLE') || statement.includes('CREATE FUNCTION') || statement.includes('CREATE INDEX')) {
            console.log('   ⚠️  Cannot execute DDL statements directly via RPC')
            console.log('   📋 Statement to execute manually:')
            console.log('   ' + statement.substring(0, 100) + '...')
          } else {
            console.error('   ❌ Error:', error)
          }
        } else {
          console.log('   ✅ Success')
        }
      } catch (err) {
        console.error('   ❌ Failed:', err.message)
      }
    }

    console.log('\n📋 Manual Migration Required')
    console.log('Since we cannot execute DDL statements via RPC, please:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of supabase/migrations/007_cron_job_history.sql')
    console.log('4. Execute the SQL')
    console.log('\nAlternatively, if you have Supabase CLI installed:')
    console.log('   supabase db push')

  } catch (err) {
    console.error('❌ Migration failed:', err.message)
  }
}

applyMigration007().catch(console.error)
