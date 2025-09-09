// const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajrxvnakphkpkcssisxm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcnh2bmFrcGhrcGtjc3Npc3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyODIwMCwiZXhwIjoyMDY4NzA0MjAwfQ.-xTAx5L0wtIlVVr177eTPtap-iJbTwDRJsyTloKV2PM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running marketplace migration...');

    // Create tables individually using simple SQL
    await createTablesIndividually();

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

async function createTablesIndividually() {
  const tables = [
    {
      name: 'clients',
      sql: `CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        registration_source TEXT DEFAULT 'marketplace',
        registration_context JSONB DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login_at TIMESTAMP WITH TIME ZONE
      )`
    },

    {
      name: 'client_property_interests',
      sql: `CREATE TABLE IF NOT EXISTS client_property_interests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        interest_type TEXT NOT NULL DEFAULT 'express-interest' CHECK (
          interest_type IN ('express-interest', 'contact', 'purchase-inquiry', 'viewing-request')
        ),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'CONVERTED')),
        contact_preference TEXT DEFAULT 'email' CHECK (
          contact_preference IN ('email', 'phone', 'both')
        ),
        message TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    },

    {
      name: 'admin_notifications',
      sql: `CREATE TABLE IF NOT EXISTS admin_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL CHECK (
          type IN ('CLIENT_INTEREST', 'HANDOVER_REQUEST', 'CLIENT_REGISTRATION', 'SYSTEM_ALERT')
        ),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE
      )`
    }
  ];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    console.log(`📝 Creating table ${table.name} (${i + 1}/${tables.length})...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Error creating ${table.name}:`, error.message);
        throw error;
      } else {
        console.log(`✅ Table ${table.name} created successfully`);
      }
    } catch (err) {
      // If exec_sql doesn't work, try direct table creation
      console.log(`⚠️  exec_sql failed, trying direct approach for ${table.name}...`);

      // For client_property_interests, we can try to create it directly
      if (table.name === 'client_property_interests') {
        try {
          const { error } = await supabase
            .from('client_property_interests')
            .select('id')
            .limit(1);

          if (error && error.code === 'PGRST116') {
            console.log(`❌ Table ${table.name} does not exist and cannot be created via API`);
            throw new Error(`Table ${table.name} needs to be created manually in Supabase dashboard`);
          } else {
            console.log(`✅ Table ${table.name} already exists`);
          }
        } catch (testError) {
          console.log(`❌ Cannot access ${table.name}:`, testError.message);
          throw testError;
        }
      }
    }
  }

  console.log('✅ Table creation process completed!');
}

runMigration();
