#!/usr/bin/env node

/**
 * Production Health Monitor
 * Monitors application health during and after table archiving
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

// Core tables that must always be accessible
const CORE_TABLES = [
  { name: 'properties', description: 'Property management' },
  { name: 'units', description: 'Unit management' },
  { name: 'tenants', description: 'Tenant management' },
  { name: 'tenancy_agreements', description: 'Tenancy agreements' },
  { name: 'property_users', description: 'Property user relationships' },
  { name: 'landlords', description: 'Landlord management' },
  { name: 'rent_invoices', description: 'Rent invoicing' },
  { name: 'payments', description: 'Payment processing' }
]

async function checkTableHealth(table) {
  try {
    const startTime = Date.now()
    
    // Test table accessibility and get count
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        table: table.name,
        status: 'FAILED',
        error: error.message,
        responseTime: responseTime
      }
    }
    
    return {
      table: table.name,
      status: 'HEALTHY',
      rowCount: count || 0,
      responseTime: responseTime,
      description: table.description
    }
    
  } catch (err) {
    return {
      table: table.name,
      status: 'ERROR',
      error: err.message,
      responseTime: null
    }
  }
}

async function checkArchivedTables() {
  console.log('🔍 Checking for archived tables...')
  
  try {
    // This would need to be implemented with proper database access
    // For now, we'll return a placeholder
    return {
      archivedTablesFound: 0,
      archivedTables: [],
      note: 'Archived table detection requires database admin access'
    }
  } catch (err) {
    return {
      archivedTablesFound: 'unknown',
      error: err.message
    }
  }
}

async function runHealthCheck() {
  console.log('🏥 PRODUCTION HEALTH CHECK')
  console.log(`⏰ Started at: ${new Date().toISOString()}`)
  console.log(`🌍 Environment: production`)
  
  const healthReport = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    overallStatus: 'UNKNOWN',
    coreTablesHealthy: 0,
    coreTablesFailed: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    tableResults: [],
    archivedTablesInfo: null,
    recommendations: []
  }
  
  try {
    console.log('\n🧪 Testing core table accessibility...')
    
    // Check each core table
    for (const table of CORE_TABLES) {
      console.log(`   📊 Testing ${table.name}...`)
      
      const result = await checkTableHealth(table)
      healthReport.tableResults.push(result)
      
      if (result.status === 'HEALTHY') {
        healthReport.coreTablesHealthy++
        healthReport.totalResponseTime += result.responseTime
        console.log(`   ✅ ${table.name}: ${result.rowCount} rows, ${result.responseTime}ms`)
      } else {
        healthReport.coreTablesFailed++
        console.log(`   ❌ ${table.name}: ${result.status} - ${result.error}`)
      }
      
      // Small delay between checks
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Calculate average response time
    if (healthReport.coreTablesHealthy > 0) {
      healthReport.averageResponseTime = Math.round(
        healthReport.totalResponseTime / healthReport.coreTablesHealthy
      )
    }
    
    // Check for archived tables
    console.log('\n🗂️  Checking archived tables status...')
    healthReport.archivedTablesInfo = await checkArchivedTables()
    
    // Determine overall status
    if (healthReport.coreTablesFailed === 0) {
      healthReport.overallStatus = 'HEALTHY'
    } else if (healthReport.coreTablesHealthy > healthReport.coreTablesFailed) {
      healthReport.overallStatus = 'DEGRADED'
    } else {
      healthReport.overallStatus = 'CRITICAL'
    }
    
    // Generate recommendations
    if (healthReport.overallStatus === 'HEALTHY') {
      healthReport.recommendations.push('All core tables healthy - safe to proceed with archiving')
      if (healthReport.averageResponseTime > 1000) {
        healthReport.recommendations.push('Response times elevated - monitor performance')
      }
    } else if (healthReport.overallStatus === 'DEGRADED') {
      healthReport.recommendations.push('Some tables failing - investigate before proceeding')
    } else {
      healthReport.recommendations.push('CRITICAL: Multiple table failures - halt archiving operations')
    }
    
    // Save health report
    const reportFile = path.join('backups', `health-check-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    fs.writeFileSync(reportFile, JSON.stringify(healthReport, null, 2))
    
    // Display summary
    console.log('\n🏥 HEALTH CHECK SUMMARY')
    console.log('=' .repeat(50))
    console.log(`🎯 Overall Status: ${healthReport.overallStatus}`)
    console.log(`✅ Healthy Tables: ${healthReport.coreTablesHealthy}/${CORE_TABLES.length}`)
    console.log(`❌ Failed Tables: ${healthReport.coreTablesFailed}/${CORE_TABLES.length}`)
    console.log(`⚡ Average Response Time: ${healthReport.averageResponseTime}ms`)
    
    if (healthReport.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:')
      healthReport.recommendations.forEach(rec => {
        console.log(`   • ${rec}`)
      })
    }
    
    console.log(`\n📄 Report saved to: ${reportFile}`)
    
    return healthReport.overallStatus === 'HEALTHY'
    
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`)
    healthReport.overallStatus = 'ERROR'
    healthReport.error = error.message
    return false
  }
}

async function continuousMonitoring(intervalMinutes = 5, durationHours = 1) {
  console.log('🔄 CONTINUOUS HEALTH MONITORING')
  console.log(`📊 Interval: ${intervalMinutes} minutes`)
  console.log(`⏰ Duration: ${durationHours} hours`)
  
  const endTime = Date.now() + (durationHours * 60 * 60 * 1000)
  let checkCount = 0
  let healthyChecks = 0
  
  while (Date.now() < endTime) {
    checkCount++
    console.log(`\n🔍 Health Check #${checkCount}`)
    
    const isHealthy = await runHealthCheck()
    if (isHealthy) {
      healthyChecks++
    }
    
    console.log(`📊 Health Rate: ${healthyChecks}/${checkCount} (${Math.round((healthyChecks/checkCount)*100)}%)`)
    
    // Wait for next check
    if (Date.now() < endTime) {
      console.log(`⏳ Next check in ${intervalMinutes} minutes...`)
      await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000))
    }
  }
  
  console.log('\n📊 MONITORING SUMMARY')
  console.log(`✅ Healthy Checks: ${healthyChecks}/${checkCount}`)
  console.log(`📈 Success Rate: ${Math.round((healthyChecks/checkCount)*100)}%`)
  
  return healthyChecks === checkCount
}

// Command line interface
const args = process.argv.slice(2)
const command = args[0] || 'single'

if (command === 'single') {
  // Single health check
  runHealthCheck()
    .then(healthy => {
      console.log(`\n${healthy ? '✅' : '❌'} Health check ${healthy ? 'passed' : 'failed'}`)
      process.exit(healthy ? 0 : 1)
    })
    .catch(error => {
      console.error(`❌ Fatal error: ${error.message}`)
      process.exit(1)
    })
} else if (command === 'monitor') {
  // Continuous monitoring
  const intervalMinutes = parseInt(args[1]) || 5
  const durationHours = parseInt(args[2]) || 1
  
  continuousMonitoring(intervalMinutes, durationHours)
    .then(allHealthy => {
      console.log(`\n${allHealthy ? '✅' : '❌'} Monitoring ${allHealthy ? 'successful' : 'detected issues'}`)
      process.exit(allHealthy ? 0 : 1)
    })
    .catch(error => {
      console.error(`❌ Fatal error: ${error.message}`)
      process.exit(1)
    })
} else {
  console.log('Usage:')
  console.log('  node production-health-monitor.js single              # Single health check')
  console.log('  node production-health-monitor.js monitor [interval] [duration]  # Continuous monitoring')
  console.log('  Example: node production-health-monitor.js monitor 5 2  # Every 5 min for 2 hours')
  process.exit(1)
}
