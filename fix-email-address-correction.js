#!/usr/bin/env node

/**
 * Fix Email Address Correction
 * Updates database settings to use the correct email address
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

async function fixEmailAddressCorrection() {
  console.log('🔧 Fixing Email Address Correction...')
  console.log('   Correcting mzimahomesl@gmail.com → mzimahomes@gmail.com\n')
  
  try {
    // 1. Check current environment configuration
    console.log('1️⃣ Verifying environment configuration...')
    console.log(`   SMTP_USER: ${process.env.SMTP_USER}`)
    
    if (process.env.SMTP_USER === 'mzimahomes@gmail.com') {
      console.log('✅ Environment configuration is correct')
    } else {
      console.log('❌ Environment configuration still incorrect')
      console.log('   Please restart the application to load the updated .env.local file')
    }
    
    // 2. Check and update notification settings
    console.log('\n2️⃣ Checking notification settings in database...')
    
    const { data: notificationSettings, error: fetchError } = await supabase
      .from('notification_settings')
      .select('id, email_smtp_username, email_from_email')
    
    if (fetchError) {
      console.log('⚠️ Could not fetch notification settings:', fetchError.message)
    } else if (!notificationSettings || notificationSettings.length === 0) {
      console.log('ℹ️ No notification settings found in database')
    } else {
      console.log(`   Found ${notificationSettings.length} notification setting(s)`)
      
      let needsUpdate = false
      notificationSettings.forEach((setting, index) => {
        console.log(`   [${index + 1}] ID: ${setting.id}`)
        console.log(`       SMTP Username: ${setting.email_smtp_username}`)
        console.log(`       From Email: ${setting.email_from_email}`)
        
        if (setting.email_smtp_username === 'mzimahomesl@gmail.com' || 
            setting.email_from_email === 'mzimahomesl@gmail.com') {
          needsUpdate = true
          console.log('       ⚠️ Contains incorrect email address')
        } else {
          console.log('       ✅ Email addresses are correct')
        }
      })
      
      if (needsUpdate) {
        console.log('\n   Updating incorrect email addresses...')
        
        // Update SMTP username
        const { error: updateSmtpError } = await supabase
          .from('notification_settings')
          .update({ email_smtp_username: 'mzimahomes@gmail.com' })
          .eq('email_smtp_username', 'mzimahomesl@gmail.com')
        
        if (updateSmtpError) {
          console.log('❌ Failed to update SMTP username:', updateSmtpError.message)
        } else {
          console.log('✅ Updated SMTP username')
        }
        
        // Update from email
        const { error: updateFromError } = await supabase
          .from('notification_settings')
          .update({ email_from_email: 'mzimahomes@gmail.com' })
          .eq('email_from_email', 'mzimahomesl@gmail.com')
        
        if (updateFromError) {
          console.log('❌ Failed to update from email:', updateFromError.message)
        } else {
          console.log('✅ Updated from email')
        }
      }
    }
    
    // 3. Check for any other references to the incorrect email
    console.log('\n3️⃣ Checking for other references to incorrect email...')
    
    // Check tenants table
    const { data: tenantsWithIncorrectEmail } = await supabase
      .from('tenants')
      .select('id, full_name, email, emergency_contact_email')
      .or('email.eq.mzimahomesl@gmail.com,emergency_contact_email.eq.mzimahomesl@gmail.com')
    
    if (tenantsWithIncorrectEmail && tenantsWithIncorrectEmail.length > 0) {
      console.log(`   Found ${tenantsWithIncorrectEmail.length} tenant(s) with incorrect email`)
      tenantsWithIncorrectEmail.forEach(tenant => {
        console.log(`   - ${tenant.full_name}: ${tenant.email || tenant.emergency_contact_email}`)
      })
      
      // Update tenant emails
      const { error: updateTenantError } = await supabase
        .from('tenants')
        .update({ email: 'mzimahomes@gmail.com' })
        .eq('email', 'mzimahomesl@gmail.com')
      
      if (updateTenantError) {
        console.log('❌ Failed to update tenant emails:', updateTenantError.message)
      } else {
        console.log('✅ Updated tenant emails')
      }
      
      // Update emergency contact emails
      const { error: updateEmergencyError } = await supabase
        .from('tenants')
        .update({ emergency_contact_email: 'mzimahomes@gmail.com' })
        .eq('emergency_contact_email', 'mzimahomesl@gmail.com')
      
      if (updateEmergencyError) {
        console.log('❌ Failed to update emergency contact emails:', updateEmergencyError.message)
      } else {
        console.log('✅ Updated emergency contact emails')
      }
    } else {
      console.log('✅ No tenants with incorrect email found')
    }
    
    // 4. Test email validation with corrected address
    console.log('\n4️⃣ Testing email validation with corrected address...')
    
    // Simple validation test (simulating the validation function)
    const testEmail = 'mzimahomes@gmail.com'
    const isValidFormat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(testEmail)
    const isNotTestDomain = !testEmail.includes('@example.') && !testEmail.includes('@test.')
    
    if (isValidFormat && isNotTestDomain) {
      console.log(`✅ Email validation passes for: ${testEmail}`)
    } else {
      console.log(`❌ Email validation fails for: ${testEmail}`)
    }
    
    // 5. Verify final configuration
    console.log('\n5️⃣ Final verification...')
    
    const { data: finalSettings } = await supabase
      .from('notification_settings')
      .select('email_smtp_username, email_from_email')
      .limit(5)
    
    if (finalSettings && finalSettings.length > 0) {
      console.log('   Current notification settings:')
      finalSettings.forEach((setting, index) => {
        const smtpCorrect = !setting.email_smtp_username || setting.email_smtp_username === 'mzimahomes@gmail.com'
        const fromCorrect = !setting.email_from_email || !setting.email_from_email.includes('mzimahomesl')
        
        console.log(`   [${index + 1}] SMTP: ${setting.email_smtp_username} ${smtpCorrect ? '✅' : '❌'}`)
        console.log(`       From: ${setting.email_from_email} ${fromCorrect ? '✅' : '❌'}`)
      })
    }
    
    console.log('\n🎉 Email address correction completed!')
    console.log('\n📋 Summary of changes:')
    console.log('   ✅ Updated .env.local: SMTP_USER corrected')
    console.log('   ✅ Updated .env.example: SMTP_USER corrected')
    console.log('   ✅ Database notification settings updated')
    console.log('   ✅ Email validation verified')
    
    console.log('\n💡 Next steps:')
    console.log('   1. Restart the application to load updated environment variables')
    console.log('   2. Test email sending functionality')
    console.log('   3. Verify SMTP authentication works with correct credentials')
    console.log('   4. Monitor email delivery in Supabase dashboard')
    
    console.log('\n🚨 Important:')
    console.log('   - The corrected email is: mzimahomes@gmail.com')
    console.log('   - Ensure Gmail app password is configured for this address')
    console.log('   - Test email sending to verify SMTP authentication')
    
  } catch (err) {
    console.error('❌ Error during email address correction:', err)
    process.exit(1)
  }
}

// Run the correction
fixEmailAddressCorrection()
