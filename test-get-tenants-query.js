#!/usr/bin/env node

// Test the tenants units query to ensure property_id filter uses UUID strings
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

// Custom fetch to log the exact REST URL used by Supabase client
const customFetch = async (url, options = {}) => {
  const res = await fetch(url, options)
  const method = options.method || 'GET'
  // Log only the units GET call we're interested in
  const urlStr = typeof url === 'string' ? url : (url && url.toString ? url.toString() : '')
  if (urlStr.includes('/rest/v1/units') && method === 'GET') {
    console.log(`\n🔎 REST call: ${method} ${urlStr}`)
  }
  return res
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: customFetch } })

async function run() {
  console.log('🔍 Testing getTenants units query shape...')

  // 1) Fetch accessible properties via RPC
  const { data: accessibleProperties, error: rpcError } = await supabase.rpc('get_user_properties_simple')
  if (rpcError) {
    console.error('❌ RPC get_user_properties_simple failed:', rpcError.message || rpcError)
    process.exit(1)
  }

  console.log(`✅ Accessible properties returned: ${accessibleProperties?.length || 0}`)
  // Show a sample of the returned objects
  if (accessibleProperties && accessibleProperties.length > 0) {
    console.log('   Sample item:', accessibleProperties[0])
  }

  // 2) Normalize to array of UUID strings
  const propertyIdList = Array.isArray(accessibleProperties)
    ? accessibleProperties
        .map(p => (typeof p === 'string' ? p : p && p.property_id))
        .filter(id => typeof id === 'string' && id.length > 0)
    : []

  console.log('✅ Normalized property IDs:', propertyIdList)

  if (propertyIdList.length === 0) {
    console.log('⚠️ No accessible property IDs; nothing further to test.')
    process.exit(0)
  }

  // 3) Make the units query using the normalized IDs; this should not 400
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id')
    .in('property_id', propertyIdList)

  if (unitsError) {
    console.error('❌ Units query failed:', unitsError)
    process.exit(1)
  }

  console.log(`✅ Units query succeeded. Units found: ${units?.length || 0}`)
  console.log('🎉 The property_id filter used a valid array of UUID strings (no [object Object]).')
}

run().catch(err => {
  console.error('❌ Test crashed:', err)
  process.exit(1)
})

