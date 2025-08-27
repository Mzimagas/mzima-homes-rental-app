#!/usr/bin/env node

/**
 * Migration Analysis Script
 * Analyzes migration files to identify which ones created unused tables
 */

const fs = require('fs')
const path = require('path')

// Tables identified as unused from database analysis
const unusedTables = [
  'parcels', 'subdivisions', 'plots', 'clients', 'documents',
  'listings', 'sale_agreements', 'user_profiles'
]

// Tables to investigate
const investigateTables = ['enhanced_users']

function analyzeMigrationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const fileName = path.basename(filePath)

    const analysis = {
      file: fileName,
      path: filePath,
      createsUnusedTables: [],
      createsInvestigateTables: [],
      dropsUnusedTables: [],
      referencesUnusedTables: [],
      size: content.length,
      lineCount: content.split('\n').length
    }

    // Check for CREATE TABLE statements for unused tables
    unusedTables.forEach(table => {
      const createRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\b`, 'i')
      const dropRegex = new RegExp(`DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${table}\\b`, 'i')
      const referenceRegex = new RegExp(`\\b${table}\\b`, 'gi')

      if (createRegex.test(content)) {
        analysis.createsUnusedTables.push(table)
      }

      if (dropRegex.test(content)) {
        analysis.dropsUnusedTables.push(table)
      }

      const matches = content.match(referenceRegex)
      if (matches && matches.length > 0) {
        analysis.referencesUnusedTables.push({
          table: table,
          count: matches.length
        })
      }
    })

    // Check for tables to investigate
    investigateTables.forEach(table => {
      const createRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\b`, 'i')
      if (createRegex.test(content)) {
        analysis.createsInvestigateTables.push(table)
      }
    })

    return analysis
  } catch (error) {
    console.error(`Error analyzing ${filePath}: ${error.message}`)
    return null
  }
}

function analyzeMigrationDirectory(dirPath, dirName) {
  console.log(`\n🔍 Analyzing ${dirName} directory: ${dirPath}`)
  console.log('=' .repeat(60))

  if (!fs.existsSync(dirPath)) {
    console.log(`❌ Directory not found: ${dirPath}`)
    return []
  }

  const files = fs.readdirSync(dirPath)
    .filter(file => file.endsWith('.sql'))
    .sort()

  console.log(`📁 Found ${files.length} SQL migration files`)

  const analyses = []

  files.forEach(file => {
    const filePath = path.join(dirPath, file)
    const analysis = analyzeMigrationFile(filePath)
    if (analysis) {
      analyses.push(analysis)

      // Report findings for this file
      if (analysis.createsUnusedTables.length > 0 ||
          analysis.createsInvestigateTables.length > 0 ||
          analysis.dropsUnusedTables.length > 0) {

        console.log(`\n📄 ${file}:`)

        if (analysis.createsUnusedTables.length > 0) {
          console.log(`   🗑️  Creates unused tables: ${analysis.createsUnusedTables.join(', ')}`)
        }

        if (analysis.createsInvestigateTables.length > 0) {
          console.log(`   ⚠️  Creates investigate tables: ${analysis.createsInvestigateTables.join(', ')}`)
        }

        if (analysis.dropsUnusedTables.length > 0) {
          console.log(`   ✅ Drops unused tables: ${analysis.dropsUnusedTables.join(', ')}`)
        }

        if (analysis.referencesUnusedTables.length > 0) {
          const refs = analysis.referencesUnusedTables.map(r => `${r.table}(${r.count})`).join(', ')
          console.log(`   📎 References unused tables: ${refs}`)
        }
      }
    }
  })

  return analyses
}

function generateMigrationReport(allAnalyses) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalMigrationFiles: allAnalyses.length,
      filesCreatingUnusedTables: 0,
      filesReferencingUnusedTables: 0,
      totalUnusedTablesCreated: new Set(),
      migrationDirectories: 2
    },
    findings: {
      creatorsOfUnusedTables: {},
      droppersOfUnusedTables: {},
      referencesToUnusedTables: {},
      investigateTableCreators: {}
    },
    recommendations: [],
    rawData: allAnalyses
  }

  // Analyze all files
  allAnalyses.forEach(analysis => {
    if (analysis.createsUnusedTables.length > 0) {
      report.summary.filesCreatingUnusedTables++
      analysis.createsUnusedTables.forEach(table => {
        report.summary.totalUnusedTablesCreated.add(table)
        if (!report.findings.creatorsOfUnusedTables[table]) {
          report.findings.creatorsOfUnusedTables[table] = []
        }
        report.findings.creatorsOfUnusedTables[table].push(analysis.file)
      })
    }

    if (analysis.dropsUnusedTables.length > 0) {
      analysis.dropsUnusedTables.forEach(table => {
        if (!report.findings.droppersOfUnusedTables[table]) {
          report.findings.droppersOfUnusedTables[table] = []
        }
        report.findings.droppersOfUnusedTables[table].push(analysis.file)
      })
    }

    if (analysis.referencesUnusedTables.length > 0) {
      report.summary.filesReferencingUnusedTables++
      analysis.referencesUnusedTables.forEach(ref => {
        if (!report.findings.referencesToUnusedTables[ref.table]) {
          report.findings.referencesToUnusedTables[ref.table] = []
        }
        report.findings.referencesToUnusedTables[ref.table].push({
          file: analysis.file,
          count: ref.count
        })
      })
    }

    if (analysis.createsInvestigateTables.length > 0) {
      analysis.createsInvestigateTables.forEach(table => {
        if (!report.findings.investigateTableCreators[table]) {
          report.findings.investigateTableCreators[table] = []
        }
        report.findings.investigateTableCreators[table].push(analysis.file)
      })
    }
  })

  // Convert Set to Array for JSON serialization
  report.summary.totalUnusedTablesCreated = Array.from(report.summary.totalUnusedTablesCreated)

  // Generate recommendations
  if (report.summary.totalUnusedTablesCreated.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      action: 'Review migration files that created unused tables',
      description: `${report.summary.filesCreatingUnusedTables} migration files created tables that are now unused`,
      details: report.findings.creatorsOfUnusedTables
    })
  }

  if (Object.keys(report.findings.droppersOfUnusedTables).length > 0) {
    report.recommendations.push({
      priority: 'INFO',
      action: 'Some tables were already dropped in later migrations',
      description: 'These migrations attempted to clean up unused tables',
      details: report.findings.droppersOfUnusedTables
    })
  }

  return report
}

async function runMigrationAnalysis() {
  console.log('🚀 Starting Migration Analysis for Mzima Homes Rental App')
  console.log(`⏰ Analysis started at: ${new Date().toISOString()}`)

  const allAnalyses = []

  // Analyze both migration directories
  const supabaseMigrations = analyzeMigrationDirectory(
    path.join(__dirname, '..', 'supabase', 'migrations'),
    'Supabase Migrations'
  )
  allAnalyses.push(...supabaseMigrations)

  const rootMigrations = analyzeMigrationDirectory(
    path.join(__dirname, '..', 'migrations'),
    'Root Migrations'
  )
  allAnalyses.push(...rootMigrations)

  // Generate comprehensive report
  const report = generateMigrationReport(allAnalyses)

  // Save report
  fs.writeFileSync(
    path.join(__dirname, '..', 'migration-analysis-report.json'),
    JSON.stringify(report, null, 2)
  )

  // Display summary
  console.log('\n📊 MIGRATION ANALYSIS SUMMARY')
  console.log('=' .repeat(60))
  console.log(`📁 Total migration files analyzed: ${report.summary.totalMigrationFiles}`)
  console.log(`🗑️  Files creating unused tables: ${report.summary.filesCreatingUnusedTables}`)
  console.log(`📎 Files referencing unused tables: ${report.summary.filesReferencingUnusedTables}`)
  console.log(`🏗️  Total unused tables created: ${report.summary.totalUnusedTablesCreated.length}`)

  if (report.summary.totalUnusedTablesCreated.length > 0) {
    console.log(`\n🗑️  UNUSED TABLES CREATED BY MIGRATIONS:`)
    report.summary.totalUnusedTablesCreated.forEach(table => {
      const creators = report.findings.creatorsOfUnusedTables[table] || []
      console.log(`   • ${table}: created by ${creators.join(', ')}`)
    })
  }

  console.log('\n✅ Migration analysis complete!')
  console.log('📄 Report saved to: migration-analysis-report.json')
}

// Run the analysis
runMigrationAnalysis().catch(console.error)