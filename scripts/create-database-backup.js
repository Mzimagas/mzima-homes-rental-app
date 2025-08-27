#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates comprehensive backup of Supabase database before cleanup operations
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

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

// Tables to backup (including unused ones for safety)
const allTables = [
  // Core rental tables
  'properties', 'units', 'tenants', 'tenancy_agreements',
  'rent_invoices', 'payments', 'property_users', 'landlords',
  // Unused tables (for safety)
  'parcels', 'subdivisions', 'plots', 'clients', 'documents',
  'listings', 'sale_agreements', 'user_profiles', 'enhanced_users'
]

async function createTableBackup(tableName) {
  console.log(`📦 Backing up table: ${tableName}`)

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')

    if (error) {
      console.log(`   ⚠️  Table ${tableName} not accessible: ${error.message}`)
      return null
    }

    console.log(`   ✅ ${tableName}: ${data?.length || 0} rows backed up`)
    return {
      tableName,
      rowCount: data?.length || 0,
      data: data || [],
      timestamp: new Date().toISOString()
    }
  } catch (err) {
    console.log(`   ❌ Error backing up ${tableName}: ${err.message}`)
    return null
  }
}

async function getTableSchema(tableName) {
  try {
    // Get table schema information
    const { data, error } = await supabase.rpc('get_table_schema', {
      table_name: tableName
    })

    if (error) {
      // Fallback: try to get basic column info
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')

      if (colError) {
        console.log(`   ⚠️  Could not get schema for ${tableName}`)
        return null
      }

      return columns
    }

    return data
  } catch (err) {
    console.log(`   ⚠️  Schema error for ${tableName}: ${err.message}`)
    return null
  }
}

async function createSchemaBackup() {
  console.log('\n🏗️  Creating schema backup...')

  const schemaBackup = {
    timestamp: new Date().toISOString(),
    tables: {}
  }

  for (const tableName of allTables) {
    const schema = await getTableSchema(tableName)
    if (schema) {
      schemaBackup.tables[tableName] = schema
      console.log(`   ✅ Schema for ${tableName} backed up`)
    }
  }

  return schemaBackup
}

function createBackupDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(__dirname, '..', 'backups', `database-backup-${timestamp}`)

  if (!fs.existsSync(path.dirname(backupDir))) {
    fs.mkdirSync(path.dirname(backupDir), { recursive: true })
  }

  fs.mkdirSync(backupDir, { recursive: true })

  return backupDir
}

async function createSupabaseCLIBackup(backupDir) {
  console.log('\n🔧 Attempting Supabase CLI backup...')

  try {
    // Check if Supabase CLI is installed
    execSync('supabase --version', { stdio: 'pipe' })
    console.log('   ✅ Supabase CLI found')

    // Try to create a database dump
    const dumpFile = path.join(backupDir, 'supabase-dump.sql')

    // Note: This requires proper Supabase CLI setup and authentication
    console.log('   ⚠️  Manual Supabase CLI backup required:')
    console.log(`   📝 Run: supabase db dump --file ${dumpFile}`)

    // Create instructions file
    const instructionsFile = path.join(backupDir, 'CLI_BACKUP_INSTRUCTIONS.md')
    const instructions = `# Supabase CLI Backup Instructions

To create a complete database dump using Supabase CLI:

1. Ensure you're logged in to Supabase CLI:
   \`\`\`bash
   supabase login
   \`\`\`

2. Link your project (if not already linked):
   \`\`\`bash
   supabase link --project-ref ${supabaseUrl.split('//')[1].split('.')[0]}
   \`\`\`

3. Create the database dump:
   \`\`\`bash
   supabase db dump --file ${dumpFile}
   \`\`\`

4. Verify the dump was created:
   \`\`\`bash
   ls -la ${dumpFile}
   \`\`\`

This will create a complete SQL dump of your database schema and data.
`

    fs.writeFileSync(instructionsFile, instructions)
    console.log(`   📄 Instructions saved to: ${instructionsFile}`)

  } catch (error) {
    console.log('   ⚠️  Supabase CLI not found or not configured')
    console.log('   💡 Install with: npm install -g supabase')
  }
}

async function runDatabaseBackup() {
  console.log('🚀 Starting Database Backup for Mzima Homes Rental App')
  console.log(`📊 Connected to: ${supabaseUrl}`)
  console.log(`⏰ Backup started at: ${new Date().toISOString()}`)

  // Create backup directory
  const backupDir = createBackupDirectory()
  console.log(`📁 Backup directory: ${backupDir}`)

  // Create data backup
  console.log('\n📦 Creating data backup...')
  const dataBackup = {
    timestamp: new Date().toISOString(),
    supabaseUrl: supabaseUrl,
    tables: {}
  }

  for (const tableName of allTables) {
    const tableBackup = await createTableBackup(tableName)
    if (tableBackup) {
      dataBackup.tables[tableName] = tableBackup
    }
  }

  // Create schema backup
  const schemaBackup = await createSchemaBackup()

  // Save data backup
  const dataBackupFile = path.join(backupDir, 'data-backup.json')
  fs.writeFileSync(dataBackupFile, JSON.stringify(dataBackup, null, 2))
  console.log(`\n💾 Data backup saved to: ${dataBackupFile}`)

  // Save schema backup
  const schemaBackupFile = path.join(backupDir, 'schema-backup.json')
  fs.writeFileSync(schemaBackupFile, JSON.stringify(schemaBackup, null, 2))
  console.log(`💾 Schema backup saved to: ${schemaBackupFile}`)

  // Create Supabase CLI backup instructions
  await createSupabaseCLIBackup(backupDir)

  // Create backup summary
  const summary = {
    timestamp: new Date().toISOString(),
    backupDirectory: backupDir,
    tablesBackedUp: Object.keys(dataBackup.tables).length,
    totalRows: Object.values(dataBackup.tables).reduce((sum, table) => sum + table.rowCount, 0),
    files: [
      'data-backup.json',
      'schema-backup.json',
      'CLI_BACKUP_INSTRUCTIONS.md',
      'backup-summary.json'
    ],
    nextSteps: [
      'Verify backup files are complete',
      'Test backup restoration in staging environment',
      'Create additional manual backups if needed',
      'Proceed with staging environment setup'
    ]
  }

  const summaryFile = path.join(backupDir, 'backup-summary.json')
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2))

  // Display summary
  console.log('\n📊 BACKUP SUMMARY')
  console.log('=' .repeat(60))
  console.log(`📁 Backup directory: ${backupDir}`)
  console.log(`📋 Tables backed up: ${summary.tablesBackedUp}`)
  console.log(`📊 Total rows backed up: ${summary.totalRows}`)
  console.log(`📄 Files created: ${summary.files.length}`)

  console.log('\n📦 BACKED UP TABLES:')
  Object.entries(dataBackup.tables).forEach(([tableName, backup]) => {
    console.log(`   ✅ ${tableName}: ${backup.rowCount} rows`)
  })

  console.log('\n🔄 NEXT STEPS:')
  summary.nextSteps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`)
  })

  console.log('\n✅ Database backup complete!')
  console.log(`📄 Summary saved to: ${summaryFile}`)

  return backupDir
}

// Run the backup
runDatabaseBackup().catch(console.error)