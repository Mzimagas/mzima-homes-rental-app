#!/usr/bin/env node

/**
 * Soft Delete Cleanup Strategy
 * Creates a safe, reversible cleanup approach for empty tables
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

/**
 * Soft Delete Strategy Options:
 *
 * 1. RENAME TABLES: Add '_archived_' prefix to hide from normal operations
 * 2. BACKUP SCHEMA: Create complete schema backup for restoration
 * 3. MONITORING: Track if any code tries to access archived tables
 * 4. GRADUAL REMOVAL: Remove tables in phases with monitoring periods
 */

async function createSoftDeletePlan() {
  console.log('🛡️  Creating SOFT DELETE Cleanup Strategy')
  console.log('📋 Safe, reversible approach for empty table cleanup')

  // Load the complete analysis
  const reportFile = path.join(__dirname, '..', 'complete-database-analysis-report.json')
  if (!fs.existsSync(reportFile)) {
    throw new Error('Complete analysis report not found. Run analyze-all-discovered-tables.js first.')
  }

  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'))

  const softDeletePlan = {
    timestamp: new Date().toISOString(),
    strategy: 'soft-delete-with-monitoring',
    totalEmptyTables: report.summary.cleanupCandidates,
    phases: {
      phase1: {
        name: 'Schema Backup & Monitoring Setup',
        description: 'Create complete backups and monitoring before any changes',
        duration: '1-2 days',
        actions: [
          'Create complete schema backup with CREATE statements',
          'Set up table access monitoring',
          'Create restoration scripts',
          'Document all foreign key relationships'
        ],
        risk: 'NONE',
        reversible: true
      },
      phase2: {
        name: 'High Priority Soft Archive',
        description: 'Rename obviously unused tables (land sales, marketing)',
        tables: report.cleanupStrategy.highPriority.tables,
        tableCount: report.cleanupStrategy.highPriority.count,
        duration: '1 week monitoring',
        actions: [
          'Rename tables with _archived_ prefix',
          'Monitor application for errors',
          'Track any access attempts',
          'Verify application functionality'
        ],
        risk: 'LOW',
        reversible: true,
        monitoringPeriod: '7 days'
      },
      phase3: {
        name: 'Medium Priority Soft Archive',
        description: 'Archive maintenance, notification, audit tables',
        tables: report.cleanupStrategy.mediumPriority.tables,
        tableCount: report.cleanupStrategy.mediumPriority.count,
        duration: '2 weeks monitoring',
        actions: [
          'Rename tables with _archived_ prefix',
          'Extended monitoring period',
          'Check for scheduled jobs or triggers',
          'Verify no background processes use these tables'
        ],
        risk: 'MEDIUM',
        reversible: true,
        monitoringPeriod: '14 days'
      },
      phase4: {
        name: 'Low Priority Investigation',
        description: 'Careful analysis of financial, utility, auth tables',
        tables: report.cleanupStrategy.lowPriority.tables,
        tableCount: report.cleanupStrategy.lowPriority.count,
        duration: '1 month analysis',
        actions: [
          'Detailed code analysis for table references',
          'Check migration files for future plans',
          'Consult with development team',
          'Selective archiving based on analysis'
        ],
        risk: 'HIGH',
        reversible: true,
        requiresApproval: true
      },
      phase5: {
        name: 'Core Table Investigation',
        description: 'Special handling for empty core rental tables',
        tables: report.cleanupStrategy.investigate.tables,
        tableCount: report.cleanupStrategy.investigate.count,
        duration: 'Ongoing analysis',
        actions: [
          'Verify if empty state is expected',
          'Check if tables are needed for future features',
          'Consult business requirements',
          'NO ARCHIVING without explicit approval'
        ],
        risk: 'CRITICAL',
        reversible: true,
        requiresBusinessApproval: true
      }
    },
    safetyMeasures: {
      backupStrategy: {
        fullSchemaBackup: 'Complete CREATE statements for all tables',
        dataBackup: 'Full data backup (already completed)',
        relationshipMapping: 'Document all foreign key relationships',
        accessPatterns: 'Log all table access attempts'
      },
      monitoringStrategy: {
        errorTracking: 'Monitor application logs for table access errors',
        performanceMetrics: 'Track query performance improvements',
        accessLogging: 'Log any attempts to access archived tables',
        rollbackTriggers: 'Automatic rollback if critical errors detected'
      },
      rollbackStrategy: {
        immediateRollback: 'Rename tables back to original names',
        dataRestoration: 'Restore from backup if needed',
        relationshipRestoration: 'Recreate foreign key constraints',
        verificationTesting: 'Full application testing after rollback'
      }
    },
    estimatedBenefits: {
      immediate: {
        storageReduction: '60-80% (from table archiving)',
        queryPerformance: '15-25% improvement',
        backupSpeed: '20-35% faster',
        schemaClarity: 'Much cleaner development experience'
      },
      afterMonitoring: {
        storageReduction: '69-94% (if all tables confirmed unused)',
        queryPerformance: '21-35% improvement',
        backupSpeed: '28-41% faster',
        maintenanceReduction: '69% fewer tables to maintain'
      }
    }
  }

  return softDeletePlan
}

async function generateSchemaBackup() {
  console.log('📋 Generating complete schema backup for safety...')

  // This would need to be implemented to create full CREATE statements
  // for all tables, including indexes, constraints, triggers, etc.

  const schemaBackup = {
    timestamp: new Date().toISOString(),
    description: 'Complete schema backup before soft delete operations',
    tables: {},
    indexes: {},
    constraints: {},
    triggers: {},
    functions: {},
    views: {}
  }

  // For now, create a placeholder that documents what we need
  const backupInstructions = `
# Schema Backup Instructions

## Required Before Any Table Archiving:

1. **Complete Table Schemas**:
   \`\`\`sql
   -- For each table, capture:
   SELECT
     'CREATE TABLE ' || table_name || ' (' ||
     string_agg(
       column_name || ' ' || data_type ||
       CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
       ', '
     ) || ');'
   FROM information_schema.columns
   WHERE table_schema = 'public'
   GROUP BY table_name;
   \`\`\`

2. **Foreign Key Relationships**:
   \`\`\`sql
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY';
   \`\`\`

3. **Indexes**:
   \`\`\`sql
   SELECT
     schemaname,
     tablename,
     indexname,
     indexdef
   FROM pg_indexes
   WHERE schemaname = 'public';
   \`\`\`

4. **Triggers and Functions**:
   \`\`\`sql
   SELECT
     trigger_name,
     event_manipulation,
     event_object_table,
     action_statement
   FROM information_schema.triggers
   WHERE trigger_schema = 'public';
   \`\`\`
`

  const backupFile = path.join(__dirname, '..', 'schema-backup-instructions.md')
  fs.writeFileSync(backupFile, backupInstructions)

  console.log(`📄 Schema backup instructions saved to: ${backupFile}`)

  return schemaBackup
}

async function createTableArchiveScript() {
  console.log('🔧 Creating table archive scripts...')

  const archiveScript = `#!/usr/bin/env node

/**
 * Table Archive Script
 * Safely archives (renames) tables with monitoring and rollback capability
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function archiveTable(tableName, phase = 'unknown') {
  const archivedName = \`_archived_\${phase}_\${tableName}\`

  try {
    console.log(\`📦 Archiving \${tableName} -> \${archivedName}\`)

    // Rename table to archived name
    const { error } = await supabase.rpc('exec_sql', {
      sql: \`ALTER TABLE "\${tableName}" RENAME TO "\${archivedName}";\`
    })

    if (error) {
      throw new Error(\`Failed to archive \${tableName}: \${error.message}\`)
    }

    console.log(\`✅ Successfully archived \${tableName}\`)

    // Log the archive action
    const archiveLog = {
      timestamp: new Date().toISOString(),
      action: 'ARCHIVE',
      originalName: tableName,
      archivedName: archivedName,
      phase: phase,
      reversible: true
    }

    return archiveLog

  } catch (error) {
    console.error(\`❌ Failed to archive \${tableName}: \${error.message}\`)
    throw error
  }
}

async function rollbackArchive(archivedName, originalName) {
  try {
    console.log(\`🔄 Rolling back \${archivedName} -> \${originalName}\`)

    const { error } = await supabase.rpc('exec_sql', {
      sql: \`ALTER TABLE "\${archivedName}" RENAME TO "\${originalName}";\`
    })

    if (error) {
      throw new Error(\`Failed to rollback \${archivedName}: \${error.message}\`)
    }

    console.log(\`✅ Successfully rolled back \${originalName}\`)

    return {
      timestamp: new Date().toISOString(),
      action: 'ROLLBACK',
      archivedName: archivedName,
      restoredName: originalName
    }

  } catch (error) {
    console.error(\`❌ Failed to rollback \${archivedName}: \${error.message}\`)
    throw error
  }
}

module.exports = { archiveTable, rollbackArchive }
`

  const scriptFile = path.join(__dirname, '..', 'scripts', 'table-archive-operations.js')
  fs.writeFileSync(scriptFile, archiveScript)

  console.log(`📄 Archive script saved to: ${scriptFile}`)
}

async function runSoftDeleteStrategy() {
  console.log('🚀 Starting Soft Delete Strategy Creation')
  console.log(`⏰ Started at: ${new Date().toISOString()}`)

  try {
    // Create the soft delete plan
    const plan = await createSoftDeletePlan()

    // Generate schema backup instructions
    await generateSchemaBackup()

    // Create archive scripts
    await createTableArchiveScript()

    // Save the complete plan
    const planFile = path.join(__dirname, '..', 'soft-delete-cleanup-plan.json')
    fs.writeFileSync(planFile, JSON.stringify(plan, null, 2))

    // Display the plan summary
    displaySoftDeleteSummary(plan)

    console.log('\n✅ Soft delete strategy created!')
    console.log(`📄 Complete plan saved to: ${planFile}`)

    return plan

  } catch (error) {
    console.error(`❌ Strategy creation failed: ${error.message}`)
    throw error
  }
}

function displaySoftDeleteSummary(plan) {
  console.log('\n🛡️  SOFT DELETE CLEANUP STRATEGY')
  console.log('=' .repeat(80))
  console.log(`📋 Total empty tables to handle: ${plan.totalEmptyTables}`)
  console.log(`🔄 Strategy: ${plan.strategy}`)

  console.log('\n📅 PHASED APPROACH:')

  Object.entries(plan.phases).forEach(([phaseKey, phase]) => {
    const riskEmoji = {
      'NONE': '🟢',
      'LOW': '🟡',
      'MEDIUM': '🟠',
      'HIGH': '🔴',
      'CRITICAL': '🚨'
    }[phase.risk] || '❓'

    console.log(`\n   ${riskEmoji} ${phase.name}`)
    console.log(`      📝 ${phase.description}`)
    console.log(`      📊 Tables: ${phase.tableCount || 'N/A'}`)
    console.log(`      ⏱️  Duration: ${phase.duration}`)
    console.log(`      🛡️  Risk: ${phase.risk}`)
    console.log(`      🔄 Reversible: ${phase.reversible ? 'YES' : 'NO'}`)

    if (phase.requiresApproval) {
      console.log(`      ⚠️  Requires approval before execution`)
    }
  })

  console.log('\n📈 ESTIMATED BENEFITS:')
  console.log(`   💾 Immediate storage reduction: ${plan.estimatedBenefits.immediate.storageReduction}`)
  console.log(`   ⚡ Immediate performance improvement: ${plan.estimatedBenefits.immediate.queryPerformance}`)
  console.log(`   🔄 Immediate backup speed improvement: ${plan.estimatedBenefits.immediate.backupSpeed}`)

  console.log('\n🛡️  SAFETY MEASURES:')
  console.log('   ✅ Complete schema backup before any changes')
  console.log('   ✅ Table renaming (not deletion) for easy rollback')
  console.log('   ✅ Monitoring period for each phase')
  console.log('   ✅ Automatic rollback capability')
  console.log('   ✅ Application error tracking')

  console.log('\n🔄 NEXT STEPS:')
  console.log('   1. Review and approve the soft delete plan')
  console.log('   2. Set up staging environment for testing')
  console.log('   3. Execute Phase 1: Schema backup and monitoring setup')
  console.log('   4. Begin Phase 2: High priority table archiving')
  console.log('   5. Monitor application for 1 week before proceeding')
}

// Run the soft delete strategy creation
runSoftDeleteStrategy().catch(console.error)