#!/usr/bin/env node

/**
 * Performance Measurement Script
 * Measures database performance before and after table archiving
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

// Performance test queries
const PERFORMANCE_TESTS = [
  {
    name: 'Property List Query',
    description: 'List all properties with basic info',
    query: () => supabase.from('properties').select('id, name, address, property_type').limit(50)
  },
  {
    name: 'Tenant Search Query',
    description: 'Search tenants with related data',
    query: () => supabase.from('tenants').select('id, first_name, last_name, email').limit(20)
  },
  {
    name: 'Tenancy Agreement Query',
    description: 'Get tenancy agreements with property info',
    query: () => supabase.from('tenancy_agreements').select('id, start_date, end_date, monthly_rent').limit(20)
  },
  {
    name: 'Property Units Query',
    description: 'Get units for properties',
    query: () => supabase.from('units').select('id, unit_number, property_id, rent_amount').limit(30)
  },
  {
    name: 'Complex Join Query',
    description: 'Complex query with multiple table access',
    query: () => supabase
      .from('properties')
      .select('id, name, address')
      .limit(10)
  }
]

async function runPerformanceTest(test, iterations = 5) {
  console.log(`🧪 Testing: ${test.name}`)
  
  const results = []
  let totalTime = 0
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = Date.now()
      const { data, error } = await test.query()
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      if (error) {
        console.log(`   ❌ Iteration ${i + 1}: ${error.message}`)
        errorCount++
      } else {
        console.log(`   ✅ Iteration ${i + 1}: ${responseTime}ms (${data?.length || 0} records)`)
        results.push(responseTime)
        totalTime += responseTime
        successCount++
      }
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (err) {
      console.log(`   ❌ Iteration ${i + 1}: ${err.message}`)
      errorCount++
    }
  }
  
  if (successCount === 0) {
    return {
      testName: test.name,
      status: 'FAILED',
      errorCount: errorCount,
      averageTime: null,
      minTime: null,
      maxTime: null
    }
  }
  
  const averageTime = Math.round(totalTime / successCount)
  const minTime = Math.min(...results)
  const maxTime = Math.max(...results)
  
  console.log(`   📊 Average: ${averageTime}ms, Min: ${minTime}ms, Max: ${maxTime}ms`)
  
  return {
    testName: test.name,
    description: test.description,
    status: 'SUCCESS',
    iterations: iterations,
    successCount: successCount,
    errorCount: errorCount,
    averageTime: averageTime,
    minTime: minTime,
    maxTime: maxTime,
    allResults: results
  }
}

async function measureDatabaseSize() {
  console.log('📊 Measuring database size...')
  
  try {
    // Get table count and estimated size
    // Note: Exact size measurement requires database admin access
    const tableCount = await countTables()
    
    return {
      tableCount: tableCount,
      estimatedSize: 'Requires database admin access',
      note: 'Use Supabase dashboard for exact size measurements'
    }
  } catch (err) {
    return {
      error: err.message,
      tableCount: 'unknown'
    }
  }
}

async function countTables() {
  // Try to count accessible tables
  const testTables = [
    'properties', 'units', 'tenants', 'tenancy_agreements', 'rent_invoices', 'payments',
    'property_users', 'landlords', 'notifications', 'user_invitations'
  ]
  
  let accessibleCount = 0
  
  for (const tableName of testTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        accessibleCount++
      }
    } catch (err) {
      // Table not accessible
    }
  }
  
  return accessibleCount
}

async function runPerformanceBenchmark(label = 'baseline') {
  console.log(`🚀 PERFORMANCE BENCHMARK: ${label.toUpperCase()}`)
  console.log(`⏰ Started at: ${new Date().toISOString()}`)
  
  const benchmark = {
    timestamp: new Date().toISOString(),
    label: label,
    environment: 'production',
    databaseSize: null,
    performanceTests: [],
    overallStats: {
      totalTests: PERFORMANCE_TESTS.length,
      successfulTests: 0,
      failedTests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    }
  }
  
  try {
    // Measure database size
    console.log('\n📊 Measuring database metrics...')
    benchmark.databaseSize = await measureDatabaseSize()
    
    // Run performance tests
    console.log('\n🧪 Running performance tests...')
    
    for (const test of PERFORMANCE_TESTS) {
      const result = await runPerformanceTest(test, 3)
      benchmark.performanceTests.push(result)
      
      if (result.status === 'SUCCESS') {
        benchmark.overallStats.successfulTests++
        benchmark.overallStats.totalResponseTime += result.averageTime
      } else {
        benchmark.overallStats.failedTests++
      }
      
      // Delay between tests
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Calculate overall average
    if (benchmark.overallStats.successfulTests > 0) {
      benchmark.overallStats.averageResponseTime = Math.round(
        benchmark.overallStats.totalResponseTime / benchmark.overallStats.successfulTests
      )
    }
    
    // Save benchmark results
    const benchmarkFile = path.join('backups', `performance-benchmark-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    fs.writeFileSync(benchmarkFile, JSON.stringify(benchmark, null, 2))
    
    // Display summary
    console.log('\n📊 BENCHMARK SUMMARY')
    console.log('=' .repeat(50))
    console.log(`🏷️  Label: ${label}`)
    console.log(`📋 Total Tests: ${benchmark.overallStats.totalTests}`)
    console.log(`✅ Successful: ${benchmark.overallStats.successfulTests}`)
    console.log(`❌ Failed: ${benchmark.overallStats.failedTests}`)
    console.log(`⚡ Average Response Time: ${benchmark.overallStats.averageResponseTime}ms`)
    console.log(`📊 Accessible Tables: ${benchmark.databaseSize.tableCount}`)
    
    console.log('\n📋 TEST RESULTS:')
    benchmark.performanceTests.forEach(test => {
      if (test.status === 'SUCCESS') {
        console.log(`   ✅ ${test.testName}: ${test.averageTime}ms avg`)
      } else {
        console.log(`   ❌ ${test.testName}: FAILED`)
      }
    })
    
    console.log(`\n📄 Benchmark saved to: ${benchmarkFile}`)
    
    return benchmark
    
  } catch (error) {
    console.error(`❌ Benchmark failed: ${error.message}`)
    benchmark.error = error.message
    return benchmark
  }
}

async function comparePerformance(baselineFile, afterFile) {
  console.log('📊 PERFORMANCE COMPARISON')
  
  try {
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
    const after = JSON.parse(fs.readFileSync(afterFile, 'utf8'))
    
    console.log('\n📈 PERFORMANCE IMPROVEMENTS:')
    console.log(`⚡ Response Time: ${baseline.overallStats.averageResponseTime}ms → ${after.overallStats.averageResponseTime}ms`)
    
    const improvement = baseline.overallStats.averageResponseTime - after.overallStats.averageResponseTime
    const improvementPercent = Math.round((improvement / baseline.overallStats.averageResponseTime) * 100)
    
    console.log(`📊 Improvement: ${improvement}ms (${improvementPercent}%)`)
    console.log(`📋 Tables: ${baseline.databaseSize.tableCount} → ${after.databaseSize.tableCount}`)
    
    return {
      improvement: improvement,
      improvementPercent: improvementPercent,
      baseline: baseline,
      after: after
    }
    
  } catch (error) {
    console.error(`❌ Comparison failed: ${error.message}`)
    return null
  }
}

// Command line interface
const args = process.argv.slice(2)
const command = args[0] || 'baseline'

if (command === 'baseline') {
  runPerformanceBenchmark('baseline')
    .then(benchmark => {
      console.log('\n✅ Baseline benchmark completed')
      process.exit(0)
    })
    .catch(error => {
      console.error(`❌ Fatal error: ${error.message}`)
      process.exit(1)
    })
} else if (command === 'after') {
  runPerformanceBenchmark('after-archiving')
    .then(benchmark => {
      console.log('\n✅ After-archiving benchmark completed')
      process.exit(0)
    })
    .catch(error => {
      console.error(`❌ Fatal error: ${error.message}`)
      process.exit(1)
    })
} else if (command === 'compare') {
  const baselineFile = args[1]
  const afterFile = args[2]
  
  if (!baselineFile || !afterFile) {
    console.log('Usage: node measure-performance-improvements.js compare <baseline-file> <after-file>')
    process.exit(1)
  }
  
  comparePerformance(baselineFile, afterFile)
    .then(comparison => {
      if (comparison) {
        console.log('\n✅ Performance comparison completed')
      }
      process.exit(0)
    })
    .catch(error => {
      console.error(`❌ Fatal error: ${error.message}`)
      process.exit(1)
    })
} else {
  console.log('Usage:')
  console.log('  node measure-performance-improvements.js baseline    # Capture baseline metrics')
  console.log('  node measure-performance-improvements.js after       # Capture after-archiving metrics')
  console.log('  node measure-performance-improvements.js compare <baseline-file> <after-file>')
  process.exit(1)
}
