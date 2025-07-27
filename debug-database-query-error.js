const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, serviceKey, anonKey
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
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      anonKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase clients
const supabaseAdmin = createClient(supabaseUrl, serviceKey)
const supabase = createClient(supabaseUrl, anonKey)

async function debugDatabaseQueryError() {
  console.log('🔍 Debugging Database Query Error...\n')

  try {
    // Step 1: Check database schema for all main tables
    console.log('1. Checking database schema...')
    
    const tables = ['properties', 'units', 'tenants', 'landlords', 'user_roles', 'rent_invoices', 'payments']
    
    for (const table of tables) {
      console.log(`\n📋 Checking ${table} table schema:`)
      
      try {
        const { data: columns, error: schemaError } = await supabaseAdmin
          .rpc('exec', { 
            sql: `
              SELECT column_name, data_type, is_nullable, column_default
              FROM information_schema.columns 
              WHERE table_name = '${table}' 
                AND table_schema = 'public'
              ORDER BY ordinal_position;
            `
          })
        
        if (schemaError) {
          console.log(`⚠️  Cannot check schema for ${table}: ${schemaError.message}`)
        } else if (columns && columns.length > 0) {
          console.log(`✅ ${table} table exists with ${columns.length} columns:`)
          columns.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`)
          })
        } else {
          console.log(`❌ ${table} table not found or has no columns`)
        }
      } catch (err) {
        console.log(`❌ Error checking ${table}: ${err.message}`)
      }
    }

    // Step 2: Test common queries that might be failing
    console.log('\n\n2. Testing common application queries...')
    
    // Sign in as test user first
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@mzimahomes.com',
      password: 'TestPassword123!'
    })

    if (signInError) {
      console.error('❌ Error signing in:', signInError.message)
      return
    }

    console.log('✅ Signed in as test user')

    // Test 1: Properties query (most likely to fail)
    console.log('\n🏠 Testing properties query...')
    try {
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          units (
            id,
            unit_label,
            monthly_rent_kes,
            is_active,
            tenants (
              id,
              full_name,
              status
            )
          )
        `)

      if (propertiesError) {
        console.error('❌ Properties query failed:', propertiesError.message)
        console.error('   Code:', propertiesError.code)
        console.error('   Details:', propertiesError.details)
        console.error('   Hint:', propertiesError.hint)
      } else {
        console.log(`✅ Properties query successful: Found ${properties?.length || 0} properties`)
      }
    } catch (err) {
      console.error('❌ Properties query exception:', err.message)
    }

    // Test 2: Tenants query
    console.log('\n👥 Testing tenants query...')
    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          *,
          units (
            *,
            properties (
              name,
              physical_address
            )
          )
        `)

      if (tenantsError) {
        console.error('❌ Tenants query failed:', tenantsError.message)
        console.error('   Code:', tenantsError.code)
        console.error('   Details:', tenantsError.details)
      } else {
        console.log(`✅ Tenants query successful: Found ${tenants?.length || 0} tenants`)
      }
    } catch (err) {
      console.error('❌ Tenants query exception:', err.message)
    }

    // Test 3: Units query
    console.log('\n🏢 Testing units query...')
    try {
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select(`
          *,
          properties (
            name,
            landlord_id
          ),
          tenants (
            id,
            full_name,
            status
          )
        `)

      if (unitsError) {
        console.error('❌ Units query failed:', unitsError.message)
        console.error('   Code:', unitsError.code)
        console.error('   Details:', unitsError.details)
      } else {
        console.log(`✅ Units query successful: Found ${units?.length || 0} units`)
      }
    } catch (err) {
      console.error('❌ Units query exception:', err.message)
    }

    // Test 4: Payments/Invoices query
    console.log('\n💰 Testing payments query...')
    try {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          tenants (
            full_name,
            units (
              unit_label,
              properties (
                name
              )
            )
          )
        `)

      if (paymentsError) {
        console.error('❌ Payments query failed:', paymentsError.message)
        console.error('   Code:', paymentsError.code)
        console.error('   Details:', paymentsError.details)
      } else {
        console.log(`✅ Payments query successful: Found ${payments?.length || 0} payments`)
      }
    } catch (err) {
      console.error('❌ Payments query exception:', err.message)
    }

    // Test 5: Rent invoices query
    console.log('\n📄 Testing rent invoices query...')
    try {
      const { data: invoices, error: invoicesError } = await supabase
        .from('rent_invoices')
        .select(`
          *,
          units (
            unit_label,
            properties (
              name
            )
          ),
          tenants (
            full_name
          )
        `)

      if (invoicesError) {
        console.error('❌ Rent invoices query failed:', invoicesError.message)
        console.error('   Code:', invoicesError.code)
        console.error('   Details:', invoicesError.details)
      } else {
        console.log(`✅ Rent invoices query successful: Found ${invoices?.length || 0} invoices`)
      }
    } catch (err) {
      console.error('❌ Rent invoices query exception:', err.message)
    }

    // Test 6: Check foreign key relationships
    console.log('\n\n3. Checking foreign key relationships...')
    try {
      const { data: fkConstraints, error: fkError } = await supabaseAdmin
        .rpc('exec', { 
          sql: `
            SELECT 
              tc.table_name, 
              kcu.column_name, 
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name 
            FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name;
          `
        })
      
      if (fkError) {
        console.log('⚠️  Cannot check foreign keys:', fkError.message)
      } else if (fkConstraints && fkConstraints.length > 0) {
        console.log('✅ Foreign key relationships:')
        fkConstraints.forEach(fk => {
          console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
        })
      }
    } catch (err) {
      console.log('❌ Error checking foreign keys:', err.message)
    }

    // Sign out
    await supabase.auth.signOut()

    console.log('\n🎯 Debugging completed!')
    console.log('\nLook for any ❌ errors above to identify the problematic query.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugDatabaseQueryError()
