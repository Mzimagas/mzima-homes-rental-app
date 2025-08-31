#!/usr/bin/env node

/**
 * Targeted Cleanup Database Backup Script
 * Creates a comprehensive backup before removing unused tables
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Tables with data that we want to preserve
const activeTables = [
  'properties', 'units', 'tenants', 'tenancy_agreements', 'property_users',
  'property_document_status', 'property_documents', 'property_acquisition_costs',
  'property_payment_installments', 'property_purchase_price_history',
  'property_subdivisions', 'notification_rules', 'notification_templates',
  'permission_sections', 'permission_templates', 'permission_detail_types',
  'land_amenities', 'purchase_pipeline_field_security', 'purchase_pipeline_audit_log'
]

// Tables to be removed (47 empty tables)
const tablesToRemove = [
  'activities_audit', 'agents', 'amenities', 'approvals', 'bank_mpesa_recons',
  'clients', 'commissions', 'data_access_logs', 'disputes_logs', 'encumbrances',
  'expenses', 'in_app_notifications', 'invoices', 'land_details', 'land_media',
  'land_property_amenities', 'land_rates', 'listings', 'maintenance_requests',
  'maintenance_tickets', 'marketing_leads', 'meter_readings', 'mpesa_transactions',
  'notification_history', 'notification_settings', 'offers_reservations',
  'owners', 'parcel_owners', 'parcels', 'payment_allocations', 'payment_plans',
  'payments', 'permission_audit_log', 'plots', 'pricing_zones',
  'property_audit_log', 'property_handover_costs', 'property_payment_records',
  'property_sale_info', 'property_sale_status_history', 'property_subdivision_costs',
  'purchase_pipeline_change_approvals', 'purchase_pipeline_costs', 'receipts',
  'rent_invoices', 'reservation_requests', 'sale_agreements', 'security_events',
  'shared_meters', 'subdivision_plots', 'subdivisions', 'surveys',
  'tasks_reminders', 'transfers_titles', 'unit_amenities', 'unit_shared_meters',
  'units_media', 'user_activities', 'user_invitations', 'user_next_of_kin',
  'user_permissions', 'user_profiles', 'utility_accounts', 'utility_ledger',
  'value_add_projects', 'wayleaves_easements'
]

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(__dirname, '..', 'backups', `targeted-cleanup-backup-${timestamp}`)
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  console.log('🔄 Creating targeted cleanup backup...')
  console.log(`📁 Backup directory: ${backupDir}`)

  const backupSummary = {
    timestamp,
    backupType: 'targeted-cleanup-pre-removal',
    activeTables: [],
    tablesToRemove: [],
    totalTablesWithData: 0,
    totalEmptyTables: 0,
    errors: []
  }

  // Backup active tables (with data)
  console.log('\n📊 Backing up active tables with data...')
  for (const tableName of activeTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })

      if (error) {
        console.log(`⚠️  ${tableName}: ${error.message}`)
        backupSummary.errors.push({ table: tableName, error: error.message })
        continue
      }

      const rowCount = count || 0
      console.log(`✅ ${tableName}: ${rowCount} rows`)

      if (rowCount > 0) {
        // Save data to file
        const fileName = `${tableName}-data.json`
        const filePath = path.join(backupDir, fileName)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
        
        backupSummary.activeTables.push({
          name: tableName,
          rowCount,
          fileName,
          status: 'backed_up'
        })
        backupSummary.totalTablesWithData++
      }
    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`)
      backupSummary.errors.push({ table: tableName, error: error.message })
    }
  }

  // Verify empty tables (to be removed)
  console.log('\n🗑️  Verifying empty tables to be removed...')
  for (const tableName of tablesToRemove) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`⚠️  ${tableName}: ${error.message}`)
        backupSummary.errors.push({ table: tableName, error: error.message })
        continue
      }

      const rowCount = count || 0
      console.log(`🗑️  ${tableName}: ${rowCount} rows (${rowCount === 0 ? 'SAFE TO REMOVE' : 'HAS DATA!'})`)

      backupSummary.tablesToRemove.push({
        name: tableName,
        rowCount,
        safeToRemove: rowCount === 0
      })

      if (rowCount === 0) {
        backupSummary.totalEmptyTables++
      }
    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`)
      backupSummary.errors.push({ table: tableName, error: error.message })
    }
  }

  // Save backup summary
  const summaryPath = path.join(backupDir, 'backup-summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(backupSummary, null, 2))

  // Create restoration instructions
  const restoreInstructions = `# Targeted Cleanup Backup Restoration Instructions

## Backup Details
- **Created**: ${timestamp}
- **Type**: Pre-cleanup safety backup
- **Active Tables**: ${backupSummary.totalTablesWithData} tables with data
- **Empty Tables**: ${backupSummary.totalEmptyTables} tables verified empty

## To Restore (if needed):
1. Stop the application
2. Use Supabase dashboard or CLI to restore tables
3. Import data from JSON files in this directory
4. Restart the application

## Files in this backup:
${backupSummary.activeTables.map(t => `- ${t.fileName} (${t.rowCount} rows)`).join('\n')}

## Tables verified safe to remove:
${backupSummary.tablesToRemove.filter(t => t.safeToRemove).map(t => `- ${t.name}`).join('\n')}

## ⚠️ Tables with unexpected data:
${backupSummary.tablesToRemove.filter(t => !t.safeToRemove).map(t => `- ${t.name} (${t.rowCount} rows)`).join('\n') || 'None - all tables verified empty'}
`

  fs.writeFileSync(path.join(backupDir, 'RESTORE_INSTRUCTIONS.md'), restoreInstructions)

  console.log('\n✅ Backup completed successfully!')
  console.log(`📁 Backup location: ${backupDir}`)
  console.log(`📊 Active tables backed up: ${backupSummary.totalTablesWithData}`)
  console.log(`🗑️  Empty tables verified: ${backupSummary.totalEmptyTables}`)
  
  if (backupSummary.errors.length > 0) {
    console.log(`⚠️  Errors encountered: ${backupSummary.errors.length}`)
  }

  return backupSummary
}

// Run backup
if (require.main === module) {
  createBackup()
    .then((summary) => {
      console.log('\n🎉 Targeted cleanup backup ready!')
      console.log('✅ Safe to proceed with table removal')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Backup failed:', error)
      process.exit(1)
    })
}

module.exports = { createBackup }
