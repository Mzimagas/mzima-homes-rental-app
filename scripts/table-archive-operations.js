#!/usr/bin/env node

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
  const archivedName = `_archived_${phase}_${tableName}`

  try {
    console.log(`📦 Archiving ${tableName} -> ${archivedName}`)

    // Rename table to archived name
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE "${tableName}" RENAME TO "${archivedName}";`
    })

    if (error) {
      throw new Error(`Failed to archive ${tableName}: ${error.message}`)
    }

    console.log(`✅ Successfully archived ${tableName}`)

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
    console.error(`❌ Failed to archive ${tableName}: ${error.message}`)
    throw error
  }
}

async function rollbackArchive(archivedName, originalName) {
  try {
    console.log(`🔄 Rolling back ${archivedName} -> ${originalName}`)

    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE "${archivedName}" RENAME TO "${originalName}";`
    })

    if (error) {
      throw new Error(`Failed to rollback ${archivedName}: ${error.message}`)
    }

    console.log(`✅ Successfully rolled back ${originalName}`)

    return {
      timestamp: new Date().toISOString(),
      action: 'ROLLBACK',
      archivedName: archivedName,
      restoredName: originalName
    }

  } catch (error) {
    console.error(`❌ Failed to rollback ${archivedName}: ${error.message}`)
    throw error
  }
}

module.exports = { archiveTable, rollbackArchive }
