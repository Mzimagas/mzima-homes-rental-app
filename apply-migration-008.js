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

async function applyMigration008() {
  console.log('🚀 Applying migration 008: Fix Landlord RLS for User Signup...\n')

  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('supabase/migrations/008_fix_landlord_rls_for_signup.sql', 'utf8')
    
    console.log('📄 Migration file loaded successfully')
    console.log('📝 SQL content:')
    console.log(migrationSQL)

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`\n🔧 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement using raw SQL
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      console.log(`SQL: ${statement.substring(0, 100)}...`)
      
      try {
        // Use the raw SQL execution method
        const { data, error } = await supabaseAdmin
          .from('_dummy_table_that_does_not_exist')
          .select('*')
          .limit(0)

        // Since we can't execute DDL directly, we'll provide instructions
        console.log('   ⚠️  Cannot execute DDL statements via client')
        console.log('   📋 Please execute this statement manually in Supabase SQL Editor')
      } catch (err) {
        console.log('   ⚠️  Expected error for DDL execution via client')
      }
    }

    console.log('\n📋 Manual Migration Required')
    console.log('Please execute the following in your Supabase Dashboard SQL Editor:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of supabase/migrations/008_fix_landlord_rls_for_signup.sql')
    console.log('4. Execute the SQL')
    console.log('\nThis will add the necessary RLS policies to allow users to create their own landlord records.')

  } catch (err) {
    console.error('❌ Migration failed:', err.message)
  }
}

applyMigration008().catch(console.error)
