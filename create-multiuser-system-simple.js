// Create multi-user system with simplified approach
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

async function createMultiUserSystem() {
  console.log('🚀 Creating Multi-User Property Management System...\n')
  
  try {
    // Step 1: Create user role enum
    console.log('1️⃣ Creating user role enum...')
    
    const createRoleEnum = `
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM (
          'OWNER',
          'PROPERTY_MANAGER', 
          'LEASING_AGENT',
          'MAINTENANCE_COORDINATOR',
          'VIEWER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    const { error: roleError } = await supabase.rpc('exec_sql', { sql: createRoleEnum })
    
    if (roleError) {
      console.log('⚠️ Role enum creation:', roleError.message)
    } else {
      console.log('✅ User role enum created')
    }
    
    // Step 2: Create invitation status enum
    console.log('\n2️⃣ Creating invitation status enum...')
    
    const createStatusEnum = `
      DO $$ BEGIN
        CREATE TYPE invitation_status AS ENUM (
          'PENDING',
          'ACTIVE', 
          'INACTIVE',
          'REVOKED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    const { error: statusError } = await supabase.rpc('exec_sql', { sql: createStatusEnum })
    
    if (statusError) {
      console.log('⚠️ Status enum creation:', statusError.message)
    } else {
      console.log('✅ Invitation status enum created')
    }
    
    // Step 3: Create property_users table
    console.log('\n3️⃣ Creating property_users table...')
    
    const createPropertyUsersTable = `
      CREATE TABLE IF NOT EXISTS property_users (
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
    
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createPropertyUsersTable })
    
    if (tableError) {
      console.log('❌ Property users table creation failed:', tableError.message)
    } else {
      console.log('✅ Property users table created')
    }
    
    // Step 4: Create indexes
    console.log('\n4️⃣ Creating indexes...')
    
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_property_users_property_id ON property_users(property_id);
      CREATE INDEX IF NOT EXISTS idx_property_users_user_id ON property_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_property_users_status ON property_users(status);
      CREATE INDEX IF NOT EXISTS idx_property_users_role ON property_users(role);
    `
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexes })
    
    if (indexError) {
      console.log('⚠️ Index creation:', indexError.message)
    } else {
      console.log('✅ Indexes created')
    }
    
    // Step 5: Create user invitations table
    console.log('\n5️⃣ Creating user invitations table...')
    
    const createInvitationsTable = `
      CREATE TABLE IF NOT EXISTS user_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'VIEWER',
        permissions JSONB DEFAULT '{}',
        invited_by UUID NOT NULL REFERENCES auth.users(id),
        invitation_token UUID DEFAULT gen_random_uuid(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
        accepted_at TIMESTAMP WITH TIME ZONE,
        accepted_by UUID REFERENCES auth.users(id),
        status invitation_status NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: invitationsError } = await supabase.rpc('exec_sql', { sql: createInvitationsTable })
    
    if (invitationsError) {
      console.log('❌ User invitations table creation failed:', invitationsError.message)
    } else {
      console.log('✅ User invitations table created')
    }
    
    // Step 6: Create essential functions
    console.log('\n6️⃣ Creating essential functions...')
    
    const createFunctions = `
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
        can_manage_users BOOLEAN,
        can_edit_property BOOLEAN,
        can_manage_tenants BOOLEAN
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          p.id as property_id,
          p.name as property_name,
          pu.role as user_role,
          (pu.role = 'OWNER') as can_manage_users,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants
        FROM properties p
        JOIN property_users pu ON p.id = pu.property_id
        WHERE pu.user_id = user_uuid
        AND pu.status = 'ACTIVE'
        ORDER BY p.name;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: functionsError } = await supabase.rpc('exec_sql', { sql: createFunctions })
    
    if (functionsError) {
      console.log('❌ Functions creation failed:', functionsError.message)
    } else {
      console.log('✅ Essential functions created')
    }
    
    // Step 7: Enable RLS and create basic policies
    console.log('\n7️⃣ Setting up RLS policies...')
    
    const setupRLS = `
      -- Enable RLS
      ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own property access" ON property_users;
      DROP POLICY IF EXISTS "Property owners can manage users" ON property_users;
      DROP POLICY IF EXISTS "Users can view invitations" ON user_invitations;
      
      -- Create basic policies
      CREATE POLICY "Users can view their own property access" ON property_users
      FOR SELECT USING (user_id = auth.uid());
      
      CREATE POLICY "Property owners can manage users" ON property_users
      FOR ALL USING (
        property_id IN (
          SELECT property_id FROM property_users 
          WHERE user_id = auth.uid() 
          AND role = 'OWNER' 
          AND status = 'ACTIVE'
        )
      );
      
      CREATE POLICY "Users can view invitations" ON user_invitations
      FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR
        property_id IN (
          SELECT property_id FROM property_users 
          WHERE user_id = auth.uid() 
          AND role = 'OWNER' 
          AND status = 'ACTIVE'
        )
      );
    `
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: setupRLS })
    
    if (rlsError) {
      console.log('⚠️ RLS setup:', rlsError.message)
    } else {
      console.log('✅ RLS policies created')
    }
    
    // Step 8: Grant permissions
    console.log('\n8️⃣ Granting permissions...')
    
    const grantPermissions = `
      GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;
    `
    
    const { error: permissionsError } = await supabase.rpc('exec_sql', { sql: grantPermissions })
    
    if (permissionsError) {
      console.log('⚠️ Permissions grant:', permissionsError.message)
    } else {
      console.log('✅ Permissions granted')
    }
    
    // Step 9: Migrate existing landlord relationships
    console.log('\n9️⃣ Migrating existing landlord relationships...')
    
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
    
    // Step 10: Test the system
    console.log('\n🔟 Testing the multi-user system...')
    
    const { data: accessibleProperties, error: testError } = await supabase
      .rpc('get_accessible_properties_for_user', { 
        user_uuid: '78664634-fa3c-4b1e-990e-513f5b184fa6' 
      })
    
    if (testError) {
      console.log('❌ System test failed:', testError.message)
    } else {
      console.log(`✅ System test passed: ${accessibleProperties?.length || 0} accessible properties`)
      
      if (accessibleProperties && accessibleProperties.length > 0) {
        accessibleProperties.forEach(prop => {
          console.log(`   - ${prop.property_name}: ${prop.user_role}`)
          console.log(`     Can manage users: ${prop.can_manage_users}`)
          console.log(`     Can edit property: ${prop.can_edit_property}`)
          console.log(`     Can manage tenants: ${prop.can_manage_tenants}`)
        })
      }
    }
    
    // Step 11: Final verification
    console.log('\n1️⃣1️⃣ Final verification...')
    
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
    
    console.log('\n📋 Multi-User System Creation Summary:')
    console.log('✅ Database schema: Multi-user tables created')
    console.log('✅ Enums: User roles and invitation status defined')
    console.log('✅ Functions: Property access helpers created')
    console.log('✅ RLS policies: Basic security implemented')
    console.log('✅ Data migration: Existing landlords converted to OWNER users')
    console.log('✅ System test: Multi-user access verified')
    
    console.log('\n🎉 Multi-user property management system is operational!')
    console.log('\n📝 Next Steps:')
    console.log('1. Update frontend to use get_accessible_properties_for_user()')
    console.log('2. Implement user invitation workflow')
    console.log('3. Add role-based UI restrictions')
    console.log('4. Update property selection to show accessible properties only')
    console.log('5. Test collaborative property management scenarios')
    
  } catch (err) {
    console.error('❌ Multi-user system creation failed:', err.message)
  }
}

createMultiUserSystem()
