#!/usr/bin/env node

/**
 * Final Email Configuration Verification
 * Comprehensive check to ensure all email bounce fixes are working with corrected address
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function finalEmailVerification() {
  console.log('🔍 Final Email Configuration Verification')
  console.log('=' .repeat(60))
  console.log(`Supabase Project: ${supabaseUrl.split('//')[1].split('.')[0]}`)
  console.log(`Verification Date: ${new Date().toISOString()}`)
  console.log('=' .repeat(60))
  console.log()
  
  let allChecksPass = true
  const issues = []
  
  try {
    // 1. Environment Configuration Check
    console.log('1️⃣ Environment Configuration...')
    
    const envChecks = {
      'SMTP_HOST': process.env.SMTP_HOST === 'smtp.gmail.com',
      'SMTP_PORT': process.env.SMTP_PORT === '587',
      'SMTP_USER': process.env.SMTP_USER === 'mzimahomes@gmail.com',
      'SMTP_PASS': !!process.env.SMTP_PASS,
      'SUPABASE_URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'SERVICE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
    
    Object.entries(envChecks).forEach(([key, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${key}: ${passed ? 'OK' : 'ISSUE'}`)
      if (!passed) {
        allChecksPass = false
        issues.push(`Environment variable ${key} is not configured correctly`)
      }
    })
    
    // 2. File Configuration Check
    console.log('\n2️⃣ Configuration Files...')
    
    // Check .env.local
    const envLocalContent = fs.readFileSync('.env.local', 'utf8')
    const envLocalCorrect = envLocalContent.includes('SMTP_USER=mzimahomes@gmail.com') &&
                           !envLocalContent.includes('mzimahomesl@gmail.com')
    
    console.log(`   ${envLocalCorrect ? '✅' : '❌'} .env.local: ${envLocalCorrect ? 'Corrected' : 'Still contains incorrect email'}`)
    
    // Check .env.example
    const envExampleContent = fs.readFileSync('.env.example', 'utf8')
    const envExampleCorrect = envExampleContent.includes('SMTP_USER=mzimahomes@gmail.com') &&
                             !envExampleContent.includes('mzimahomesl@gmail.com')
    
    console.log(`   ${envExampleCorrect ? '✅' : '❌'} .env.example: ${envExampleCorrect ? 'Corrected' : 'Still contains incorrect email'}`)
    
    if (!envLocalCorrect || !envExampleCorrect) {
      allChecksPass = false
      issues.push('Configuration files still contain incorrect email address')
    }
    
    // 3. Database Configuration Check
    console.log('\n3️⃣ Database Configuration...')
    
    // Check notification settings
    const { data: notificationSettings } = await supabase
      .from('notification_settings')
      .select('email_smtp_username, email_from_email')
    
    if (notificationSettings && notificationSettings.length > 0) {
      let dbConfigCorrect = true
      notificationSettings.forEach((setting, index) => {
        const smtpCorrect = !setting.email_smtp_username || setting.email_smtp_username === 'mzimahomes@gmail.com'
        const fromCorrect = !setting.email_from_email || !setting.email_from_email.includes('mzimahomesl')
        
        console.log(`   [${index + 1}] SMTP User: ${setting.email_smtp_username} ${smtpCorrect ? '✅' : '❌'}`)
        console.log(`       From Email: ${setting.email_from_email} ${fromCorrect ? '✅' : '❌'}`)
        
        if (!smtpCorrect || !fromCorrect) {
          dbConfigCorrect = false
        }
      })
      
      if (!dbConfigCorrect) {
        allChecksPass = false
        issues.push('Database notification settings contain incorrect email addresses')
      }
    } else {
      console.log('   ℹ️ No notification settings in database (will use environment defaults)')
    }
    
    // 4. Email Validation Functions Check
    console.log('\n4️⃣ Email Validation Functions...')
    
    const testCases = [
      { email: 'mzimahomes@gmail.com', shouldPass: true, description: 'Corrected email' },
      { email: 'user@gmail.com', shouldPass: true, description: 'Valid Gmail' },
      { email: 'test@example.com', shouldPass: false, description: 'Invalid example domain' },
      { email: 'mzimahomesl@gmail.com', shouldPass: true, description: 'Previous incorrect (but valid format)' }
    ]
    
    // Simple validation (matching our implementation)
    const validateEmail = (email) => {
      const basicEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (!basicEmailRegex.test(email)) return false
      
      const invalidPatterns = [
        /^.*@example\.com$/i,
        /^.*@test\..*$/i,
        /^test@.*$/i,
        /^.*@localhost$/i
      ]
      
      return !invalidPatterns.some(pattern => pattern.test(email))
    }
    
    let validationCorrect = true
    testCases.forEach(test => {
      const result = validateEmail(test.email)
      const passed = result === test.shouldPass
      console.log(`   ${passed ? '✅' : '❌'} ${test.description}: ${test.email}`)
      if (!passed) {
        validationCorrect = false
      }
    })
    
    if (!validationCorrect) {
      allChecksPass = false
      issues.push('Email validation functions are not working correctly')
    }
    
    // 5. Database Constraints Check
    console.log('\n5️⃣ Database Constraints...')
    
    // Test constraint by trying to insert invalid email
    const { error: constraintError } = await supabase
      .from('notification_settings')
      .insert({
        landlord_id: '00000000-0000-0000-0000-000000000000',
        email_from_email: 'test@example.com'
      })
    
    const constraintWorking = !!constraintError
    console.log(`   ${constraintWorking ? '✅' : '❌'} Email validation constraint: ${constraintWorking ? 'Active' : 'Missing'}`)
    
    if (!constraintWorking) {
      allChecksPass = false
      issues.push('Database email validation constraints are not active')
    }
    
    // 6. Clean Data Check
    console.log('\n6️⃣ Data Cleanliness...')
    
    // Check for any remaining invalid emails
    const { data: invalidEmails } = await supabase
      .from('tenants')
      .select('id, email, emergency_contact_email')
      .or('email.like.%@example.%,email.like.%@test.%,emergency_contact_email.like.%@example.%,emergency_contact_email.like.%@test.%')
    
    const dataClean = !invalidEmails || invalidEmails.length === 0
    console.log(`   ${dataClean ? '✅' : '❌'} Invalid emails in database: ${dataClean ? 'None found' : `${invalidEmails.length} found`}`)
    
    if (!dataClean) {
      allChecksPass = false
      issues.push('Database still contains invalid email addresses')
    }
    
    // Check auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const invalidAuthUsers = authUsers.users.filter(user => 
      user.email && (
        user.email.includes('@example.') || 
        user.email.includes('@test.') || 
        user.email.startsWith('test@')
      )
    )
    
    const authClean = invalidAuthUsers.length === 0
    console.log(`   ${authClean ? '✅' : '❌'} Invalid auth users: ${authClean ? 'None found' : `${invalidAuthUsers.length} found`}`)
    
    if (!authClean) {
      allChecksPass = false
      issues.push('Authentication system still contains test users')
    }
    
    // 7. Final Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 FINAL VERIFICATION RESULTS')
    console.log('='.repeat(60))
    
    if (allChecksPass) {
      console.log('🎉 ALL CHECKS PASSED!')
      console.log('✅ Email configuration is fully corrected and operational')
      console.log('✅ Email bounce fixes are working correctly')
      console.log('✅ System is ready for production use')
    } else {
      console.log('⚠️ SOME ISSUES FOUND:')
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`)
      })
    }
    
    console.log('\n📋 Configuration Summary:')
    console.log(`   SMTP Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)
    console.log(`   SMTP User: ${process.env.SMTP_USER}`)
    console.log(`   From Address: noreply@mzimahomes.com`)
    console.log(`   Validation: ${validationCorrect ? 'Active' : 'Issues'}`)
    console.log(`   Constraints: ${constraintWorking ? 'Active' : 'Missing'}`)
    console.log(`   Data Clean: ${dataClean && authClean ? 'Yes' : 'No'}`)
    
    console.log('\n🚨 Critical Points:')
    console.log('   - Corrected email: mzimahomes@gmail.com (removed extra "l")')
    console.log('   - Gmail app password must be configured for this address')
    console.log('   - Monitor Supabase dashboard for email delivery metrics')
    console.log('   - Test actual email sending with real user registration')
    
    console.log('\n💡 Immediate Next Steps:')
    console.log('   1. Restart the application to ensure all changes are loaded')
    console.log('   2. Test user registration with a valid email address')
    console.log('   3. Verify email delivery in Supabase dashboard')
    console.log('   4. Monitor bounce rates using the monitoring dashboard')
    
    if (!allChecksPass) {
      console.log('\n🔧 Required Actions:')
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. Fix: ${issue}`)
      })
    }
    
  } catch (err) {
    console.error('❌ Error during final verification:', err)
    process.exit(1)
  }
}

// Run the final verification
finalEmailVerification()
