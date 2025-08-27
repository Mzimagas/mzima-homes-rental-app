#!/usr/bin/env node

/**
 * Aggressive Table Discovery Script
 * Uses multiple methods to discover ALL tables in the database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function tryDirectPostgresQuery() {
  console.log('🔍 Method 1: Direct PostgreSQL system catalog query...')

  try {
    // Try to use a more direct approach via Supabase's REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: `
          SELECT
            table_name,
            table_schema,
            table_type
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Found ${data.length} tables via direct query`)
      return data.map(row => row.table_name)
    } else {
      console.log(`   ❌ Direct query failed: ${response.status}`)
      return null
    }
  } catch (error) {
    console.log(`   ❌ Direct query error: ${error.message}`)
    return null
  }
}

async function trySupabaseInformationSchema() {
  console.log('🔍 Method 2: Supabase information_schema query...')

  try {
    // Try to query information_schema directly through Supabase
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (!error && data) {
      console.log(`   ✅ Found ${data.length} tables via information_schema`)
      return data.map(row => row.table_name)
    } else {
      console.log(`   ❌ Information schema query failed: ${error?.message}`)
      return null
    }
  } catch (error) {
    console.log(`   ❌ Information schema error: ${error.message}`)
    return null
  }
}

async function trySupabaseMetadata() {
  console.log('🔍 Method 3: Supabase metadata API...')

  try {
    // Try to get table metadata from Supabase's metadata endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.definitions) {
        const tableNames = Object.keys(data.definitions)
        console.log(`   ✅ Found ${tableNames.length} tables via metadata API`)
        return tableNames
      }
    }

    console.log(`   ❌ Metadata API failed or no definitions found`)
    return null
  } catch (error) {
    console.log(`   ❌ Metadata API error: ${error.message}`)
    return null
  }
}

async function tryBruteForceDiscovery() {
  console.log('🔍 Method 4: Brute force table discovery...')

  // Comprehensive list of potential table names based on common patterns
  const potentialTables = [
    // Core rental management
    'properties', 'units', 'tenants', 'tenancy_agreements', 'rent_invoices', 'payments',
    'property_users', 'landlords', 'notifications', 'user_invitations', 'profiles',

    // Land/sales management
    'parcels', 'subdivisions', 'plots', 'clients', 'listings', 'sale_agreements',
    'land_parcels', 'land_subdivisions', 'property_listings', 'sales_clients',

    // User management
    'users', 'user_profiles', 'enhanced_users', 'user_roles', 'roles', 'permissions',
    'user_permissions', 'role_permissions', 'auth_users', 'user_sessions',

    // Document management
    'documents', 'document_versions', 'document_types', 'file_uploads', 'attachments',
    'media', 'images', 'property_media', 'property_images', 'document_storage',

    // Maintenance
    'maintenance_requests', 'work_orders', 'service_requests', 'repairs', 'inspections',
    'maintenance_schedules', 'vendors', 'contractors', 'maintenance_types',

    // Financial
    'invoices', 'expenses', 'transactions', 'accounts', 'budgets', 'financial_reports',
    'payment_methods', 'bank_accounts', 'accounting_entries', 'tax_records',

    // Property features
    'amenities', 'property_amenities', 'features', 'property_features', 'room_types',
    'floor_plans', 'property_types', 'unit_types', 'building_types',

    // Utilities
    'utility_providers', 'utility_accounts', 'utility_readings', 'utility_bills',
    'meter_readings', 'utility_types', 'service_connections',

    // Leasing
    'leases', 'lease_agreements', 'lease_terms', 'rental_applications', 'applications',
    'application_status', 'background_checks', 'credit_reports', 'references',

    // Communication
    'messages', 'emails', 'sms', 'notifications', 'communication_logs', 'templates',
    'email_templates', 'notification_settings', 'communication_preferences',

    // Calendar/scheduling
    'calendar_events', 'appointments', 'tours', 'showings', 'schedules',
    'availability', 'booking_slots', 'time_slots',

    // Marketing
    'marketing_campaigns', 'leads', 'prospects', 'inquiries', 'website_leads',
    'marketing_sources', 'campaigns', 'advertisements',

    // Insurance
    'insurance_policies', 'insurance_claims', 'insurance_providers', 'coverage_types',
    'policy_documents', 'claim_documents',

    // Legal
    'contracts', 'legal_documents', 'compliance_records', 'regulations',
    'legal_cases', 'court_records',

    // Reporting
    'reports', 'report_templates', 'dashboards', 'analytics', 'metrics',
    'performance_indicators', 'statistics',

    // Settings
    'settings', 'configurations', 'preferences', 'system_settings', 'app_settings',
    'user_preferences', 'notification_preferences',

    // Audit/logging
    'audit_logs', 'activity_logs', 'system_logs', 'error_logs', 'access_logs',
    'change_logs', 'history_logs', 'event_logs',

    // Geographic
    'addresses', 'locations', 'coordinates', 'neighborhoods', 'cities', 'states',
    'countries', 'postal_codes', 'geographic_regions',

    // Emergency
    'emergency_contacts', 'emergency_procedures', 'safety_records', 'incident_reports',

    // Inventory
    'inventory', 'assets', 'equipment', 'furniture', 'appliances', 'fixtures',
    'inventory_items', 'asset_tracking',

    // Keys/access
    'keys', 'access_codes', 'security_systems', 'access_logs', 'key_assignments',
    'lock_codes', 'entry_systems',

    // Deposits
    'security_deposits', 'pet_deposits', 'deposit_tracking', 'refunds',
    'deposit_history', 'escrow_accounts',

    // Fees
    'late_fees', 'penalties', 'charges', 'fee_schedules', 'fee_types',
    'additional_charges', 'service_fees',

    // Discounts/promotions
    'discounts', 'promotions', 'coupons', 'special_offers', 'pricing_rules',
    'promotional_campaigns',

    // Move in/out
    'move_in_checklist', 'move_out_checklist', 'condition_reports', 'walkthrough_reports',
    'damage_assessments', 'cleaning_records',

    // Staff/team
    'staff', 'employees', 'team_members', 'property_managers', 'agents',
    'staff_roles', 'employee_records', 'staff_schedules'
  ]

  const discoveredTables = []
  let checkedCount = 0

  console.log(`   🔍 Checking ${potentialTables.length} potential table names...`)

  for (const tableName of potentialTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (!error) {
        discoveredTables.push(tableName)
        console.log(`   ✅ Found: ${tableName}`)
      }

      checkedCount++
      if (checkedCount % 50 === 0) {
        console.log(`   📊 Progress: ${checkedCount}/${potentialTables.length} checked, ${discoveredTables.length} found`)
      }
    } catch (err) {
      // Table doesn't exist, continue
    }
  }

  console.log(`   ✅ Brute force discovery found ${discoveredTables.length} tables`)
  return discoveredTables
}

async function runAggressiveDiscovery() {
  console.log('🚀 Starting AGGRESSIVE Table Discovery')
  console.log(`📊 Target: Find all 93+ tables in the database`)
  console.log(`⏰ Started at: ${new Date().toISOString()}`)

  const allDiscoveredTables = new Set()

  // Try multiple discovery methods
  const methods = [
    tryDirectPostgresQuery,
    trySupabaseInformationSchema,
    trySupabaseMetadata,
    tryBruteForceDiscovery
  ]

  for (const method of methods) {
    try {
      const tables = await method()
      if (tables && tables.length > 0) {
        tables.forEach(table => allDiscoveredTables.add(table))
        console.log(`   📊 Running total: ${allDiscoveredTables.size} unique tables`)
      }
    } catch (error) {
      console.log(`   ❌ Method failed: ${error.message}`)
    }
  }

  const finalTableList = Array.from(allDiscoveredTables).sort()

  console.log('\n📊 DISCOVERY SUMMARY')
  console.log('=' .repeat(60))
  console.log(`📋 Total unique tables discovered: ${finalTableList.length}`)
  console.log(`🎯 Target was 93+ tables`)

  if (finalTableList.length < 93) {
    console.log(`⚠️  Still missing ${93 - finalTableList.length} tables`)
    console.log('💡 This suggests there may be:')
    console.log('   - Tables with non-standard naming patterns')
    console.log('   - System tables not in public schema')
    console.log('   - Tables with restricted access')
    console.log('   - Views or materialized views')
  }

  console.log('\n📋 DISCOVERED TABLES:')
  finalTableList.forEach((table, index) => {
    console.log(`   ${(index + 1).toString().padStart(2, '0')}. ${table}`)
  })

  // Save the discovered table list
  const discoveryReport = {
    timestamp: new Date().toISOString(),
    totalDiscovered: finalTableList.length,
    targetCount: 93,
    discoveredTables: finalTableList,
    methods: [
      'Direct PostgreSQL query',
      'Supabase information_schema',
      'Supabase metadata API',
      'Brute force discovery'
    ]
  }

  const reportFile = path.join(__dirname, '..', 'table-discovery-report.json')
  fs.writeFileSync(reportFile, JSON.stringify(discoveryReport, null, 2))

  console.log(`\n📄 Discovery report saved to: ${reportFile}`)
  console.log('\n🔄 Next: Run comprehensive analysis on discovered tables')

  return finalTableList
}

// Run the aggressive discovery
runAggressiveDiscovery().catch(console.error)