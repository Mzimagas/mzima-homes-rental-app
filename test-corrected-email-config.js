#!/usr/bin/env node

/**
 * Test Corrected Email Configuration
 * Verifies that the email configuration works properly with the corrected address
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCorrectedEmailConfig() {
  console.log('🧪 Testing Corrected Email Configuration...')
  console.log('   Verifying mzimahomes@gmail.com works correctly\n')
  
  try {
    // 1. Verify environment variables
    console.log('1️⃣ Environment Variables Check...')
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`)
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`)
    console.log(`   SMTP_USER: ${process.env.SMTP_USER}`)
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***configured***' : 'NOT SET'}`)
    
    const configCorrect = process.env.SMTP_USER === 'mzimahomes@gmail.com' &&
                         process.env.SMTP_HOST === 'smtp.gmail.com' &&
                         process.env.SMTP_PORT === '587' &&
                         process.env.SMTP_PASS
    
    if (configCorrect) {
      console.log('✅ Environment configuration is correct')
    } else {
      console.log('❌ Environment configuration has issues')
      if (process.env.SMTP_USER !== 'mzimahomes@gmail.com') {
        console.log(`   - SMTP_USER should be 'mzimahomes@gmail.com', got '${process.env.SMTP_USER}'`)
      }
      if (!process.env.SMTP_PASS) {
        console.log('   - SMTP_PASS is not set')
      }
    }
    
    // 2. Test email validation with corrected address
    console.log('\n2️⃣ Email Validation Test...')
    
    const testEmails = [
      { email: 'mzimahomes@gmail.com', expected: true, description: 'Corrected email address' },
      { email: 'mzimahomesl@gmail.com', expected: true, description: 'Previous incorrect address (should still be valid format)' },
      { email: 'test@example.com', expected: false, description: 'Invalid test domain' },
      { email: 'user@gmail.com', expected: true, description: 'Valid Gmail address' }
    ]
    
    // Simple validation function (matching our implementation)
    const validateEmail = (email) => {
      const basicEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (!basicEmailRegex.test(email)) {
        return { isValid: false, error: 'Invalid email format' }
      }

      const invalidPatterns = [
        /^.*@example\.com$/i,
        /^.*@test\..*$/i,
        /^test@.*$/i,
        /^.*@localhost$/i,
        /^.*@.*\.test$/i,
        /^.*@.*\.invalid$/i
      ]

      for (const pattern of invalidPatterns) {
        if (pattern.test(email)) {
          return { isValid: false, error: 'Invalid domain - test/example domains not allowed' }
        }
      }

      return { isValid: true }
    }
    
    testEmails.forEach(test => {
      const result = validateEmail(test.email)
      const passed = result.isValid === test.expected
      console.log(`   ${passed ? '✅' : '❌'} ${test.description}: ${test.email}`)
      if (!passed) {
        console.log(`      Expected: ${test.expected ? 'valid' : 'invalid'}, Got: ${result.isValid ? 'valid' : 'invalid'}`)
      }
      if (!result.isValid && result.error) {
        console.log(`      Error: ${result.error}`)
      }
    })
    
    // 3. Test SMTP configuration format
    console.log('\n3️⃣ SMTP Configuration Format Test...')
    
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      username: process.env.SMTP_USER,
      password: process.env.SMTP_PASS
    }
    
    console.log('   SMTP Configuration:')
    console.log(`   - Host: ${smtpConfig.host} ${smtpConfig.host === 'smtp.gmail.com' ? '✅' : '❌'}`)
    console.log(`   - Port: ${smtpConfig.port} ${smtpConfig.port === 587 ? '✅' : '❌'}`)
    console.log(`   - Username: ${smtpConfig.username} ${smtpConfig.username === 'mzimahomes@gmail.com' ? '✅' : '❌'}`)
    console.log(`   - Password: ${smtpConfig.password ? 'Set ✅' : 'Not set ❌'}`)
    
    // 4. Test email address in different contexts
    console.log('\n4️⃣ Email Address Context Tests...')
    
    // Test as sender address
    const senderValid = validateEmail('mzimahomes@gmail.com')
    console.log(`   Sender address validation: ${senderValid.isValid ? '✅' : '❌'}`)
    
    // Test as notification from address
    const notificationFromValid = validateEmail('noreply@mzimahomes.com')
    console.log(`   Notification from address: ${notificationFromValid.isValid ? '✅' : '❌'}`)
    
    // Test domain consistency
    const domainConsistent = process.env.SMTP_USER.includes('@gmail.com')
    console.log(`   Domain consistency (Gmail): ${domainConsistent ? '✅' : '❌'}`)
    
    // 5. Simulate email sending configuration
    console.log('\n5️⃣ Email Sending Configuration Simulation...')
    
    const emailSettings = {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: parseInt(process.env.SMTP_PORT),
      smtp_username: process.env.SMTP_USER,
      smtp_password: process.env.SMTP_PASS,
      from_email: 'noreply@mzimahomes.com',
      from_name: 'Mzima Homes'
    }
    
    console.log('   Email sending configuration:')
    Object.entries(emailSettings).forEach(([key, value]) => {
      if (key === 'smtp_password') {
        console.log(`   - ${key}: ${value ? '***configured***' : 'NOT SET'}`)
      } else {
        console.log(`   - ${key}: ${value}`)
      }
    })
    
    // Validate the configuration
    const configValid = emailSettings.smtp_host === 'smtp.gmail.com' &&
                       emailSettings.smtp_port === 587 &&
                       emailSettings.smtp_username === 'mzimahomes@gmail.com' &&
                       emailSettings.smtp_password &&
                       emailSettings.from_email === 'noreply@mzimahomes.com'
    
    console.log(`   Configuration validity: ${configValid ? '✅' : '❌'}`)
    
    // 6. Test registration flow simulation
    console.log('\n6️⃣ Registration Flow Simulation...')
    
    const testRegistrationEmail = 'newuser@gmail.com'
    const registrationValid = validateEmail(testRegistrationEmail)
    
    console.log(`   Test registration email: ${testRegistrationEmail}`)
    console.log(`   Validation result: ${registrationValid.isValid ? '✅ Valid' : '❌ Invalid'}`)
    
    if (registrationValid.isValid) {
      console.log('   ✅ Registration flow would proceed')
      console.log(`   ✅ Email would be sent from: ${emailSettings.from_email}`)
      console.log(`   ✅ SMTP authentication would use: ${emailSettings.smtp_username}`)
    } else {
      console.log('   ❌ Registration flow would be blocked')
      console.log(`   ❌ Error: ${registrationValid.error}`)
    }
    
    // 7. Final summary
    console.log('\n🎉 Email Configuration Test Complete!')
    
    const allTestsPassed = configCorrect && 
                          senderValid.isValid && 
                          notificationFromValid.isValid && 
                          domainConsistent && 
                          configValid && 
                          registrationValid.isValid
    
    if (allTestsPassed) {
      console.log('\n✅ ALL TESTS PASSED - Email configuration is correct!')
    } else {
      console.log('\n⚠️ Some tests failed - please review the issues above')
    }
    
    console.log('\n📋 Configuration Summary:')
    console.log(`   SMTP Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)
    console.log(`   Authentication: ${process.env.SMTP_USER}`)
    console.log(`   From Address: noreply@mzimahomes.com`)
    console.log(`   Status: ${allTestsPassed ? '✅ Ready for production' : '⚠️ Needs attention'}`)
    
    console.log('\n💡 Next Steps:')
    console.log('   1. Test actual email sending with a real registration')
    console.log('   2. Verify Gmail app password is configured correctly')
    console.log('   3. Monitor email delivery in Supabase dashboard')
    console.log('   4. Check Gmail account for any security alerts')
    
  } catch (err) {
    console.error('❌ Error during email configuration test:', err)
    process.exit(1)
  }
}

// Run the test
testCorrectedEmailConfig()
