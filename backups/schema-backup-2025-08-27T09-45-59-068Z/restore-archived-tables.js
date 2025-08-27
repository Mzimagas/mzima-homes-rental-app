#!/usr/bin/env node
// Table Restoration Script - Generated 2025-08-27T09:45:59.069Z
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function restoreTable(archivedName, originalName) {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE "${archivedName}" RENAME TO "${originalName}";`
  })
  return !error
}

module.exports = { restoreTable }
