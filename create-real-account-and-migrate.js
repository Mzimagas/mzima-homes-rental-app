// Create a real account and migrate existing data from mock landlord
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

async function createRealAccountAndMigrate() {
  console.log('👤 Creating Real Account and Migrating Data...\n')
  
  try {
    const mockLandlordId = '78664634-fa3c-4b1e-990e-513f5b184fa6'
    
    // Step 1: Create a real user account
    console.log('1️⃣ Creating real user account...')
    
    const userEmail = 'landlord@mzimahomes.com'
    const userPassword = 'MzimaHomes2024!'
    
    console.log(`   Email: ${userEmail}`)
    console.log(`   Password: ${userPassword}`)
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: 'Mzima Homes Landlord',
        role: 'landlord'
      }
    })
    
    if (createError) {
      if (createError.message.includes('already registered')) {
        console.log('⚠️ User already exists, getting existing user...')
        
        // Get existing user
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
        
        if (listError) {
          console.log('❌ Could not list users:', listError.message)
          return
        }
        
        const existingUser = existingUsers.users.find(u => u.email === userEmail)
        
        if (existingUser) {
          console.log(`✅ Found existing user: ${existingUser.id}`)
          newUser = { user: existingUser }
        } else {
          console.log('❌ User exists but could not find in list')
          return
        }
      } else {
        console.log('❌ Error creating user:', createError.message)
        return
      }
    } else {
      console.log(`✅ User created successfully: ${newUser.user.id}`)
    }
    
    const realUserId = newUser.user.id
    
    // Step 2: Check what data exists for the mock landlord
    console.log('\n2️⃣ Checking existing data for mock landlord...')
    
    // Check properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .eq('landlord_id', mockLandlordId)
    
    if (propertiesError) {
      console.log('❌ Error loading properties:', propertiesError.message)
      return
    }
    
    console.log(`✅ Found ${properties?.length || 0} properties for mock landlord`)
    
    if (properties && properties.length > 0) {
      properties.forEach(prop => {
        console.log(`   - ${prop.name} (${prop.id})`)
      })
    }
    
    // Check landlords table
    const { data: landlordRecord, error: landlordError } = await supabase
      .from('landlords')
      .select('*')
      .eq('id', mockLandlordId)
      .single()
    
    if (landlordError) {
      console.log('⚠️ No landlord record found (this is okay)')
    } else {
      console.log('✅ Found landlord record:', landlordRecord.full_name)
    }
    
    // Step 3: Create/update landlord record for real user
    console.log('\n3️⃣ Creating landlord record for real user...')
    
    const landlordData = {
      id: realUserId,
      full_name: 'Mzima Homes Landlord',
      email: userEmail,
      phone: '+254700000000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: newLandlordRecord, error: newLandlordError } = await supabase
      .from('landlords')
      .upsert(landlordData)
      .select()
      .single()
    
    if (newLandlordError) {
      console.log('❌ Error creating landlord record:', newLandlordError.message)
    } else {
      console.log('✅ Landlord record created/updated')
    }
    
    // Step 4: Migrate properties to real user
    console.log('\n4️⃣ Migrating properties to real user...')
    
    if (properties && properties.length > 0) {
      for (const property of properties) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({ landlord_id: realUserId })
          .eq('id', property.id)
        
        if (updateError) {
          console.log(`❌ Error updating property ${property.name}:`, updateError.message)
        } else {
          console.log(`✅ Migrated property: ${property.name}`)
        }
      }
    }
    
    // Step 5: Apply the multi-user system with real user
    console.log('\n5️⃣ Applying multi-user system...')
    
    // Create the multi-user tables (this time with proper foreign keys)
    const multiUserSQL = `
      -- Create user role enum
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM (
          'OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT', 'MAINTENANCE_COORDINATOR', 'VIEWER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Create invitation status enum
      DO $$ BEGIN
        CREATE TYPE invitation_status AS ENUM (
          'PENDING', 'ACTIVE', 'INACTIVE', 'REVOKED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Create property_users table
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
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_property_users_property_id ON property_users(property_id);
      CREATE INDEX IF NOT EXISTS idx_property_users_user_id ON property_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_property_users_status ON property_users(status);
      
      -- Create user_invitations table
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
      
      -- Create essential functions
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
      
      CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
      RETURNS TABLE(
        property_id UUID,
        property_name TEXT,
        user_role user_role,
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
      
      -- Enable RLS
      ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies
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
      
      -- Grant permissions
      GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;
    `
    
    // Write SQL to file for manual execution
    fs.writeFileSync('MULTIUSER_SYSTEM_WITH_REAL_USER.sql', multiUserSQL)
    console.log('✅ Multi-user SQL written to MULTIUSER_SYSTEM_WITH_REAL_USER.sql')
    
    // Step 6: Create property_users entries for the real user
    console.log('\n6️⃣ Creating property_users entries...')
    
    console.log('   After running the SQL file, execute this to create OWNER entries:')
    console.log('')
    console.log('   INSERT INTO property_users (property_id, user_id, role, status, accepted_at, invited_by, invited_at)')
    console.log('   SELECT')
    console.log('     p.id as property_id,')
    console.log(`     '${realUserId}' as user_id,`)
    console.log("     'OWNER' as role,")
    console.log("     'ACTIVE' as status,")
    console.log('     NOW() as accepted_at,')
    console.log(`     '${realUserId}' as invited_by,`)
    console.log('     NOW() as invited_at')
    console.log('   FROM properties p')
    console.log(`   WHERE p.landlord_id = '${realUserId}'`)
    console.log('   ON CONFLICT (property_id, user_id) DO NOTHING;')
    console.log('')
    
    // Step 7: Update frontend configuration
    console.log('7️⃣ Updating frontend configuration...')
    
    // Update the mock landlord ID in the tenant form
    const tenantFormPath = 'src/components/tenants/tenant-form.tsx'
    
    try {
      let tenantFormContent = fs.readFileSync(tenantFormPath, 'utf8')
      
      // Replace the mock landlord ID with the real user ID
      const oldMockId = '78664634-fa3c-4b1e-990e-513f5b184fa6'
      tenantFormContent = tenantFormContent.replace(
        new RegExp(oldMockId, 'g'),
        realUserId
      )
      
      fs.writeFileSync(tenantFormPath, tenantFormContent)
      console.log('✅ Updated tenant form with real user ID')
    } catch (err) {
      console.log('⚠️ Could not update tenant form automatically:', err.message)
      console.log(`   Please manually replace ${mockLandlordId} with ${realUserId} in the code`)
    }
    
    // Step 8: Provide login instructions
    console.log('\n8️⃣ Login instructions...')
    
    console.log('✅ Real account created successfully!')
    console.log('')
    console.log('🔑 LOGIN CREDENTIALS:')
    console.log(`   Email: ${userEmail}`)
    console.log(`   Password: ${userPassword}`)
    console.log(`   User ID: ${realUserId}`)
    console.log('')
    console.log('📋 NEXT STEPS:')
    console.log('1. Run MULTIUSER_SYSTEM_WITH_REAL_USER.sql in Supabase SQL Editor')
    console.log('2. Execute the INSERT statement above to create OWNER entries')
    console.log('3. Login to the app with the credentials above')
    console.log('4. Test the multi-user property management features')
    console.log('5. Invite additional users to test collaborative workflows')
    console.log('')
    console.log('🎉 You now have a real authenticated user account!')
    console.log('   This account owns all the existing properties and can:')
    console.log('   - Manage all properties as OWNER')
    console.log('   - Invite other users with different roles')
    console.log('   - Use all multi-user features')
    console.log('   - Access the property management dashboard')
    
  } catch (err) {
    console.error('❌ Account creation failed:', err.message)
  }
}

createRealAccountAndMigrate()
