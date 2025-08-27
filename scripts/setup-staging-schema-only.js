#!/usr/bin/env node

/**
 * Staging Schema-Only Setup
 * Sets up staging environment with schema verification (no data restoration needed)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load staging environment
require('dotenv').config({ path: '.env.staging' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing staging credentials in .env.staging')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyStagingEnvironment() {
  console.log('🚀 STAGING ENVIRONMENT VERIFICATION')
  console.log('🎯 Goal: Verify staging is ready for soft delete testing')
  console.log(`📊 Staging URL: ${supabaseUrl}`)
  console.log(`⏰ Started at: ${new Date().toISOString()}`)
  
  try {
    // Test basic connection
    console.log('\n🔍 Testing staging connection...')
    const { data: testData, error: testError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
    
    if (testError && !testError.message.includes('relation "properties" does not exist')) {
      throw new Error(`Connection test failed: ${testError.message}`)
    }
    
    console.log('✅ Staging connection working!')
    
    // Discover tables in staging
    console.log('\n📊 Discovering tables in staging environment...')
    
    // Load our discovered table list
    const discoveryReport = JSON.parse(fs.readFileSync('table-discovery-report.json', 'utf8'))
    const expectedTables = discoveryReport.discoveredTables
    
    const stagingTables = []
    let existingTables = 0
    let missingTables = 0
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (!error) {
          stagingTables.push({
            name: tableName,
            exists: true,
            rowCount: data ? 0 : 'unknown' // We don't need exact counts
          })
          existingTables++
          console.log(`   ✅ ${tableName}: exists`)
        } else {
          stagingTables.push({
            name: tableName,
            exists: false,
            error: error.message
          })
          missingTables++
          console.log(`   ❌ ${tableName}: missing`)
        }
      } catch (err) {
        stagingTables.push({
          name: tableName,
          exists: false,
          error: err.message
        })
        missingTables++
        console.log(`   ❌ ${tableName}: error`)
      }
    }
    
    // Generate staging verification report
    const verificationReport = {
      timestamp: new Date().toISOString(),
      stagingUrl: supabaseUrl,
      environment: 'staging',
      verification: {
        connectionWorking: true,
        tablesExpected: expectedTables.length,
        tablesExisting: existingTables,
        tablesMissing: missingTables,
        readyForTesting: existingTables > 50 // If most tables exist, we're good
      },
      tables: stagingTables,
      nextSteps: [
        'Execute Phase 1: Schema backup and monitoring setup',
        'Begin Phase 2: Archive 28 high-priority tables',
        'Monitor application for errors during archiving',
        'Test rollback procedures'
      ]
    }
    
    // Save verification report
    fs.writeFileSync('staging-verification-report.json', JSON.stringify(verificationReport, null, 2))
    
    // Display results
    console.log('\n📊 STAGING VERIFICATION RESULTS')
    console.log('=' .repeat(60))
    console.log(`✅ Connection: Working`)
    console.log(`📋 Tables expected: ${expectedTables.length}`)
    console.log(`✅ Tables existing: ${existingTables}`)
    console.log(`❌ Tables missing: ${missingTables}`)
    console.log(`🎯 Ready for testing: ${verificationReport.verification.readyForTesting ? 'YES' : 'NO'}`)
    
    if (verificationReport.verification.readyForTesting) {
      console.log('\n🎉 STAGING ENVIRONMENT READY!')
      console.log('✅ Staging has sufficient table structure for testing')
      console.log('✅ Connection validated and working')
      console.log('✅ Ready to proceed with soft delete testing')
      
      console.log('\n🔄 NEXT STEPS:')
      console.log('   1. Execute Phase 1: Schema backup')
      console.log('      NODE_ENV=staging node scripts/execute-phase1-schema-backup.js')
      console.log('   2. Test staging application:')
      console.log('      npm run dev:staging')
      console.log('   3. Begin Phase 2: Archive high-priority tables')
      
    } else {
      console.log('\n⚠️  STAGING NEEDS SETUP')
      console.log('❌ Too many tables missing for effective testing')
      console.log('💡 Consider using a different staging approach')
    }
    
    console.log(`\n📄 Verification report saved to: staging-verification-report.json`)
    
    return verificationReport.verification.readyForTesting
    
  } catch (error) {
    console.error(`❌ Staging verification failed: ${error.message}`)
    return false
  }
}

// Run verification
verifyStagingEnvironment()
  .then(ready => {
    if (ready) {
      console.log('\n✅ Staging environment verified and ready!')
      console.log('🚀 Proceed with Phase 1: Schema backup')
    } else {
      console.log('\n❌ Staging environment needs additional setup')
    }
    process.exit(ready ? 0 : 1)
  })
  .catch(error => {
    console.error(`❌ Fatal error: ${error.message}`)
    process.exit(1)
  })
