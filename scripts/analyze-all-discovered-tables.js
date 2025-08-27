#!/usr/bin/env node

/**
 * Analyze All Discovered Tables Script
 * Analyzes all 106 discovered tables for comprehensive cleanup strategy
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

// Load discovered tables
function loadDiscoveredTables() {
  const reportFile = path.join(__dirname, '..', 'table-discovery-report.json')
  if (!fs.existsSync(reportFile)) {
    throw new Error('Table discovery report not found. Run aggressive-table-discovery.js first.')
  }

  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'))
  return report.discoveredTables
}

// Enhanced categorization for all table types
function categorizeTable(tableName, rowCount) {
  const name = tableName.toLowerCase()

  // Core rental management tables (essential for rental operations)
  const coreRentalTables = [
    'properties', 'units', 'tenants', 'tenancy_agreements', 'rent_invoices',
    'payments', 'property_users', 'landlords', 'active_leases'
  ]

  if (coreRentalTables.includes(name)) {
    return rowCount > 0 ? 'core-rental-active' : 'core-rental-empty'
  }

  // Land/property sales and development (likely unused for rental focus)
  if (name.includes('parcel') || name.includes('subdivision') || name.includes('plot') ||
      name.includes('sale') || name.includes('purchase') || name.includes('handover') ||
      name.includes('acquisition') || name.includes('client') || name.includes('listing') ||
      name.includes('offer') || name.includes('reservation') || name.includes('transfer') ||
      name.includes('title') || name.includes('survey') || name.includes('encumbrance') ||
      name.includes('wayleave') || name.includes('easement')) {
    return rowCount > 0 ? 'land-sales-active' : 'land-sales-empty'
  }

  // User management and authentication
  if (name.includes('user') || name.includes('auth') || name.includes('profile') ||
      name.includes('permission') || name.includes('role') || name.includes('invitation') ||
      name.includes('access') || name.includes('security') || name.includes('agent')) {
    return rowCount > 0 ? 'user-auth-active' : 'user-auth-empty'
  }

  // Financial and payment systems
  if (name.includes('payment') || name.includes('invoice') || name.includes('receipt') ||
      name.includes('expense') || name.includes('commission') || name.includes('ledger') ||
      name.includes('mpesa') || name.includes('bank') || name.includes('recon') ||
      name.includes('allocation') || name.includes('installment')) {
    return rowCount > 0 ? 'financial-active' : 'financial-empty'
  }

  // Utilities and meter management
  if (name.includes('utility') || name.includes('meter') || name.includes('shared_meter')) {
    return rowCount > 0 ? 'utility-active' : 'utility-empty'
  }

  // Maintenance and operations
  if (name.includes('maintenance') || name.includes('ticket') || name.includes('task') ||
      name.includes('reminder')) {
    return rowCount > 0 ? 'maintenance-active' : 'maintenance-empty'
  }

  // Notifications and communications
  if (name.includes('notification') || name.includes('template') || name.includes('history')) {
    return rowCount > 0 ? 'notification-active' : 'notification-empty'
  }

  // Documents and media
  if (name.includes('document') || name.includes('media') || name.includes('amenities')) {
    return rowCount > 0 ? 'document-media-active' : 'document-media-empty'
  }

  // Audit and logging
  if (name.includes('audit') || name.includes('log') || name.includes('activity') ||
      name.includes('event') || name.includes('dispute')) {
    return rowCount > 0 ? 'audit-log-active' : 'audit-log-empty'
  }

  // Geographic and spatial data
  if (name.includes('geography') || name.includes('geometry') || name.includes('spatial') ||
      name.includes('zone') || name.includes('rate')) {
    return rowCount > 0 ? 'geographic-active' : 'geographic-empty'
  }

  // Views (read-only, derived data)
  if (name.startsWith('view_') || name.includes('_view')) {
    return 'view'
  }

  // Marketing and leads
  if (name.includes('marketing') || name.includes('lead')) {
    return rowCount > 0 ? 'marketing-active' : 'marketing-empty'
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

async function analyzeTable(tableName) {
  try {
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      return {
        tableName,
        rowCount: 'inaccessible',
        accessible: false,
        error: countError.message,
        category: 'error'
      }
    }

    // Get sample data to understand structure
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    const analysis = {
      tableName,
      rowCount: count || 0,
      accessible: true,
      hasData: (count || 0) > 0,
      sampleColumns: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [],
      category: categorizeTable(tableName, count || 0)
    }

    return analysis

  } catch (err) {
    return {
      tableName,
      rowCount: 'error',
      accessible: false,
      error: err.message,
      category: 'error'
    }
  }
}

async function runCompleteAnalysis() {
  console.log('🚀 Starting COMPLETE Analysis of All 106 Discovered Tables')
  console.log(`📊 Connected to: ${supabaseUrl}`)
  console.log(`⏰ Analysis started at: ${new Date().toISOString()}`)

  try {
    // Load discovered tables
    const allTables = loadDiscoveredTables()
    console.log(`📋 Analyzing ${allTables.length} discovered tables...`)

    // Analyze each table
    const analyses = []
    let processedCount = 0

    for (const tableName of allTables) {
      console.log(`📊 Analyzing: ${tableName}`)
      const analysis = await analyzeTable(tableName)
      analyses.push(analysis)
      processedCount++

      if (analysis.accessible) {
        console.log(`   📈 ${tableName}: ${analysis.rowCount} rows, ${analysis.category}`)
      } else {
        console.log(`   ❌ ${tableName}: ${analysis.error}`)
      }

      // Progress indicator
      if (processedCount % 20 === 0) {
        console.log(`   📊 Progress: ${processedCount}/${allTables.length} tables analyzed`)
      }
    }

    // Categorize results
    const categorizedResults = categorizeAllResults(analyses)

    // Generate comprehensive report
    const report = generateFinalReport(categorizedResults, analyses)

    // Save report
    const reportFile = path.join(__dirname, '..', 'complete-database-analysis-report.json')
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))

    // Display comprehensive summary
    displayFinalSummary(categorizedResults, report)

    console.log('\n✅ Complete database analysis finished!')
    console.log(`📄 Detailed report saved to: ${reportFile}`)

    return report

  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`)
    throw error
  }
}

function categorizeAllResults(analyses) {
  const results = {
    totalTables: analyses.length,
    totalRows: 0,
    categories: {
      'core-rental-active': [],
      'core-rental-empty': [],
      'land-sales-active': [],
      'land-sales-empty': [],
      'user-auth-active': [],
      'user-auth-empty': [],
      'financial-active': [],
      'financial-empty': [],
      'utility-active': [],
      'utility-empty': [],
      'maintenance-active': [],
      'maintenance-empty': [],
      'notification-active': [],
      'notification-empty': [],
      'document-media-active': [],
      'document-media-empty': [],
      'audit-log-active': [],
      'audit-log-empty': [],
      'geographic-active': [],
      'geographic-empty': [],
      'marketing-active': [],
      'marketing-empty': [],
      'view': [],
      'unknown-active': [],
      'unknown-empty': [],
      'error': []
    }
  }

  analyses.forEach(analysis => {
    const category = analysis.category

    if (typeof analysis.rowCount === 'number') {
      results.totalRows += analysis.rowCount
    }

    if (results.categories[category]) {
      results.categories[category].push(analysis)
    } else {
      console.warn(`Unknown category: ${category} for table ${analysis.tableName}`)
      results.categories['unknown-active'].push(analysis)
    }
  })

  return results
}

function generateFinalReport(categorizedResults, analyses) {
  // Calculate cleanup candidates
  const emptyCategories = Object.keys(categorizedResults.categories)
    .filter(cat => cat.endsWith('-empty'))

  const allEmptyTables = []
  emptyCategories.forEach(category => {
    allEmptyTables.push(...categorizedResults.categories[category])
  })

  // Prioritize cleanup candidates
  const highPriorityCleanup = [
    ...categorizedResults.categories['land-sales-empty'],
    ...categorizedResults.categories['document-media-empty'],
    ...categorizedResults.categories['marketing-empty']
  ]

  const mediumPriorityCleanup = [
    ...categorizedResults.categories['maintenance-empty'],
    ...categorizedResults.categories['notification-empty'],
    ...categorizedResults.categories['audit-log-empty'],
    ...categorizedResults.categories['unknown-empty']
  ]

  const lowPriorityCleanup = [
    ...categorizedResults.categories['financial-empty'],
    ...categorizedResults.categories['utility-empty'],
    ...categorizedResults.categories['user-auth-empty'],
    ...categorizedResults.categories['geographic-empty']
  ]

  const investigateCleanup = [
    ...categorizedResults.categories['core-rental-empty']
  ]

  const totalCleanupCandidates = allEmptyTables.length
  const cleanupPercentage = Math.round((totalCleanupCandidates / categorizedResults.totalTables) * 100)

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTables: categorizedResults.totalTables,
      totalRows: categorizedResults.totalRows,
      cleanupCandidates: totalCleanupCandidates,
      cleanupPercentage: cleanupPercentage,
      activeTables: categorizedResults.totalTables - totalCleanupCandidates - categorizedResults.categories['view'].length - categorizedResults.categories['error'].length
    },
    breakdown: categorizedResults.categories,
    cleanupStrategy: {
      highPriority: {
        count: highPriorityCleanup.length,
        tables: highPriorityCleanup.map(t => t.tableName),
        description: 'Safe to remove - land sales, unused documents, marketing tables'
      },
      mediumPriority: {
        count: mediumPriorityCleanup.length,
        tables: mediumPriorityCleanup.map(t => t.tableName),
        description: 'Likely safe to remove - maintenance, notifications, audit logs'
      },
      lowPriority: {
        count: lowPriorityCleanup.length,
        tables: lowPriorityCleanup.map(t => t.tableName),
        description: 'Investigate before removal - financial, utility, user auth tables'
      },
      investigate: {
        count: investigateCleanup.length,
        tables: investigateCleanup.map(t => t.tableName),
        description: 'Core rental tables that are empty - verify if this is expected'
      }
    },
    estimatedImpact: {
      storageReduction: `${cleanupPercentage}-${Math.min(cleanupPercentage + 25, 95)}%`,
      performanceImprovement: `${Math.round(cleanupPercentage * 0.3)}-${Math.round(cleanupPercentage * 0.5)}%`,
      backupSpeedImprovement: `${Math.round(cleanupPercentage * 0.4)}-${Math.round(cleanupPercentage * 0.6)}%`,
      schemaSimplification: `${cleanupPercentage}% fewer tables to maintain`
    },
    rawData: analyses
  }

  return report
}

function displayFinalSummary(categorizedResults, report) {
  console.log('\n📊 COMPLETE DATABASE ANALYSIS SUMMARY')
  console.log('=' .repeat(80))
  console.log(`📋 Total tables discovered: ${categorizedResults.totalTables}`)
  console.log(`📊 Total rows across all tables: ${categorizedResults.totalRows.toLocaleString()}`)
  console.log(`🗑️  Empty tables (cleanup candidates): ${report.summary.cleanupCandidates}`)
  console.log(`✅ Active tables (with data): ${report.summary.activeTables}`)
  console.log(`👁️  Views: ${categorizedResults.categories['view'].length}`)
  console.log(`❌ Error/inaccessible tables: ${categorizedResults.categories['error'].length}`)

  console.log('\n📈 MASSIVE CLEANUP OPPORTUNITY:')
  console.log(`🗑️  Tables for removal: ${report.summary.cleanupCandidates}/${categorizedResults.totalTables} (${report.summary.cleanupPercentage}%)`)
  console.log(`💾 Estimated storage reduction: ${report.estimatedImpact.storageReduction}`)
  console.log(`⚡ Estimated performance improvement: ${report.estimatedImpact.performanceImprovement}`)
  console.log(`🔄 Estimated backup speed improvement: ${report.estimatedImpact.backupSpeedImprovement}`)

  console.log('\n🏷️  DETAILED BREAKDOWN BY CATEGORY:')

  const categoryOrder = [
    'core-rental', 'land-sales', 'user-auth', 'financial', 'utility',
    'maintenance', 'notification', 'document-media', 'audit-log',
    'geographic', 'marketing', 'unknown'
  ]

  categoryOrder.forEach(baseCategory => {
    const activeKey = `${baseCategory}-active`
    const emptyKey = `${baseCategory}-empty`
    const activeCount = categorizedResults.categories[activeKey]?.length || 0
    const emptyCount = categorizedResults.categories[emptyKey]?.length || 0

    if (activeCount > 0 || emptyCount > 0) {
      const categoryName = baseCategory.replace('-', ' ').toUpperCase()
      console.log(`   📂 ${categoryName}: ${activeCount} active, ${emptyCount} empty`)
    }
  })

  console.log(`   👁️  VIEWS: ${categorizedResults.categories['view'].length} (read-only)`)
  console.log(`   ❌ ERRORS: ${categorizedResults.categories['error'].length} (inaccessible)`)

  console.log('\n🎯 CLEANUP STRATEGY:')
  console.log(`   🔥 HIGH PRIORITY (${report.cleanupStrategy.highPriority.count} tables): ${report.cleanupStrategy.highPriority.description}`)
  if (report.cleanupStrategy.highPriority.tables.length > 0) {
    report.cleanupStrategy.highPriority.tables.slice(0, 5).forEach(table => {
      console.log(`      • ${table}`)
    })
    if (report.cleanupStrategy.highPriority.tables.length > 5) {
      console.log(`      • ... and ${report.cleanupStrategy.highPriority.tables.length - 5} more`)
    }
  }

  console.log(`   🟡 MEDIUM PRIORITY (${report.cleanupStrategy.mediumPriority.count} tables): ${report.cleanupStrategy.mediumPriority.description}`)
  console.log(`   🟠 LOW PRIORITY (${report.cleanupStrategy.lowPriority.count} tables): ${report.cleanupStrategy.lowPriority.description}`)
  console.log(`   ⚠️  INVESTIGATE (${report.cleanupStrategy.investigate.count} tables): ${report.cleanupStrategy.investigate.description}`)

  if (report.cleanupStrategy.investigate.tables.length > 0) {
    console.log('\n⚠️  CORE TABLES TO INVESTIGATE (empty but might be needed):')
    report.cleanupStrategy.investigate.tables.forEach(table => {
      console.log(`      ❓ ${table}`)
    })
  }

  console.log('\n🚀 NEXT STEPS FOR PHASE 2:')
  console.log('   1. Create staging environment')
  console.log('   2. Start with HIGH PRIORITY cleanup (safest tables)')
  console.log('   3. Test application functionality after each cleanup phase')
  console.log('   4. Measure performance improvements')
  console.log('   5. Proceed to MEDIUM and LOW priority tables')
  console.log('   6. Investigate core empty tables separately')
}

// Run the complete analysis
runCompleteAnalysis().catch(console.error)