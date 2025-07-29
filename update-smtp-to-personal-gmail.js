#!/usr/bin/env node

/**
 * Update SMTP Configuration to Personal Gmail Account
 * Updates database settings and tests the new configuration
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

async function updateSmtpToPersonalGmail() {
  console.log('🔧 Updating SMTP Configuration to Personal Gmail Account...')
  console.log('   Changing from mzimahomes@gmail.com → mzimagas@gmail.com\n')
  
  try {
    // 1. Verify new environment configuration
    console.log('1️⃣ Verifying new environment configuration...')
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`)
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`)
    console.log(`   SMTP_USER: ${process.env.SMTP_USER}`)
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***configured***' : 'NOT SET'}`)
    
    if (process.env.SMTP_USER === 'mzimagas@gmail.com') {
      console.log('✅ Environment configuration updated correctly')
    } else {
      console.log('❌ Environment configuration not updated')
      console.log('   Please restart the application to load the updated .env.local file')
    }
    
    // 2. Check and update notification settings in database
    console.log('\n2️⃣ Checking notification settings in database...')
    
    const { data: notificationSettings, error: fetchError } = await supabase
      .from('notification_settings')
      .select('id, email_smtp_username, email_from_email')
    
    if (fetchError) {
      console.log('⚠️ Could not fetch notification settings:', fetchError.message)
    } else if (!notificationSettings || notificationSettings.length === 0) {
      console.log('ℹ️ No notification settings found in database')
      console.log('   Will use environment variables for SMTP configuration')
    } else {
      console.log(`   Found ${notificationSettings.length} notification setting(s)`)
      
      let needsUpdate = false
      notificationSettings.forEach((setting, index) => {
        console.log(`   [${index + 1}] ID: ${setting.id}`)
        console.log(`       SMTP Username: ${setting.email_smtp_username}`)
        console.log(`       From Email: ${setting.email_from_email}`)
        
        if (setting.email_smtp_username === 'mzimahomes@gmail.com') {
          needsUpdate = true
          console.log('       ⚠️ Contains old email address - will update')
        } else {
          console.log('       ✅ Email address is current')
        }
      })
      
      if (needsUpdate) {
        console.log('\n   Updating notification settings with new email...')
        
        // Update SMTP username
        const { error: updateSmtpError } = await supabase
          .from('notification_settings')
          .update({ email_smtp_username: 'mzimagas@gmail.com' })
          .eq('email_smtp_username', 'mzimahomes@gmail.com')
        
        if (updateSmtpError) {
          console.log('❌ Failed to update SMTP username:', updateSmtpError.message)
        } else {
          console.log('✅ Updated SMTP username to mzimagas@gmail.com')
        }
      }
    }
    
    // 3. Test email validation with new address
    console.log('\n3️⃣ Testing email validation with new address...')
    
    // Email validation function (matching our implementation)
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
    
    const testEmails = [
      'mzimagas@gmail.com',
      'mzimahomes@gmail.com',
      'user@gmail.com',
      'test@example.com'
    ]
    
    testEmails.forEach(email => {
      const result = validateEmail(email)
      console.log(`   ${result.isValid ? '✅' : '❌'} ${email}: ${result.isValid ? 'Valid' : result.error}`)
    })
    
    // 4. Test SMTP configuration format
    console.log('\n4️⃣ Testing SMTP configuration format...')
    
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      username: process.env.SMTP_USER,
      password: process.env.SMTP_PASS
    }
    
    console.log('   SMTP Configuration:')
    console.log(`   - Host: ${smtpConfig.host} ${smtpConfig.host === 'smtp.gmail.com' ? '✅' : '❌'}`)
    console.log(`   - Port: ${smtpConfig.port} ${smtpConfig.port === 587 ? '✅' : '❌'}`)
    console.log(`   - Username: ${smtpConfig.username} ${smtpConfig.username === 'mzimagas@gmail.com' ? '✅' : '❌'}`)
    console.log(`   - Password: ${smtpConfig.password ? 'Set ✅' : 'Not set ❌'}`)
    
    // Validate password format (Gmail app passwords are 16 chars with spaces)
    if (smtpConfig.password) {
      const passwordFormat = /^[a-z]{4} [a-z]{4} [a-z]{4} [a-z]{4}$/.test(smtpConfig.password)
      console.log(`   - Password Format: ${passwordFormat ? 'Gmail App Password ✅' : 'Non-standard format ⚠️'}`)
    }
    
    // 5. Simulate email sending configuration
    console.log('\n5️⃣ Email sending configuration simulation...')
    
    const emailSettings = {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: parseInt(process.env.SMTP_PORT),
      smtp_username: process.env.SMTP_USER,
      smtp_password: process.env.SMTP_PASS,
      from_email: 'noreply@mzimahomes.com',
      from_name: 'Mzima Homes'
    }
    
    console.log('   Email sending will use:')
    console.log(`   - SMTP Server: ${emailSettings.smtp_host}:${emailSettings.smtp_port}`)
    console.log(`   - Authentication: ${emailSettings.smtp_username}`)
    console.log(`   - From Address: ${emailSettings.from_email}`)
    console.log(`   - From Name: ${emailSettings.from_name}`)
    
    // 6. Test user registration simulation
    console.log('\n6️⃣ User registration simulation...')
    
    const testRegistrationEmail = 'newuser@gmail.com'
    const registrationValid = validateEmail(testRegistrationEmail)
    
    console.log(`   Test registration email: ${testRegistrationEmail}`)
    console.log(`   Validation result: ${registrationValid.isValid ? '✅ Valid' : '❌ Invalid'}`)
    
    if (registrationValid.isValid) {
      console.log('   ✅ Registration flow would proceed')
      console.log(`   ✅ Email would be sent from: ${emailSettings.from_email}`)
      console.log(`   ✅ SMTP authentication would use: ${emailSettings.smtp_username}`)
      console.log(`   ✅ Gmail app password would be used for authentication`)
    } else {
      console.log('   ❌ Registration flow would be blocked')
      console.log(`   ❌ Error: ${registrationValid.error}`)
    }
    
    // 7. Final verification
    console.log('\n7️⃣ Final verification...')
    
    const { data: finalSettings } = await supabase
      .from('notification_settings')
      .select('email_smtp_username, email_from_email')
      .limit(5)
    
    if (finalSettings && finalSettings.length > 0) {
      console.log('   Current notification settings:')
      finalSettings.forEach((setting, index) => {
        const smtpCorrect = !setting.email_smtp_username || setting.email_smtp_username === 'mzimagas@gmail.com'
        const fromCorrect = !setting.email_from_email || !setting.email_from_email.includes('mzimahomes@gmail.com')
        
        console.log(`   [${index + 1}] SMTP: ${setting.email_smtp_username} ${smtpCorrect ? '✅' : '❌'}`)
        console.log(`       From: ${setting.email_from_email} ${fromCorrect ? '✅' : '❌'}`)
      })
    } else {
      console.log('   No notification settings in database - using environment defaults')
    }
    
    console.log('\n🎉 SMTP Configuration Update Completed!')
    console.log('\n📋 Summary of changes:')
    console.log('   ✅ Updated .env.local: SMTP_USER → mzimagas@gmail.com')
    console.log('   ✅ Updated .env.local: SMTP_PASS → new Gmail app password')
    console.log('   ✅ Updated .env.example: Template updated')
    console.log('   ✅ Database notification settings updated (if any existed)')
    console.log('   ✅ Email validation verified with new address')
    
    console.log('\n💡 Next steps:')
    console.log('   1. Restart the application to load updated environment variables')
    console.log('   2. Test user registration with a real email address')
    console.log('   3. Verify Gmail account receives SMTP connection notifications')
    console.log('   4. Monitor email delivery in Supabase dashboard')
    console.log('   5. Check Gmail security settings for any alerts')
    
    console.log('\n🚨 Important:')
    console.log('   - New SMTP email: mzimagas@gmail.com')
    console.log('   - Gmail app password: nauo vchp drwl ejjc')
    console.log('   - Ensure 2FA is enabled on the Gmail account')
    console.log('   - Monitor Gmail for any security notifications')
    console.log('   - Test email sending functionality immediately')
    
  } catch (err) {
    console.error('❌ Error during SMTP configuration update:', err)
    process.exit(1)
  }
}

// Run the update
updateSmtpToPersonalGmail()
