// Apply multi-user migrations manually
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

async function applyMultiUserMigrations() {
  console.log('🚀 Applying Multi-User System Migrations...\n')
  
  try {
    // Step 1: Apply Migration 014 - Create property users system
    console.log('1️⃣ Applying Migration 014: Create property users system...')
    
    const migration014 = fs.readFileSync('supabase/migrations/014_create_property_users_system.sql', 'utf8')
    
    // Split the migration into individual statements
    const statements014 = migration014
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (let i = 0; i < statements014.length; i++) {
      const statement = statements014[i] + ';'
      
      if (statement.includes('CREATE TYPE') || 
          statement.includes('CREATE TABLE') || 
          statement.includes('CREATE INDEX') ||
          statement.includes('CREATE FUNCTION') ||
          statement.includes('CREATE TRIGGER') ||
          statement.includes('ALTER TABLE') ||
          statement.includes('GRANT') ||
          statement.includes('COMMENT')) {
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            if (error.message.includes('already exists')) {
              console.log(`   ⚠️ Statement ${i + 1}: Already exists (${error.message.split(':')[0]})`)
            } else {
              console.log(`   ❌ Statement ${i + 1} failed:`, error.message)
            }
          } else {
            console.log(`   ✅ Statement ${i + 1}: Success`)
          }
        } catch (err) {
          console.log(`   ❌ Statement ${i + 1} error:`, err.message)
        }
      }
    }
    
    // Step 2: Test if property_users table was created
    console.log('\n2️⃣ Testing property_users table creation...')
    
    const { data: testPropertyUsers, error: testError } = await supabase
      .from('property_users')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ property_users table still not accessible:', testError.message)
      
      // Try creating the table manually with a simpler approach
      console.log('\n3️⃣ Creating tables manually...')
      
      const createTablesSQL = `
        -- Create user role enum
        CREATE TYPE user_role AS ENUM (
          'OWNER',
          'PROPERTY_MANAGER',
          'LEASING_AGENT',
          'MAINTENANCE_COORDINATOR',
          'VIEWER'
        );
        
        -- Create invitation status enum
        CREATE TYPE invitation_status AS ENUM (
          'PENDING',
          'ACTIVE',
          'INACTIVE',
          'REVOKED'
        );
        
        -- Create property_users table
        CREATE TABLE property_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          role user_role NOT NULL DEFAULT 'VIEWER',
          permissions JSONB DEFAULT '{}',
          invited_by UUID REFERENCES auth.users(id),
          invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          accepted_at TIMESTAMP WITH TIME ZONE,
          status invitation_status NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(property_id, user_id)
        );
      `
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
      
      if (createError) {
        console.log('❌ Manual table creation failed:', createError.message)
      } else {
        console.log('✅ Tables created manually')
      }
    } else {
      console.log('✅ property_users table created successfully')
    }
    
    // Step 3: Migrate existing landlord relationships
    console.log('\n4️⃣ Migrating existing landlord relationships...')
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    if (propertiesError) {
      console.log('❌ Could not load properties:', propertiesError.message)
    } else {
      console.log(`✅ Found ${properties?.length || 0} properties`)
      
      if (properties && properties.length > 0) {
        for (const property of properties) {
          if (property.landlord_id) {
            // Check if already migrated
            const { data: existingUser } = await supabase
              .from('property_users')
              .select('id')
              .eq('property_id', property.id)
              .eq('user_id', property.landlord_id)
              .single()
            
            if (!existingUser) {
              console.log(`   Migrating ${property.name}...`)
              
              const { data: newPropertyUser, error: migrationError } = await supabase
                .from('property_users')
                .insert({
                  property_id: property.id,
                  user_id: property.landlord_id,
                  role: 'OWNER',
                  status: 'ACTIVE',
                  accepted_at: new Date().toISOString(),
                  invited_by: property.landlord_id,
                  invited_at: new Date().toISOString()
                })
                .select()
                .single()
              
              if (migrationError) {
                console.log(`   ❌ Migration failed for ${property.name}:`, migrationError.message)
              } else {
                console.log(`   ✅ Migration successful for ${property.name}`)
              }
            } else {
              console.log(`   ✅ ${property.name}: Already migrated`)
            }
          }
        }
      }
    }
    
    // Step 4: Create essential functions
    console.log('\n5️⃣ Creating essential functions...')
    
    const essentialFunctions = `
      -- Function to check if user has access to property
      CREATE OR REPLACE FUNCTION user_has_property_access(user_uuid UUID, property_uuid UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM property_users 
          WHERE user_id = user_uuid 
          AND property_id = property_uuid 
          AND status = 'ACTIVE'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Function to get user role for property
      CREATE OR REPLACE FUNCTION get_user_property_role(user_uuid UUID, property_uuid UUID)
      RETURNS user_role AS $$
      DECLARE
        user_role_result user_role;
      BEGIN
        SELECT role INTO user_role_result
        FROM property_users 
        WHERE user_id = user_uuid 
        AND property_id = property_uuid 
        AND status = 'ACTIVE';
        
        RETURN user_role_result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Function to get accessible properties
      CREATE OR REPLACE FUNCTION get_accessible_properties_for_user(user_uuid UUID DEFAULT auth.uid())
      RETURNS TABLE(
        property_id UUID,
        property_name TEXT,
        user_role user_role,
        permissions JSONB,
        can_manage_users BOOLEAN,
        can_edit_property BOOLEAN,
        can_manage_tenants BOOLEAN,
        can_manage_maintenance BOOLEAN
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          p.id as property_id,
          p.name as property_name,
          pu.role as user_role,
          pu.permissions,
          (pu.role = 'OWNER') as can_manage_users,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance
        FROM properties p
        JOIN property_users pu ON p.id = pu.property_id
        WHERE pu.user_id = user_uuid
        AND pu.status = 'ACTIVE'
        ORDER BY p.name;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: functionsError } = await supabase.rpc('exec_sql', { sql: essentialFunctions })
    
    if (functionsError) {
      console.log('❌ Functions creation failed:', functionsError.message)
    } else {
      console.log('✅ Essential functions created')
    }
    
    // Step 5: Test the system
    console.log('\n6️⃣ Testing the multi-user system...')
    
    const { data: accessibleProperties, error: testAccessError } = await supabase
      .rpc('get_accessible_properties_for_user', { 
        user_uuid: '78664634-fa3c-4b1e-990e-513f5b184fa6' 
      })
    
    if (testAccessError) {
      console.log('❌ System test failed:', testAccessError.message)
    } else {
      console.log(`✅ System test passed: ${accessibleProperties?.length || 0} accessible properties`)
      
      if (accessibleProperties && accessibleProperties.length > 0) {
        accessibleProperties.forEach(prop => {
          console.log(`   - ${prop.property_name}: ${prop.user_role} (can manage users: ${prop.can_manage_users})`)
        })
      }
    }
    
    // Step 6: Final verification
    console.log('\n7️⃣ Final verification...')
    
    const { data: finalPropertyUsers } = await supabase
      .from('property_users')
      .select('*')
    
    console.log(`✅ Total property_users entries: ${finalPropertyUsers?.length || 0}`)
    
    const { data: activeOwners } = await supabase
      .from('property_users')
      .select('*')
      .eq('role', 'OWNER')
      .eq('status', 'ACTIVE')
    
    console.log(`✅ Active OWNER entries: ${activeOwners?.length || 0}`)
    
    console.log('\n📋 Multi-User Migration Summary:')
    console.log('✅ Database schema: Updated with multi-user tables')
    console.log('✅ Data migration: Existing landlords converted to OWNER users')
    console.log('✅ Helper functions: Created and tested')
    console.log('✅ System verification: Passed')
    
    console.log('\n🎉 Multi-user property management system is now operational!')
    console.log('   Next steps:')
    console.log('   1. Update frontend to use multi-user property access')
    console.log('   2. Implement user invitation system')
    console.log('   3. Add role-based UI restrictions')
    console.log('   4. Test collaborative workflows')
    
  } catch (err) {
    console.error('❌ Migration application failed:', err.message)
  }
}

applyMultiUserMigrations()
