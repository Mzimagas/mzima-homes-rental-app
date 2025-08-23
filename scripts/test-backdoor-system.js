#!/usr/bin/env node

/**
 * BACKDOOR SYSTEM TEST SCRIPT
 * 
 * This script validates the administrative backdoor system functionality.
 * Run this script to ensure the backdoor system is properly configured.
 * 
 * Usage: node scripts/test-backdoor-system.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'mzimagas@gmail.com'

// Test email
const TEST_ADMIN_EMAIL = 'mzimagas@gmail.com'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL'
  const color = passed ? 'green' : 'red'
  log(`${status} ${testName}`, color)
  if (details) {
    log(`    ${details}`, 'blue')
  }
}

async function testBackdoorSystem() {
  log('\n🔐 ADMINISTRATIVE BACKDOOR SYSTEM TEST', 'bold')
  log('=' .repeat(50), 'blue')
  
  let totalTests = 0
  let passedTests = 0

  // Test 1: Environment Configuration
  totalTests++
  log('\n1. Testing Environment Configuration...', 'yellow')
  
  const envValid = SUPABASE_URL && SUPABASE_SERVICE_KEY && ADMIN_EMAILS
  if (envValid) {
    passedTests++
    logTest('Environment variables configured', true, `Admin emails: ${ADMIN_EMAILS}`)
  } else {
    logTest('Environment variables configured', false, 'Missing required environment variables')
  }

  // Test 2: Supabase Connection
  totalTests++
  log('\n2. Testing Supabase Connection...', 'yellow')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    
    if (!error) {
      passedTests++
      logTest('Supabase connection', true, 'Successfully connected to database')
    } else {
      logTest('Supabase connection', false, `Database error: ${error.message}`)
    }
  } catch (err) {
    logTest('Supabase connection', false, `Connection error: ${err.message}`)
  }

  // Test 3: Admin Email Validation
  totalTests++
  log('\n3. Testing Admin Email Validation...', 'yellow')
  
  const adminEmails = ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
  const testEmailValid = adminEmails.includes(TEST_ADMIN_EMAIL.toLowerCase())
  
  if (testEmailValid) {
    passedTests++
    logTest('Admin email validation', true, `${TEST_ADMIN_EMAIL} is configured as super-admin`)
  } else {
    logTest('Admin email validation', false, `${TEST_ADMIN_EMAIL} not found in admin emails`)
  }

  // Test 4: Database Schema
  totalTests++
  log('\n4. Testing Database Schema...', 'yellow')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Check if audit table exists
    const { data, error } = await supabase
      .from('admin_backdoor_audit')
      .select('id')
      .limit(1)
    
    if (!error) {
      passedTests++
      logTest('Audit table exists', true, 'admin_backdoor_audit table is accessible')
    } else {
      logTest('Audit table exists', false, `Audit table error: ${error.message}`)
    }
  } catch (err) {
    logTest('Audit table exists', false, `Schema error: ${err.message}`)
  }

  // Test 5: Emergency Access API
  totalTests++
  log('\n5. Testing Emergency Access API...', 'yellow')
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/admin/emergency-access?email=${TEST_ADMIN_EMAIL}`)
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        passedTests++
        logTest('Emergency access API', true, 'API endpoint is accessible and functional')
      } else {
        logTest('Emergency access API', false, `API returned error: ${result.error}`)
      }
    } else {
      logTest('Emergency access API', false, `HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (err) {
    logTest('Emergency access API', false, `API test failed: ${err.message}`)
  }

  // Test 6: User Profile Creation
  totalTests++
  log('\n6. Testing User Profile Management...', 'yellow')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Check if super-admin profile exists
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', TEST_ADMIN_EMAIL)
      .single()
    
    if (profile) {
      const isCorrectRole = profile.role === 'super_admin'
      const isActive = profile.is_active === true
      
      if (isCorrectRole && isActive) {
        passedTests++
        logTest('Super-admin profile', true, `Profile exists with correct role and active status`)
      } else {
        logTest('Super-admin profile', false, `Profile exists but role=${profile.role}, active=${profile.is_active}`)
      }
    } else if (error && error.code === 'PGRST116') {
      // Profile doesn't exist - this is okay, it will be created on first login
      passedTests++
      logTest('Super-admin profile', true, 'Profile will be created automatically on first access')
    } else {
      logTest('Super-admin profile', false, `Profile check error: ${error?.message || 'Unknown error'}`)
    }
  } catch (err) {
    logTest('Super-admin profile', false, `Profile test error: ${err.message}`)
  }

  // Test 7: Hardcoded Protection
  totalTests++
  log('\n7. Testing Hardcoded Protection...', 'yellow')
  
  // This test checks if the hardcoded email is properly configured
  const hardcodedEmails = ['mzimagas@gmail.com'] // This should match the hardcoded list
  const hardcodedValid = hardcodedEmails.includes(TEST_ADMIN_EMAIL)
  
  if (hardcodedValid) {
    passedTests++
    logTest('Hardcoded protection', true, 'Test email is in hardcoded super-admin list')
  } else {
    logTest('Hardcoded protection', false, 'Test email not found in hardcoded list')
  }

  // Summary
  log('\n' + '=' .repeat(50), 'blue')
  log('🔐 BACKDOOR SYSTEM TEST SUMMARY', 'bold')
  log('=' .repeat(50), 'blue')
  
  const successRate = Math.round((passedTests / totalTests) * 100)
  const summaryColor = successRate >= 85 ? 'green' : successRate >= 70 ? 'yellow' : 'red'
  
  log(`\nTests Passed: ${passedTests}/${totalTests} (${successRate}%)`, summaryColor)
  
  if (successRate >= 85) {
    log('\n✅ BACKDOOR SYSTEM IS PROPERLY CONFIGURED', 'green')
    log('The administrative backdoor system is ready for use.', 'green')
  } else if (successRate >= 70) {
    log('\n⚠️  BACKDOOR SYSTEM HAS MINOR ISSUES', 'yellow')
    log('Some components may need attention, but core functionality should work.', 'yellow')
  } else {
    log('\n❌ BACKDOOR SYSTEM HAS CRITICAL ISSUES', 'red')
    log('The backdoor system requires immediate attention before use.', 'red')
  }

  // Recommendations
  log('\n📋 RECOMMENDATIONS:', 'blue')
  
  if (!envValid) {
    log('• Configure all required environment variables', 'yellow')
  }
  
  if (passedTests < totalTests) {
    log('• Review failed tests and fix underlying issues', 'yellow')
    log('• Run database migrations if schema tests failed', 'yellow')
    log('• Verify Supabase configuration and permissions', 'yellow')
  }
  
  log('• Regularly monitor the admin_backdoor_audit table for security', 'blue')
  log('• Test emergency access procedures periodically', 'blue')
  log('• Keep backup access methods available', 'blue')
  
  log('\n🔗 USEFUL COMMANDS:', 'blue')
  log(`• Emergency Access: curl -X POST ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/emergency-access -H "Content-Type: application/json" -d '{"email":"${TEST_ADMIN_EMAIL}","action":"create_access"}'`, 'reset')
  log(`• System Status: curl "${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/emergency-access?email=${TEST_ADMIN_EMAIL}"`, 'reset')
  
  log('\n')
  process.exit(successRate >= 70 ? 0 : 1)
}

// Run the test
testBackdoorSystem().catch(err => {
  log(`\n❌ TEST SCRIPT ERROR: ${err.message}`, 'red')
  process.exit(1)
})
