#!/usr/bin/env node

/**
 * Database Analysis Runner
 * Executes the database cleanup analysis script and generates a report
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
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runAnalysisQuery(query, description) {
  console.log(`\n🔍 ${description}`)
  console.log('=' .repeat(60))

  try {
    // Use direct SQL query instead of RPC
    const { data, error } = await supabase
      .from('pg_stat_user_tables')
      .select('*')
      .limit(1)

    if (error) {
      console.log('⚠️  Using alternative query method...')
      // Try alternative approach
      return await runDirectQuery(query, description)
    }

    return await runDirectQuery(query, description)
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`)
    return null
  }
}

async function runDirectQuery(query, description) {
  try {
    // For now, we'll use a simpler approach to get table information
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (error) {
      console.error(`❌ Error getting tables: ${error.message}`)
      return null
    }

    console.log(`Found ${tables?.length || 0} tables in public schema`)
    if (tables && tables.length > 0) {
      console.table(tables.slice(0, 20)) // Show first 20 tables
    }

    return tables
  } catch (err) {
    console.error(`❌ Exception in direct query: ${err.message}`)
    return null
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      return false
    }
    return true
  } catch {
    return false
  }
}

async function getTableRowCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      return 0
    }
    return count || 0
  } catch {
    return 0
  }
}

async function runDatabaseAnalysis() {
  console.log('🚀 Starting Database Analysis for Mzima Homes Rental App')
  console.log(`📊 Connected to: ${supabaseUrl}`)
  console.log(`⏰ Analysis started at: ${new Date().toISOString()}`)

  const results = {}

  // Get list of all tables
  console.log('\n🔍 Getting list of all tables...')
  results.allTables = await runAnalysisQuery('', 'All Tables in Database')

  // Check specific suspected unused tables
  const suspectedUnusedTables = [
    'parcels', 'subdivisions', 'plots', 'clients', 'enhanced_users',
    'documents', 'document_versions', 'listings', 'offers', 'sale_agreements',
    'user_profiles', 'land_parcels', 'land_subdivisions'
  ]

  console.log('\n🔍 Checking suspected unused tables...')
  results.suspectedTables = {}

  for (const tableName of suspectedUnusedTables) {
    const exists = await checkTableExists(tableName)
    if (exists) {
      const rowCount = await getTableRowCount(tableName)
      results.suspectedTables[tableName] = {
        exists: true,
        rowCount: rowCount,
        status: rowCount === 0 ? 'EMPTY' : 'HAS_DATA'
      }
      console.log(`   • ${tableName}: ${rowCount} rows (${rowCount === 0 ? 'EMPTY' : 'HAS DATA'})`)
    } else {
      results.suspectedTables[tableName] = {
        exists: false,
        rowCount: 0,
        status: 'NOT_EXISTS'
      }
      console.log(`   • ${tableName}: Does not exist`)
    }
  }

  // Check core rental tables
  const coreRentalTables = [
    'properties', 'units', 'tenants', 'tenancy_agreements',
    'rent_invoices', 'payments', 'property_users', 'landlords'
  ]

  console.log('\n🔍 Checking core rental management tables...')
  results.coreTables = {}

  for (const tableName of coreRentalTables) {
    const exists = await checkTableExists(tableName)
    if (exists) {
      const rowCount = await getTableRowCount(tableName)
      results.coreTables[tableName] = {
        exists: true,
        rowCount: rowCount,
        status: 'CORE_TABLE'
      }
      console.log(`   ✅ ${tableName}: ${rowCount} rows`)
    } else {
      results.coreTables[tableName] = {
        exists: false,
        rowCount: 0,
        status: 'MISSING_CORE_TABLE'
      }
      console.log(`   ❌ ${tableName}: Missing (this is concerning!)`)
    }
  }

  // Generate summary report
  generateSummaryReport(results)

  console.log('\n✅ Database analysis complete!')
  console.log('📄 Report saved to: database-analysis-report.json')
}

function generateSummaryReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTables: results.allTables?.length || 0,
      suspectedUnusedTables: Object.keys(results.suspectedTables || {}).length,
      coreTables: Object.keys(results.coreTables || {}).length
    },
    findings: {
      emptyTables: [],
      missingCoreTables: [],
      existingCoreTables: []
    },
    recommendations: [],
    rawData: results
  }

  // Analyze suspected tables
  if (results.suspectedTables) {
    Object.entries(results.suspectedTables).forEach(([tableName, info]) => {
      if (info.exists && info.rowCount === 0) {
        report.findings.emptyTables.push(tableName)
      }
    })
  }

  // Analyze core tables
  if (results.coreTables) {
    Object.entries(results.coreTables).forEach(([tableName, info]) => {
      if (!info.exists) {
        report.findings.missingCoreTables.push(tableName)
      } else {
        report.findings.existingCoreTables.push({
          name: tableName,
          rowCount: info.rowCount
        })
      }
    })
  }

  // Generate recommendations
  if (report.findings.emptyTables.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      action: 'Remove empty unused tables',
      description: `${report.findings.emptyTables.length} tables exist but are completely empty`,
      tables: report.findings.emptyTables
    })
  }

  if (report.findings.missingCoreTables.length > 0) {
    report.recommendations.push({
      priority: 'CRITICAL',
      action: 'Investigate missing core tables',
      description: `${report.findings.missingCoreTables.length} core rental management tables are missing`,
      tables: report.findings.missingCoreTables
    })
  }

  // Save report to file
  fs.writeFileSync(
    path.join(__dirname, '..', 'database-analysis-report.json'),
    JSON.stringify(report, null, 2)
  )

  // Display summary
  console.log('\n📊 ANALYSIS SUMMARY')
  console.log('=' .repeat(60))
  console.log(`📋 Total tables found: ${report.summary.totalTables}`)
  console.log(`🔍 Suspected unused tables checked: ${report.summary.suspectedUnusedTables}`)
  console.log(`💼 Core rental tables checked: ${report.summary.coreTables}`)
  console.log(`🗑️  Empty tables found: ${report.findings.emptyTables.length}`)
  console.log(`❌ Missing core tables: ${report.findings.missingCoreTables.length}`)

  if (report.findings.emptyTables.length > 0) {
    console.log('\n🗑️  EMPTY TABLES (candidates for removal):')
    report.findings.emptyTables.forEach(table => {
      console.log(`   • ${table}`)
    })
  }

  if (report.findings.missingCoreTables.length > 0) {
    console.log('\n❌ MISSING CORE TABLES (need investigation):')
    report.findings.missingCoreTables.forEach(table => {
      console.log(`   • ${table}`)
    })
  }

  console.log('\n✅ EXISTING CORE TABLES:')
  report.findings.existingCoreTables.forEach(table => {
    console.log(`   ✅ ${table.name}: ${table.rowCount} rows`)
  })
}

// Run the analysis
runDatabaseAnalysis().catch(console.error)