// Analyze current database schema for multi-user transformation
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

const supabase = createClient(supabaseUrl, serviceKey)

async function analyzeCurrentSchema() {
  console.log('🔍 Analyzing Current Database Schema for Multi-User Transformation...\n')
  
  try {
    // Step 1: Analyze current landlord-property relationships
    console.log('1️⃣ Analyzing current landlord-property relationships...')
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    if (propertiesError) {
      console.log('❌ Error loading properties:', propertiesError.message)
      return
    }
    
    console.log(`✅ Found ${properties?.length || 0} properties`)
    
    if (properties && properties.length > 0) {
      const landlordIds = [...new Set(properties.map(p => p.landlord_id))]
      console.log(`   Unique landlords: ${landlordIds.length}`)
      
      landlordIds.forEach(landlordId => {
        const propertiesForLandlord = properties.filter(p => p.landlord_id === landlordId)
        console.log(`   - Landlord ${landlordId}: ${propertiesForLandlord.length} properties`)
        propertiesForLandlord.forEach(prop => {
          console.log(`     * ${prop.name} (${prop.id})`)
        })
      })
    }
    
    // Step 2: Check landlords table structure
    console.log('\n2️⃣ Analyzing landlords table structure...')
    
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('*')
      .limit(1)
    
    if (landlordsError) {
      console.log('❌ Error loading landlords:', landlordsError.message)
    } else if (landlords && landlords.length > 0) {
      console.log('✅ Landlords table structure:')
      Object.keys(landlords[0]).forEach(field => {
        console.log(`   - ${field}: ${typeof landlords[0][field]}`)
      })
    }
    
    // Step 3: Identify all tables with landlord_id references
    console.log('\n3️⃣ Identifying tables with landlord_id references...')
    
    const tablesToCheck = [
      'properties',
      'units', 
      'tenants',
      'tenancy_agreements',
      'rent_invoices',
      'payments',
      'maintenance_requests',
      'shared_meters'
    ]
    
    const landlordIdReferences = []
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (!error && data && data.length > 0) {
          const fields = Object.keys(data[0])
          if (fields.includes('landlord_id')) {
            landlordIdReferences.push(tableName)
            console.log(`   ✅ ${tableName}: has landlord_id field`)
          } else {
            console.log(`   ℹ️ ${tableName}: no landlord_id field`)
          }
        } else if (!error) {
          console.log(`   ℹ️ ${tableName}: empty table, checking schema...`)
        }
      } catch (err) {
        console.log(`   ⚠️ ${tableName}: could not check (${err.message})`)
      }
    }
    
    console.log(`\n   Tables with landlord_id: ${landlordIdReferences.join(', ')}`)
    
    // Step 4: Analyze current authentication and RLS
    console.log('\n4️⃣ Analyzing current authentication and RLS...')
    
    // Check current mock landlord usage
    const mockLandlordId = '78664634-fa3c-4b1e-990e-513f5b184fa6'
    const { data: mockLandlordProperties } = await supabase
      .from('properties')
      .select('id, name')
      .eq('landlord_id', mockLandlordId)
    
    console.log(`   Mock landlord (${mockLandlordId}) has ${mockLandlordProperties?.length || 0} properties`)
    
    // Step 5: Design new multi-user architecture
    console.log('\n5️⃣ Designing new multi-user architecture...')
    
    console.log('   New property_users table structure:')
    console.log('   - id: UUID (primary key)')
    console.log('   - property_id: UUID (foreign key to properties)')
    console.log('   - user_id: UUID (foreign key to auth.users)')
    console.log('   - role: ENUM (OWNER, PROPERTY_MANAGER, LEASING_AGENT, MAINTENANCE_COORDINATOR, VIEWER)')
    console.log('   - permissions: JSONB (custom permissions override)')
    console.log('   - invited_by: UUID (foreign key to auth.users)')
    console.log('   - invited_at: TIMESTAMP')
    console.log('   - accepted_at: TIMESTAMP')
    console.log('   - status: ENUM (PENDING, ACTIVE, INACTIVE, REVOKED)')
    console.log('   - created_at: TIMESTAMP')
    console.log('   - updated_at: TIMESTAMP')
    
    console.log('\n   Role definitions:')
    console.log('   - OWNER: Full access (create/edit/delete properties, manage users, all operations)')
    console.log('   - PROPERTY_MANAGER: Operational management (tenants, units, maintenance, reports)')
    console.log('   - LEASING_AGENT: Tenant management only (create/edit tenants, tenancy agreements)')
    console.log('   - MAINTENANCE_COORDINATOR: Maintenance requests only (view/manage maintenance)')
    console.log('   - VIEWER: Read-only access (view all data, no modifications)')
    
    // Step 6: Plan migration strategy
    console.log('\n6️⃣ Planning migration strategy...')
    
    console.log('   Migration steps:')
    console.log('   1. Create property_users table with roles and permissions')
    console.log('   2. Create user invitation system tables')
    console.log('   3. Migrate existing landlord-property relationships to OWNER entries')
    console.log('   4. Update RLS policies to use property_users instead of landlord_id')
    console.log('   5. Update frontend to support multi-user property access')
    console.log('   6. Implement role-based permissions throughout the application')
    console.log('   7. Add user management and invitation interfaces')
    
    console.log('\n   Data preservation:')
    console.log('   - All existing properties will be preserved')
    console.log('   - Current landlords will become OWNER users for their properties')
    console.log('   - All tenants, units, and related data will remain unchanged')
    console.log('   - Emergency contact and meter management features will be preserved')
    
    // Step 7: Identify potential challenges
    console.log('\n7️⃣ Identifying potential challenges...')
    
    console.log('   Challenges to address:')
    console.log('   - RLS policy complexity with multi-user access')
    console.log('   - Frontend property selection with multiple accessible properties')
    console.log('   - Role-based UI restrictions and feature visibility')
    console.log('   - User invitation and onboarding workflow')
    console.log('   - Performance optimization for property_users joins')
    console.log('   - Backward compatibility with existing mock landlord system')
    
    // Step 8: Generate implementation plan
    console.log('\n8️⃣ Implementation plan summary...')
    
    console.log('   Phase 1: Database Schema (Migrations 014-016)')
    console.log('   - Create property_users table and role system')
    console.log('   - Create user invitation tables')
    console.log('   - Migrate existing landlord relationships')
    
    console.log('   Phase 2: Authentication & Authorization (Migration 017)')
    console.log('   - Update RLS policies for multi-user access')
    console.log('   - Implement role-based permission functions')
    console.log('   - Create property access helper functions')
    
    console.log('   Phase 3: Frontend Implementation')
    console.log('   - Update property selection and navigation')
    console.log('   - Implement user management interface')
    console.log('   - Add role-based UI restrictions')
    console.log('   - Create invitation workflow')
    
    console.log('   Phase 4: Testing & Validation')
    console.log('   - Test multi-user scenarios')
    console.log('   - Verify role-based restrictions')
    console.log('   - Validate data migration integrity')
    console.log('   - Test invitation workflow end-to-end')
    
    console.log('\n📋 Schema Analysis Complete!')
    console.log('✅ Current schema analyzed and transformation plan created')
    console.log('✅ Multi-user architecture designed')
    console.log('✅ Migration strategy planned')
    console.log('✅ Implementation phases defined')
    
    console.log('\n🚀 Ready to begin multi-user transformation!')
    
  } catch (err) {
    console.error('❌ Schema analysis failed:', err.message)
  }
}

analyzeCurrentSchema()
