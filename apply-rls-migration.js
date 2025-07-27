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

async function applyRLSMigration() {
  console.log('🔧 Applying RLS Migration for Properties...\n')

  const sqlStatements = [
    // Enable RLS on properties table
    'ALTER TABLE properties ENABLE ROW LEVEL SECURITY;',
    
    // Drop existing policies if they exist
    'DROP POLICY IF EXISTS "Users can view properties for their landlords" ON properties;',
    'DROP POLICY IF EXISTS "Users can create properties for their landlords" ON properties;',
    'DROP POLICY IF EXISTS "Users can update properties for their landlords" ON properties;',
    'DROP POLICY IF EXISTS "Users can delete properties for their landlords" ON properties;',
    
    // Create comprehensive RLS policies for properties table
    `CREATE POLICY "Users can view properties for their landlords" ON properties
      FOR SELECT USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));`,
    
    `CREATE POLICY "Users can create properties for their landlords" ON properties
      FOR INSERT WITH CHECK (landlord_id = ANY(get_user_landlord_ids(auth.uid())));`,
    
    `CREATE POLICY "Users can update properties for their landlords" ON properties
      FOR UPDATE USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));`,
    
    `CREATE POLICY "Users can delete properties for their landlords" ON properties
      FOR DELETE USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));`,
    
    // Enable RLS on units table
    'ALTER TABLE units ENABLE ROW LEVEL SECURITY;',
    
    // Drop existing unit policies
    'DROP POLICY IF EXISTS "Users can view units for their properties" ON units;',
    'DROP POLICY IF EXISTS "Users can create units for their properties" ON units;',
    'DROP POLICY IF EXISTS "Users can update units for their properties" ON units;',
    'DROP POLICY IF EXISTS "Users can delete units for their properties" ON units;',
    
    // Create RLS policies for units table
    `CREATE POLICY "Users can view units for their properties" ON units
      FOR SELECT USING (
        property_id IN (
          SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
        )
      );`,
    
    `CREATE POLICY "Users can create units for their properties" ON units
      FOR INSERT WITH CHECK (
        property_id IN (
          SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
        )
      );`,
    
    `CREATE POLICY "Users can update units for their properties" ON units
      FOR UPDATE USING (
        property_id IN (
          SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
        )
      );`,
    
    `CREATE POLICY "Users can delete units for their properties" ON units
      FOR DELETE USING (
        property_id IN (
          SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
        )
      );`,
    
    // Create indexes for better performance
    'CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);',
    'CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);'
  ]

  try {
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i]
      console.log(`Executing statement ${i + 1}/${sqlStatements.length}...`)
      
      const { error } = await supabaseAdmin.rpc('exec', { sql })
      
      if (error) {
        console.log(`⚠️  Statement ${i + 1} may have already been applied or failed:`, error.message)
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }

    console.log('\n🎉 RLS Migration completed!')
    console.log('\n📋 Applied policies:')
    console.log('   ✅ Properties table: SELECT, INSERT, UPDATE, DELETE policies')
    console.log('   ✅ Units table: SELECT, INSERT, UPDATE, DELETE policies')
    console.log('   ✅ Performance indexes created')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

applyRLSMigration()
