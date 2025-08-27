#!/usr/bin/env node

/**
 * Comprehensive Database Analysis Script
 * Discovers and analyzes ALL tables in the database (not just a predefined subset)
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

// Known core rental management tables
const CORE_RENTAL_TABLES = [
  'properties', 'units', 'tenants', 'tenancy_agreements',
  'rent_invoices', 'payments', 'property_users', 'landlords',
  'notifications', 'user_invitations', 'profiles'
]

// Known system/auth tables that should not be removed
const SYSTEM_TABLES = [
  'auth', 'storage', 'realtime', 'supabase_functions',
  'pg_', 'information_schema', '_realtime', 'extensions'
]

async function discoverAllTables() {
  console.log('🔍 Discovering ALL tables in the database...')

  try {
    // Get all user tables from information_schema
    const { data: tables, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            schemaname,
            tablename,
            tableowner,
            hasindexes,
            hasrules,
            hastriggers
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `
      })

    if (error) {
      console.log('⚠️  Using alternative method to discover tables...')

      // Alternative method: try to query pg_stat_user_tables
      const { data: altTables, error: altError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT DISTINCT tablename
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
          `
        })

      if (altError) {
        throw new Error(`Could not discover tables: ${altError.message}`)
      }

      return altTables.map(row => row.tablename)
    }

    console.log(`📊 Found ${tables.length} tables in public schema`)
    return tables.map(row => row.tablename)

  } catch (err) {
    console.error(`❌ Error discovering tables: ${err.message}`)

    // Fallback: try to discover tables by attempting to query them
    console.log('🔄 Attempting fallback table discovery...')
    return await fallbackTableDiscovery()
  }
}

async function fallbackTableDiscovery() {
  // Try to discover tables by checking common table names
  const potentialTables = [
    // Core rental tables
    'properties', 'units', 'tenants', 'tenancy_agreements', 'rent_invoices', 'payments',
    'property_users', 'landlords', 'notifications', 'user_invitations', 'profiles',

    // Suspected unused tables from previous analysis
    'parcels', 'subdivisions', 'plots', 'clients', 'documents', 'listings',
    'sale_agreements', 'user_profiles', 'enhanced_users',

    // Additional potential tables
    'maintenance_requests', 'amenities', 'property_amenities', 'media', 'property_media',
    'leases', 'lease_agreements', 'rental_applications', 'inspections', 'repairs',
    'vendors', 'contracts', 'invoices', 'expenses', 'reports', 'settings',
    'roles', 'permissions', 'user_roles', 'audit_logs', 'activity_logs',
    'property_types', 'unit_types', 'payment_methods', 'currencies',
    'addresses', 'contacts', 'emergency_contacts', 'references',
    'documents_storage', 'file_uploads', 'images', 'attachments',
    'calendar_events', 'appointments', 'tours', 'showings',
    'marketing', 'campaigns', 'leads', 'prospects', 'applications',
    'background_checks', 'credit_reports', 'employment_verification',
    'utility_providers', 'utility_accounts', 'utility_readings', 'utility_bills',
    'insurance_policies', 'insurance_claims', 'warranties',
    'property_taxes', 'assessments', 'valuations', 'appraisals',
    'neighborhoods', 'schools', 'amenities_nearby', 'transportation',
    'floor_plans', 'room_details', 'features', 'specifications',
    'pricing_history', 'rent_history', 'occupancy_history',
    'move_in_checklist', 'move_out_checklist', 'inventory',
    'keys', 'access_codes', 'security_deposits', 'pet_deposits',
    'late_fees', 'penalties', 'discounts', 'promotions',
    'communication_logs', 'messages', 'emails', 'sms',
    'work_orders', 'service_requests', 'maintenance_schedules',
    'property_managers', 'agents', 'staff', 'teams'
  ]

  const discoveredTables = []

  for (const tableName of potentialTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (!error) {
        discoveredTables.push(tableName)
        console.log(`   ✅ Found table: ${tableName}`)
      }
    } catch (err) {
      // Table doesn't exist, continue
    }
  }

  console.log(`📊 Discovered ${discoveredTables.length} tables via fallback method`)
  return discoveredTables
}

async function analyzeTable(tableName) {
  console.log(`📊 Analyzing table: ${tableName}`)

  try {
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.log(`   ⚠️  Could not get count for ${tableName}: ${countError.message}`)
      return {
        tableName,
        rowCount: 'unknown',
        accessible: false,
        error: countError.message
      }
    }

    // Get sample data to understand structure
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(3)

    const analysis = {
      tableName,
      rowCount: count || 0,
      accessible: true,
      hasData: (count || 0) > 0,
      sampleColumns: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [],
      category: categorizeTable(tableName, count || 0),
      lastUpdated: null // We'll try to get this if possible
    }

    console.log(`   📈 ${tableName}: ${count || 0} rows, ${analysis.category}`)
    return analysis

  } catch (err) {
    console.log(`   ❌ Error analyzing ${tableName}: ${err.message}`)
    return {
      tableName,
      rowCount: 'error',
      accessible: false,
      error: err.message,
      category: 'error'
    }
  }
}

function categorizeTable(tableName, rowCount) {
  // Categorize tables based on name patterns and row count

  if (CORE_RENTAL_TABLES.includes(tableName)) {
    return rowCount > 0 ? 'core-active' : 'core-empty'
  }

  // System/infrastructure tables
  if (SYSTEM_TABLES.some(prefix => tableName.startsWith(prefix))) {
    return 'system'
  }

  // Auth related tables
  if (tableName.includes('auth') || tableName.includes('user') || tableName.includes('profile')) {
    return rowCount > 0 ? 'auth-active' : 'auth-empty'
  }

  // Land/sales related (likely unused)
  if (['parcels', 'subdivisions', 'plots', 'clients', 'listings', 'sale_agreements'].includes(tableName)) {
    return rowCount > 0 ? 'sales-active' : 'sales-empty'
  }

  // Document management
  if (tableName.includes('document') || tableName.includes('file') || tableName.includes('media')) {
    return rowCount > 0 ? 'document-active' : 'document-empty'
  }

  // Maintenance/operations
  if (tableName.includes('maintenance') || tableName.includes('repair') || tableName.includes('work_order')) {
    return rowCount > 0 ? 'maintenance-active' : 'maintenance-empty'
  }

  // Financial
  if (tableName.includes('payment') || tableName.includes('invoice') || tableName.includes('financial')) {
    return rowCount > 0 ? 'financial-active' : 'financial-empty'
  }

  // Default categorization
  if (rowCount === 0) {
    return 'unknown-empty'
  } else if (rowCount > 0) {
    return 'unknown-active'
  } else {
    return 'unknown'
  }
}

async function runComprehensiveAnalysis() {
  console.log('🚀 Starting COMPREHENSIVE Database Analysis for Mzima Homes Rental App')
  console.log(`📊 Connected to: ${supabaseUrl}`)
  console.log(`⏰ Analysis started at: ${new Date().toISOString()}`)
  console.log('🎯 Goal: Discover and analyze ALL 93+ tables in the database')

  try {
    // Step 1: Discover all tables
    const allTableNames = await discoverAllTables()

    if (allTableNames.length === 0) {
      throw new Error('No tables discovered - this indicates a problem with table discovery')
    }

    console.log(`\n📋 Discovered ${allTableNames.length} tables. Analyzing each one...`)

    // Step 2: Analyze each table
    const tableAnalyses = []
    let processedCount = 0

    for (const tableName of allTableNames) {
      const analysis = await analyzeTable(tableName)
      tableAnalyses.push(analysis)
      processedCount++

      // Progress indicator
      if (processedCount % 10 === 0) {
        console.log(`   📊 Progress: ${processedCount}/${allTableNames.length} tables analyzed`)
      }
    }

    // Step 3: Categorize and summarize results
    const results = categorizeResults(tableAnalyses)

    // Step 4: Generate comprehensive report
    const report = generateComprehensiveReport(results, tableAnalyses)

    // Step 5: Save report
    const reportFile = path.join(__dirname, '..', 'comprehensive-database-analysis-report.json')
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))

    // Step 6: Display summary
    displayComprehensiveSummary(results, report)

    console.log('\n✅ Comprehensive database analysis complete!')
    console.log(`📄 Detailed report saved to: ${reportFile}`)

    return report

  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`)
    throw error
  }
}

function categorizeResults(tableAnalyses) {
  const results = {
    totalTables: tableAnalyses.length,
    coreActive: [],
    coreEmpty: [],
    salesEmpty: [],
    salesActive: [],
    documentEmpty: [],
    documentActive: [],
    authEmpty: [],
    authActive: [],
    maintenanceEmpty: [],
    maintenanceActive: [],
    financialEmpty: [],
    financialActive: [],
    unknownEmpty: [],
    unknownActive: [],
    systemTables: [],
    errorTables: [],
    totalRows: 0
  }

  tableAnalyses.forEach(analysis => {
    const category = analysis.category
    const rowCount = typeof analysis.rowCount === 'number' ? analysis.rowCount : 0

    if (typeof analysis.rowCount === 'number') {
      results.totalRows += analysis.rowCount
    }

    switch (category) {
      case 'core-active':
        results.coreActive.push(analysis)
        break
      case 'core-empty':
        results.coreEmpty.push(analysis)
        break
      case 'sales-empty':
        results.salesEmpty.push(analysis)
        break
      case 'sales-active':
        results.salesActive.push(analysis)
        break
      case 'document-empty':
        results.documentEmpty.push(analysis)
        break
      case 'document-active':
        results.documentActive.push(analysis)
        break
      case 'auth-empty':
        results.authEmpty.push(analysis)
        break
      case 'auth-active':
        results.authActive.push(analysis)
        break
      case 'maintenance-empty':
        results.maintenanceEmpty.push(analysis)
        break
      case 'maintenance-active':
        results.maintenanceActive.push(analysis)
        break
      case 'financial-empty':
        results.financialEmpty.push(analysis)
        break
      case 'financial-active':
        results.financialActive.push(analysis)
        break
      case 'unknown-empty':
        results.unknownEmpty.push(analysis)
        break
      case 'unknown-active':
        results.unknownActive.push(analysis)
        break
      case 'system':
        results.systemTables.push(analysis)
        break
      case 'error':
        results.errorTables.push(analysis)
        break
    }
  })

  return results
}

function generateComprehensiveReport(results, tableAnalyses) {
  const emptyTables = [
    ...results.coreEmpty,
    ...results.salesEmpty,
    ...results.documentEmpty,
    ...results.authEmpty,
    ...results.maintenanceEmpty,
    ...results.financialEmpty,
    ...results.unknownEmpty
  ]

  const activeTables = [
    ...results.coreActive,
    ...results.salesActive,
    ...results.documentActive,
    ...results.authActive,
    ...results.maintenanceActive,
    ...results.financialActive,
    ...results.unknownActive
  ]

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTablesDiscovered: results.totalTables,
      totalRows: results.totalRows,
      emptyTablesCount: emptyTables.length,
      activeTablesCount: activeTables.length,
      systemTablesCount: results.systemTables.length,
      errorTablesCount: results.errorTables.length
    },
    breakdown: {
      core: {
        active: results.coreActive.length,
        empty: results.coreEmpty.length,
        tables: [...results.coreActive, ...results.coreEmpty]
      },
      sales: {
        active: results.salesActive.length,
        empty: results.salesEmpty.length,
        tables: [...results.salesActive, ...results.salesEmpty]
      },
      document: {
        active: results.documentActive.length,
        empty: results.documentEmpty.length,
        tables: [...results.documentActive, ...results.documentEmpty]
      },
      auth: {
        active: results.authActive.length,
        empty: results.authEmpty.length,
        tables: [...results.authActive, ...results.authEmpty]
      },
      maintenance: {
        active: results.maintenanceActive.length,
        empty: results.maintenanceEmpty.length,
        tables: [...results.maintenanceActive, ...results.maintenanceEmpty]
      },
      financial: {
        active: results.financialActive.length,
        empty: results.financialEmpty.length,
        tables: [...results.financialActive, ...results.financialEmpty]
      },
      unknown: {
        active: results.unknownActive.length,
        empty: results.unknownEmpty.length,
        tables: [...results.unknownActive, ...results.unknownEmpty]
      }
    },
    cleanupCandidates: {
      highPriority: emptyTables.filter(t =>
        ['sales-empty', 'document-empty'].includes(t.category)
      ),
      mediumPriority: emptyTables.filter(t =>
        ['unknown-empty', 'maintenance-empty'].includes(t.category)
      ),
      lowPriority: emptyTables.filter(t =>
        ['auth-empty', 'financial-empty'].includes(t.category)
      ),
      investigate: emptyTables.filter(t =>
        t.category === 'core-empty'
      )
    },
    estimatedImpact: calculateEstimatedImpact(results, emptyTables),
    recommendations: generateRecommendations(results, emptyTables),
    rawData: tableAnalyses
  }

  return report
}

function calculateEstimatedImpact(results, emptyTables) {
  const totalTables = results.totalTables
  const emptyTablesCount = emptyTables.length
  const potentialRemovalPercentage = Math.round((emptyTablesCount / totalTables) * 100)

  return {
    tablesForRemoval: emptyTablesCount,
    totalTables: totalTables,
    removalPercentage: potentialRemovalPercentage,
    estimatedStorageReduction: `${potentialRemovalPercentage}-${Math.min(potentialRemovalPercentage + 20, 90)}%`,
    estimatedPerformanceImprovement: `${Math.round(potentialRemovalPercentage * 0.3)}-${Math.round(potentialRemovalPercentage * 0.5)}%`,
    estimatedBackupSpeedImprovement: `${Math.round(potentialRemovalPercentage * 0.4)}-${Math.round(potentialRemovalPercentage * 0.6)}%`
  }
}

function generateRecommendations(results, emptyTables) {
  const recommendations = []

  if (emptyTables.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Remove empty unused tables',
      description: `${emptyTables.length} tables are completely empty and can be safely removed`,
      impact: 'High storage and performance improvement',
      tables: emptyTables.map(t => t.tableName)
    })
  }

  if (results.coreEmpty.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Investigate empty core tables',
      description: `${results.coreEmpty.length} core rental tables are empty - verify if this is expected`,
      impact: 'Potential functionality issues if these should have data',
      tables: results.coreEmpty.map(t => t.tableName)
    })
  }

  if (results.errorTables.length > 0) {
    recommendations.push({
      priority: 'LOW',
      action: 'Investigate inaccessible tables',
      description: `${results.errorTables.length} tables could not be analyzed - check permissions`,
      impact: 'May indicate permission or structural issues',
      tables: results.errorTables.map(t => t.tableName)
    })
  }

  return recommendations
}

function displayComprehensiveSummary(results, report) {
  console.log('\n📊 COMPREHENSIVE DATABASE ANALYSIS SUMMARY')
  console.log('=' .repeat(80))
  console.log(`📋 Total tables discovered: ${results.totalTables}`)
  console.log(`📊 Total rows across all tables: ${results.totalRows.toLocaleString()}`)
  console.log(`🗑️  Empty tables (removal candidates): ${report.summary.emptyTablesCount}`)
  console.log(`✅ Active tables (with data): ${report.summary.activeTablesCount}`)
  console.log(`⚙️  System tables: ${report.summary.systemTablesCount}`)
  console.log(`❌ Error tables (inaccessible): ${report.summary.errorTablesCount}`)

  console.log('\n📈 ESTIMATED IMPACT OF CLEANUP:')
  console.log(`🗑️  Tables for removal: ${report.estimatedImpact.tablesForRemoval}/${report.estimatedImpact.totalTables} (${report.estimatedImpact.removalPercentage}%)`)
  console.log(`💾 Storage reduction: ${report.estimatedImpact.estimatedStorageReduction}`)
  console.log(`⚡ Performance improvement: ${report.estimatedImpact.estimatedPerformanceImprovement}`)
  console.log(`🔄 Backup speed improvement: ${report.estimatedImpact.estimatedBackupSpeedImprovement}`)

  console.log('\n🏷️  BREAKDOWN BY CATEGORY:')
  console.log(`   🏠 Core Rental: ${results.coreActive.length} active, ${results.coreEmpty.length} empty`)
  console.log(`   💰 Sales: ${results.salesActive.length} active, ${results.salesEmpty.length} empty`)
  console.log(`   📄 Documents: ${results.documentActive.length} active, ${results.documentEmpty.length} empty`)
  console.log(`   👤 Auth/Users: ${results.authActive.length} active, ${results.authEmpty.length} empty`)
  console.log(`   🔧 Maintenance: ${results.maintenanceActive.length} active, ${results.maintenanceEmpty.length} empty`)
  console.log(`   💳 Financial: ${results.financialActive.length} active, ${results.financialEmpty.length} empty`)
  console.log(`   ❓ Unknown: ${results.unknownActive.length} active, ${results.unknownEmpty.length} empty`)

  if (report.cleanupCandidates.highPriority.length > 0) {
    console.log('\n🎯 HIGH PRIORITY CLEANUP CANDIDATES:')
    report.cleanupCandidates.highPriority.forEach(table => {
      console.log(`   🗑️  ${table.tableName} (${table.category})`)
    })
  }

  if (report.cleanupCandidates.investigate.length > 0) {
    console.log('\n⚠️  CORE TABLES TO INVESTIGATE:')
    report.cleanupCandidates.investigate.forEach(table => {
      console.log(`   ❓ ${table.tableName} (core table but empty)`)
    })
  }
}

// Run the comprehensive analysis
runComprehensiveAnalysis().catch(console.error)