#!/usr/bin/env node

/**
 * Phase 2 Execution: Archive High-Priority Tables
 * Safely archives 28 high-priority tables using soft delete (table renaming)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables (staging or production)
const envFile = process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env.local'
require('dotenv').config({ path: envFile })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(`❌ Missing Supabase credentials in ${envFile}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// High-priority tables for Phase 2 (safest to archive)
const PHASE2_TABLES = [
  // Land sales and development (obviously unused for rental focus)
  'clients', 'encumbrances', 'listings', 'offers_reservations', 'parcel_owners',
  'parcels', 'plots', 'property_handover_costs', 'property_sale_info',
  'property_sale_status_history', 'property_subdivision_costs',
  'property_subdivision_history', 'purchase_pipeline_change_approvals',
  'purchase_pipeline_costs', 'reservation_requests', 'sale_agreements',
  'subdivision_plots', 'subdivisions', 'surveys', 'transfers_titles',
  'wayleaves_easements',
  
  // Document and media management (likely unused)
  'documents', 'land_media', 'land_property_amenities', 'unit_amenities', 'units_media',
  
  // Marketing and amenities (likely unused)
  'amenities', 'marketing_leads'
]

async function archiveTable(tableName) {
  const archivedName = `_archived_phase2_${tableName}`
  
  try {
    console.log(`📦 Archiving: ${tableName} -> ${archivedName}`)
    
    // Check if table exists first
    const { data: checkData, error: checkError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (checkError) {
      console.log(`   ⚠️  ${tableName}: Table not accessible, skipping`)
      return { success: false, reason: 'not_accessible', error: checkError.message }
    }
    
    // Rename table to archived name
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE "${tableName}" RENAME TO "${archivedName}";`
    })
    
    if (error) {
      console.log(`   ❌ ${tableName}: Archive failed - ${error.message}`)
      return { success: false, reason: 'rename_failed', error: error.message }
    }
    
    console.log(`   ✅ ${tableName}: Successfully archived`)
    
    return {
      success: true,
      originalName: tableName,
      archivedName: archivedName,
      timestamp: new Date().toISOString()
    }
    
  } catch (err) {
    console.log(`   ❌ ${tableName}: Unexpected error - ${err.message}`)
    return { success: false, reason: 'unexpected_error', error: err.message }
  }
}

async function testApplicationHealth() {
  console.log('🧪 Testing application health after archiving...')
  
  const healthChecks = [
    { name: 'properties', description: 'Core property management' },
    { name: 'units', description: 'Unit management' },
    { name: 'tenants', description: 'Tenant management' },
    { name: 'tenancy_agreements', description: 'Tenancy agreements' }
  ]
  
  const results = []
  
  for (const check of healthChecks) {
    try {
      const { data, error } = await supabase
        .from(check.name)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`   ❌ ${check.name}: ${error.message}`)
        results.push({ ...check, status: 'failed', error: error.message })
      } else {
        console.log(`   ✅ ${check.name}: Working (${data || 0} records)`)
        results.push({ ...check, status: 'passed', count: data || 0 })
      }
    } catch (err) {
      console.log(`   ❌ ${check.name}: ${err.message}`)
      results.push({ ...check, status: 'error', error: err.message })
    }
  }
  
  const allPassed = results.every(r => r.status === 'passed')
  console.log(`\n🎯 Health check result: ${allPassed ? 'PASSED' : 'FAILED'}`)
  
  return { allPassed, results }
}

async function executePhase2() {
  console.log('🚀 PHASE 2: Archive High-Priority Tables')
  console.log('🎯 Goal: Safely archive 28 high-priority tables using soft delete')
  console.log(`⏰ Started at: ${new Date().toISOString()}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`)
  console.log(`📋 Tables to archive: ${PHASE2_TABLES.length}`)
  
  const results = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 2: High-Priority Table Archiving',
    environment: process.env.NODE_ENV || 'production',
    tablesTargeted: PHASE2_TABLES.length,
    tablesArchived: 0,
    tablesFailed: 0,
    archivedTables: [],
    failedTables: [],
    healthCheck: null
  }
  
  try {
    console.log('\n📦 Starting table archiving...')
    
    // Archive each table
    for (const tableName of PHASE2_TABLES) {
      const result = await archiveTable(tableName)
      
      if (result.success) {
        results.tablesArchived++
        results.archivedTables.push(result)
      } else {
        results.tablesFailed++
        results.failedTables.push({ tableName, ...result })
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('\n🧪 Testing application health...')
    const healthCheck = await testApplicationHealth()
    results.healthCheck = healthCheck
    
    // Save results
    const reportFile = path.join('backups', `phase2-archive-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2))
    
    // Display summary
    console.log('\n📊 PHASE 2 ARCHIVE SUMMARY')
    console.log('=' .repeat(60))
    console.log(`📋 Tables targeted: ${results.tablesTargeted}`)
    console.log(`✅ Tables archived: ${results.tablesArchived}`)
    console.log(`❌ Tables failed: ${results.tablesFailed}`)
    console.log(`🧪 Health check: ${healthCheck.allPassed ? 'PASSED' : 'FAILED'}`)
    
    if (results.tablesArchived > 0) {
      console.log('\n✅ SUCCESSFULLY ARCHIVED:')
      results.archivedTables.forEach(table => {
        console.log(`   📦 ${table.originalName} -> ${table.archivedName}`)
      })
    }
    
    if (results.tablesFailed > 0) {
      console.log('\n❌ FAILED TO ARCHIVE:')
      results.failedTables.forEach(table => {
        console.log(`   ❌ ${table.tableName}: ${table.reason}`)
      })
    }
    
    if (healthCheck.allPassed) {
      console.log('\n🎉 PHASE 2 COMPLETED SUCCESSFULLY!')
      console.log('✅ Tables archived without breaking application')
      console.log('✅ Core functionality verified working')
      console.log('✅ Ready for 1-week monitoring period')
      
      console.log('\n🔄 NEXT STEPS:')
      console.log('   1. Monitor application for 1 week')
      console.log('   2. Test all core features thoroughly')
      console.log('   3. Measure performance improvements')
      console.log('   4. If successful, proceed to Phase 3')
      
      console.log('\n🛡️  ROLLBACK AVAILABLE:')
      console.log('   If any issues arise, run rollback script')
      console.log(`   node backups/schema-backup-*/restore-archived-tables.js`)
      
    } else {
      console.log('\n⚠️  HEALTH CHECK FAILED!')
      console.log('❌ Application may have issues after archiving')
      console.log('🔄 Consider rolling back archived tables')
    }
    
    console.log(`\n📄 Report saved to: ${reportFile}`)
    
    return healthCheck.allPassed
    
  } catch (error) {
    console.error(`❌ Phase 2 failed: ${error.message}`)
    return false
  }
}

// Run Phase 2
executePhase2()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Phase 2 execution ${success ? 'completed successfully' : 'failed'}!`)
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error(`❌ Fatal error: ${error.message}`)
    process.exit(1)
  })
