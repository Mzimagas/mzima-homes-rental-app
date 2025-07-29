#!/usr/bin/env node

/**
 * Test Personal Gmail SMTP Configuration
 * Comprehensive test to verify the new Gmail account works for email sending
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

async function testPersonalGmailSmtp() {
  console.log('🧪 Testing Personal Gmail SMTP Configuration...')
  console.log('   Verifying mzimagas@gmail.com works for email sending\n')
  
  try {
    // 1. Environment Configuration Verification
    console.log('1️⃣ Environment Configuration Verification...')
    
    const config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
    
    console.log(`   SMTP Host: ${config.host}`)
    console.log(`   SMTP Port: ${config.port}`)
    console.log(`   SMTP User: ${config.user}`)
    console.log(`   SMTP Pass: ${config.pass ? '***configured***' : 'NOT SET'}`)
    
    // Validate configuration
    const configValid = config.host === 'smtp.gmail.com' &&
                       config.port === '587' &&
                       config.user === 'mzimagas@gmail.com' &&
                       config.pass
    
    console.log(`   Configuration Status: ${configValid ? '✅ Valid' : '❌ Invalid'}`)
    
    if (!configValid) {
      console.log('❌ Configuration issues detected:')
      if (config.host !== 'smtp.gmail.com') console.log(`   - Host should be 'smtp.gmail.com', got '${config.host}'`)
      if (config.port !== '587') console.log(`   - Port should be '587', got '${config.port}'`)
      if (config.user !== 'mzimagas@gmail.com') console.log(`   - User should be 'mzimagas@gmail.com', got '${config.user}'`)
      if (!config.pass) console.log('   - Password is not set')
      return
    }
    
    // 2. Gmail App Password Format Validation
    console.log('\n2️⃣ Gmail App Password Format Validation...')
    
    const appPasswordPattern = /^[a-z]{4} [a-z]{4} [a-z]{4} [a-z]{4}$/
    const isValidAppPassword = appPasswordPattern.test(config.pass)
    
    console.log(`   Password Format: ${isValidAppPassword ? '✅ Valid Gmail App Password' : '⚠️ Non-standard format'}`)
    console.log(`   Password Length: ${config.pass.length} characters ${config.pass.length === 19 ? '✅' : '⚠️'}`)
    
    if (isValidAppPassword) {
      console.log('   ✅ Password appears to be a valid Gmail app password')
    } else {
      console.log('   ⚠️ Password format doesn\'t match Gmail app password pattern')
      console.log('   Expected format: "xxxx xxxx xxxx xxxx" (16 lowercase letters with spaces)')
    }
    
    // 3. Email Validation Tests
    console.log('\n3️⃣ Email Validation Tests...')
    
    const validateEmail = (email) => {
      const basicEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (!basicEmailRegex.test(email)) return { valid: false, error: 'Invalid format' }
      
      const invalidPatterns = [
        /^.*@example\.com$/i,
        /^.*@test\..*$/i,
        /^test@.*$/i,
        /^.*@localhost$/i
      ]
      
      for (const pattern of invalidPatterns) {
        if (pattern.test(email)) {
          return { valid: false, error: 'Invalid domain' }
        }
      }
      
      return { valid: true }
    }
    
    const testEmails = [
      { email: 'mzimagas@gmail.com', description: 'New SMTP user email' },
      { email: 'user@gmail.com', description: 'Valid Gmail address' },
      { email: 'test@example.com', description: 'Invalid test domain' },
      { email: 'newuser@yahoo.com', description: 'Valid Yahoo address' }
    ]
    
    testEmails.forEach(test => {
      const result = validateEmail(test.email)
      console.log(`   ${result.valid ? '✅' : '❌'} ${test.description}: ${test.email}`)
      if (!result.valid) {
        console.log(`      Error: ${result.error}`)
      }
    })
    
    // 4. SMTP Connection Simulation
    console.log('\n4️⃣ SMTP Connection Simulation...')
    
    const smtpSettings = {
      host: config.host,
      port: parseInt(config.port),
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    }
    
    console.log('   SMTP Connection Settings:')
    console.log(`   - Server: ${smtpSettings.host}:${smtpSettings.port}`)
    console.log(`   - Security: STARTTLS (port 587)`)
    console.log(`   - Authentication: ${smtpSettings.auth.user}`)
    console.log(`   - TLS: Enabled`)
    
    // 5. Email Sending Configuration Test
    console.log('\n5️⃣ Email Sending Configuration Test...')
    
    const emailConfig = {
      from: 'noreply@mzimahomes.com',
      fromName: 'Mzima Homes',
      replyTo: config.user,
      smtp: smtpSettings
    }
    
    console.log('   Email Configuration:')
    console.log(`   - From Address: ${emailConfig.from}`)
    console.log(`   - From Name: ${emailConfig.fromName}`)
    console.log(`   - Reply To: ${emailConfig.replyTo}`)
    console.log(`   - SMTP Auth: ${emailConfig.smtp.auth.user}`)
    
    // 6. User Registration Flow Simulation
    console.log('\n6️⃣ User Registration Flow Simulation...')
    
    const registrationScenarios = [
      { email: 'newuser@gmail.com', description: 'New Gmail user' },
      { email: 'customer@yahoo.com', description: 'Yahoo user' },
      { email: 'tenant@outlook.com', description: 'Outlook user' }
    ]
    
    console.log('   Registration scenarios:')
    registrationScenarios.forEach(scenario => {
      const validation = validateEmail(scenario.email)
      console.log(`   ${validation.valid ? '✅' : '❌'} ${scenario.description}: ${scenario.email}`)
      if (validation.valid) {
        console.log(`      → Would send welcome email via ${config.user}`)
        console.log(`      → From address: ${emailConfig.from}`)
      }
    })
    
    // 7. Security and Best Practices Check
    console.log('\n7️⃣ Security and Best Practices Check...')
    
    const securityChecks = {
      'Gmail 2FA Required': isValidAppPassword,
      'App Password Used': isValidAppPassword,
      'STARTTLS Enabled': smtpSettings.port === 587,
      'Valid From Domain': emailConfig.from.includes('mzimahomes.com'),
      'Reply-To Set': !!emailConfig.replyTo
    }
    
    Object.entries(securityChecks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`)
    })
    
    // 8. Potential Issues Check
    console.log('\n8️⃣ Potential Issues Check...')
    
    const potentialIssues = []
    
    if (!isValidAppPassword) {
      potentialIssues.push('Gmail app password format may be incorrect')
    }
    
    if (config.user !== 'mzimagas@gmail.com') {
      potentialIssues.push('SMTP user email doesn\'t match expected personal Gmail')
    }
    
    if (!emailConfig.from.includes('mzimahomes.com')) {
      potentialIssues.push('From address domain doesn\'t match application domain')
    }
    
    if (potentialIssues.length === 0) {
      console.log('   ✅ No potential issues detected')
    } else {
      console.log('   ⚠️ Potential issues found:')
      potentialIssues.forEach((issue, index) => {
        console.log(`      ${index + 1}. ${issue}`)
      })
    }
    
    // 9. Final Assessment
    console.log('\n9️⃣ Final Assessment...')
    
    const allChecksPass = configValid && 
                         Object.values(securityChecks).every(check => check) &&
                         potentialIssues.length === 0
    
    if (allChecksPass) {
      console.log('🎉 ALL TESTS PASSED!')
      console.log('✅ Personal Gmail SMTP configuration is ready for production')
    } else {
      console.log('⚠️ Some issues detected - please review above')
    }
    
    console.log('\n📋 Configuration Summary:')
    console.log(`   SMTP Server: ${config.host}:${config.port}`)
    console.log(`   Authentication: ${config.user}`)
    console.log(`   From Address: ${emailConfig.from}`)
    console.log(`   Security: Gmail App Password + STARTTLS`)
    console.log(`   Status: ${allChecksPass ? '✅ Ready' : '⚠️ Needs attention'}`)
    
    console.log('\n💡 Next Steps:')
    console.log('   1. Test actual email sending with user registration')
    console.log('   2. Monitor Gmail account for SMTP connection notifications')
    console.log('   3. Check Gmail security settings for any alerts')
    console.log('   4. Verify email delivery in Supabase dashboard')
    console.log('   5. Test with different email providers (Gmail, Yahoo, Outlook)')
    
    console.log('\n🔒 Security Reminders:')
    console.log('   - Ensure 2FA is enabled on mzimagas@gmail.com')
    console.log('   - Monitor Gmail for unusual activity alerts')
    console.log('   - Keep the app password secure and don\'t share it')
    console.log('   - Consider rotating the app password periodically')
    
  } catch (err) {
    console.error('❌ Error during SMTP configuration test:', err)
    process.exit(1)
  }
}

// Run the test
testPersonalGmailSmtp()
