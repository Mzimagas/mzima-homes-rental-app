#!/usr/bin/env node

/**
 * Staging Restoration Script
 * Restores production backup data to staging environment
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const backupDirArg = args.find(arg => arg.startsWith('--backup-dir='))
const backupDir = backupDirArg ? backupDirArg.split('=')[1] : null

if (!backupDir) {
  console.error('❌ Usage: node restore-to-staging.js --backup-dir=./backups/database-backup-xxx')
  process.exit(1)
}

// Load staging environment variables
require('dotenv').config({ path: '.env.staging' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing staging Supabase credentials in .env.staging')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client for staging
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function loadBackupData() {
  const dataBackupFile = path.join(backupDir, 'data-backup.json')

  if (!fs.existsSync(dataBackupFile)) {
    throw new Error(`Backup file not found: ${dataBackupFile}`)
  }

  console.log(`📂 Loading backup from: ${dataBackupFile}`)
  const backupData = JSON.parse(fs.readFileSync(dataBackupFile, 'utf8'))

  console.log(`📊 Backup contains ${Object.keys(backupData.tables).length} tables`)
  console.log(`📅 Backup created: ${backupData.timestamp}`)

  return backupData
}

async function clearStagingTable(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 0) // Delete all rows (assuming all tables have id column)

    if (error) {
      console.log(`   ⚠️  Could not clear ${tableName}: ${error.message}`)
      return false
    }

    console.log(`   🧹 Cleared existing data from ${tableName}`)
    return true
  } catch (err) {
    console.log(`   ❌ Error clearing ${tableName}: ${err.message}`)
    return false
  }
}

async function restoreTableData(tableName, tableData) {
  console.log(`📦 Restoring table: ${tableName}`)

  if (!tableData.data || tableData.data.length === 0) {
    console.log(`   ℹ️  ${tableName}: No data to restore (empty table)`)
    return { success: true, rowsRestored: 0 }
  }

  try {
    // Clear existing data first
    await clearStagingTable(tableName)

    // Insert data in batches to avoid timeout
    const batchSize = 100
    const data = tableData.data
    let totalRestored = 0

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      const { error } = await supabase
        .from(tableName)
        .insert(batch)

      if (error) {
        console.log(`   ❌ Error inserting batch ${Math.floor(i/batchSize) + 1}: ${error.message}`)
        return { success: false, error: error.message, rowsRestored: totalRestored }
      }

      totalRestored += batch.length
      console.log(`   📥 Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} rows inserted`)
    }

    console.log(`   ✅ ${tableName}: ${totalRestored} rows restored successfully`)
    return { success: true, rowsRestored: totalRestored }

  } catch (err) {
    console.log(`   ❌ Error restoring ${tableName}: ${err.message}`)
    return { success: false, error: err.message, rowsRestored: 0 }
  }
}

async function verifyRestoredData(tableName, expectedCount) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`   ⚠️  Could not verify ${tableName}: ${error.message}`)
      return false
    }

    if (count === expectedCount) {
      console.log(`   ✅ ${tableName}: Verification passed (${count} rows)`)
      return true
    } else {
      console.log(`   ❌ ${tableName}: Verification failed (expected ${expectedCount}, got ${count})`)
      return false
    }
  } catch (err) {
    console.log(`   ❌ Error verifying ${tableName}: ${err.message}`)
    return false
  }
}

async function runStagingRestoration() {
  console.log('🚀 Starting Staging Environment Restoration')
  console.log(`📊 Staging URL: ${supabaseUrl}`)
  console.log(`📂 Backup directory: ${backupDir}`)
  console.log(`⏰ Restoration started at: ${new Date().toISOString()}`)

  try {
    // Load backup data
    const backupData = await loadBackupData()

    // Restoration results
    const results = {
      timestamp: new Date().toISOString(),
      backupSource: backupDir,
      stagingUrl: supabaseUrl,
      tablesProcessed: 0,
      tablesSuccessful: 0,
      tablesFailed: 0,
      totalRowsRestored: 0,
      details: {}
    }

    console.log('\n📦 Starting data restoration...')

    // Process tables in order (core tables first)
    const coreTablesFirst = [
      'properties', 'units', 'tenants', 'tenancy_agreements',
      'rent_invoices', 'payments', 'property_users', 'landlords'
    ]

    const otherTables = Object.keys(backupData.tables).filter(
      table => !coreTablesFirst.includes(table)
    )

    const orderedTables = [...coreTablesFirst, ...otherTables]

    for (const tableName of orderedTables) {
      if (backupData.tables[tableName]) {
        results.tablesProcessed++

        const result = await restoreTableData(tableName, backupData.tables[tableName])
        results.details[tableName] = result

        if (result.success) {
          results.tablesSuccessful++
          results.totalRowsRestored += result.rowsRestored

          // Verify the restoration
          await verifyRestoredData(tableName, result.rowsRestored)
        } else {
          results.tablesFailed++
        }
      }
    }

    // Save restoration report
    const reportFile = path.join(backupDir, 'staging-restoration-report.json')
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2))

    // Display summary
    console.log('\n📊 RESTORATION SUMMARY')
    console.log('=' .repeat(60))
    console.log(`📋 Tables processed: ${results.tablesProcessed}`)
    console.log(`✅ Tables successful: ${results.tablesSuccessful}`)
    console.log(`❌ Tables failed: ${results.tablesFailed}`)
    console.log(`📊 Total rows restored: ${results.totalRowsRestored}`)

    if (results.tablesFailed > 0) {
      console.log('\n❌ FAILED TABLES:')
      Object.entries(results.details).forEach(([table, result]) => {
        if (!result.success) {
          console.log(`   • ${table}: ${result.error}`)
        }
      })
    }

    console.log('\n✅ SUCCESSFUL TABLES:')
    Object.entries(results.details).forEach(([table, result]) => {
      if (result.success) {
        console.log(`   ✅ ${table}: ${result.rowsRestored} rows`)
      }
    })

    console.log('\n🔄 NEXT STEPS:')
    console.log('   1. Test application functionality in staging')
    console.log('   2. Verify all features work correctly')
    console.log('   3. Run baseline performance tests')
    console.log('   4. Proceed with cleanup testing')

    console.log('\n✅ Staging restoration complete!')
    console.log(`📄 Report saved to: ${reportFile}`)

    return results.tablesFailed === 0

  } catch (error) {
    console.error(`❌ Restoration failed: ${error.message}`)
    return false
  }
}

// Run the restoration
runStagingRestoration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error(`❌ Fatal error: ${error.message}`)
    process.exit(1)
  })