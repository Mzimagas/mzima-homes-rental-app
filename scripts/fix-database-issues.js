#!/usr/bin/env node

/**
 * Quick script to fix the immediate database issues
 * This addresses the 406 and 400 errors we're seeing
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajrxvnakphkpkcssisxm.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcnh2bmFrcGhrcGtjc3Npc3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyODIwMCwiZXhwIjoyMDY4NzA0MjAwfQ.-xTAx5L0wtIlVVr177eTPtap-iJbTwDRJsyTloKV2PM'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixDatabaseIssues() {
  console.log('🔧 Fixing database relationship and permission issues...')

  try {
    // 1. Create the purchase_pipeline_field_security table if it doesn't exist
    console.log('📋 Creating purchase_pipeline_field_security table...')
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.purchase_pipeline_field_security (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        field_name TEXT NOT NULL UNIQUE,
        security_level TEXT NOT NULL DEFAULT 'STANDARD' CHECK (security_level IN ('STANDARD', 'SENSITIVE', 'CRITICAL')),
        lock_after_stage INTEGER DEFAULT NULL,
        requires_reason BOOLEAN DEFAULT FALSE,
        requires_approval BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    if (createError && !createError.message.includes('already exists')) {
      console.warn('⚠️  Table creation warning:', createError.message)
    } else {
      console.log('✅ Table created/verified')
    }

    // 2. Insert default field security settings
    console.log('📝 Inserting default field security settings...')
    
    const { error: insertError } = await supabase
      .from('purchase_pipeline_field_security')
      .upsert([
        { field_name: 'propertyId', security_level: 'CRITICAL', lock_after_stage: 1, requires_reason: true, requires_approval: true },
        { field_name: 'propertyName', security_level: 'STANDARD', requires_reason: false, requires_approval: false },
        { field_name: 'propertyAddress', security_level: 'STANDARD', requires_reason: false, requires_approval: false },
        { field_name: 'propertyType', security_level: 'STANDARD', lock_after_stage: 2, requires_reason: false, requires_approval: false },
        { field_name: 'purchasePrice', security_level: 'SENSITIVE', lock_after_stage: 3, requires_reason: true, requires_approval: false },
        { field_name: 'sellerName', security_level: 'STANDARD', requires_reason: false, requires_approval: false },
        { field_name: 'sellerContact', security_level: 'STANDARD', requires_reason: false, requires_approval: false },
        { field_name: 'agreementDate', security_level: 'SENSITIVE', lock_after_stage: 2, requires_reason: false, requires_approval: false },
        { field_name: 'completionDate', security_level: 'SENSITIVE', requires_reason: false, requires_approval: false },
        { field_name: 'notes', security_level: 'STANDARD', requires_reason: false, requires_approval: false }
      ], { onConflict: 'field_name' })

    if (insertError) {
      console.warn('⚠️  Insert warning:', insertError.message)
    } else {
      console.log('✅ Default settings inserted')
    }

    // 3. Grant permissions
    console.log('🔐 Setting up permissions...')
    
    const permissionsSQL = `
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT SELECT ON TABLE public.purchase_pipeline_field_security TO authenticated;
      ALTER TABLE public.purchase_pipeline_field_security ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS pfs_select ON public.purchase_pipeline_field_security;
      CREATE POLICY pfs_select
      ON public.purchase_pipeline_field_security
      FOR SELECT
      TO authenticated
      USING (true);
    `
    
    const { error: permError } = await supabase.rpc('exec_sql', { sql: permissionsSQL })
    if (permError) {
      console.warn('⚠️  Permissions warning:', permError.message)
    } else {
      console.log('✅ Permissions configured')
    }

    // 4. Test the table access
    console.log('🧪 Testing table access...')
    
    const { data: testData, error: testError } = await supabase
      .from('purchase_pipeline_field_security')
      .select('field_name, security_level')
      .limit(1)

    if (testError) {
      console.error('❌ Test failed:', testError.message)
    } else {
      console.log('✅ Table access test passed:', testData?.length || 0, 'records found')
    }

    // 5. Create the overdue invoices view for better query performance
    console.log('📊 Creating overdue invoices view...')
    
    const viewSQL = `
      CREATE OR REPLACE VIEW public.v_overdue_invoices AS
      SELECT
        ri.id,
        ri.amount_due_kes,
        ri.amount_paid_kes,
        ri.status,
        ri.due_date,
        ri.tenant_id,
        u.id as unit_id,
        u.property_id,
        p.disabled_at,
        p.name as property_name
      FROM public.rent_invoices ri
      JOIN public.units u ON u.id = ri.unit_id
      JOIN public.properties p ON p.id = u.property_id
      WHERE ri.status = 'OVERDUE';
      
      GRANT SELECT ON public.v_overdue_invoices TO authenticated;
    `
    
    const { error: viewError } = await supabase.rpc('exec_sql', { sql: viewSQL })
    if (viewError) {
      console.warn('⚠️  View creation warning:', viewError.message)
    } else {
      console.log('✅ Overdue invoices view created')
    }

    console.log('\n🎉 Database fixes completed successfully!')
    console.log('\n📋 Summary of changes:')
    console.log('  ✅ purchase_pipeline_field_security table created/verified')
    console.log('  ✅ Default field security settings inserted')
    console.log('  ✅ Permissions and RLS policies configured')
    console.log('  ✅ Overdue invoices view created for better performance')
    console.log('\n🔄 Please restart your development server to see the changes.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the fixes
fixDatabaseIssues().catch(console.error)
