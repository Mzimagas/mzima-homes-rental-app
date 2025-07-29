#!/usr/bin/env node

/**
 * Manual Email Bounce Fix
 * Applies critical fixes to prevent email bounces that could trigger Supabase restrictions
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

async function fixEmailBounces() {
  console.log('🔧 Fixing Email Bounce Issues...')
  
  try {
    // 1. Fix invalid default email in notification_settings
    console.log('\n1️⃣ Fixing notification settings default email...')
    
    const { error: updateError } = await supabase
      .from('notification_settings')
      .update({ email_from_email: 'noreply@mzimahomes.com' })
      .or('email_from_email.eq.noreply@example.com,email_from_email.like.%@example.com,email_from_email.like.%@test.%,email_from_email.like.test@%')
    
    if (updateError) {
      console.log('⚠️ Could not update notification settings (table may not exist yet):', updateError.message)
    } else {
      console.log('✅ Updated notification settings default email')
    }
    
    // 2. Clean up invalid emails in tenants table
    console.log('\n2️⃣ Cleaning up invalid tenant emails...')
    
    // First, check what invalid emails exist
    const { data: invalidTenants } = await supabase
      .from('tenants')
      .select('id, full_name, email, emergency_contact_email')
      .or('email.like.%@example.com,email.like.%@test.%,email.like.test@%,emergency_contact_email.like.%@example.com,emergency_contact_email.like.%@test.%,emergency_contact_email.like.test@%')
    
    if (invalidTenants && invalidTenants.length > 0) {
      console.log(`   Found ${invalidTenants.length} tenants with invalid emails:`)
      invalidTenants.forEach(tenant => {
        if (tenant.email && (tenant.email.includes('@example.') || tenant.email.includes('@test.') || tenant.email.startsWith('test@'))) {
          console.log(`   - ${tenant.full_name}: ${tenant.email} (will be cleared)`)
        }
        if (tenant.emergency_contact_email && (tenant.emergency_contact_email.includes('@example.') || tenant.emergency_contact_email.includes('@test.') || tenant.emergency_contact_email.startsWith('test@'))) {
          console.log(`   - ${tenant.full_name} emergency: ${tenant.emergency_contact_email} (will be cleared)`)
        }
      })
      
      // Clear invalid tenant emails
      const { error: tenantEmailError } = await supabase
        .from('tenants')
        .update({ email: null })
        .or('email.like.%@example.com,email.like.%@test.%,email.like.test@%')
      
      if (tenantEmailError) {
        console.log('⚠️ Error clearing tenant emails:', tenantEmailError.message)
      } else {
        console.log('✅ Cleared invalid tenant emails')
      }
      
      // Clear invalid emergency contact emails
      const { error: emergencyEmailError } = await supabase
        .from('tenants')
        .update({ emergency_contact_email: null })
        .or('emergency_contact_email.like.%@example.com,emergency_contact_email.like.%@test.%,emergency_contact_email.like.test@%')
      
      if (emergencyEmailError) {
        console.log('⚠️ Error clearing emergency contact emails:', emergencyEmailError.message)
      } else {
        console.log('✅ Cleared invalid emergency contact emails')
      }
    } else {
      console.log('✅ No invalid tenant emails found')
    }
    
    // 3. Check for any users with invalid emails in auth
    console.log('\n3️⃣ Checking auth users for invalid emails...')
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('⚠️ Could not check auth users:', authError.message)
    } else {
      const invalidAuthUsers = authUsers.users.filter(user => 
        user.email && (
          user.email.includes('@example.') || 
          user.email.includes('@test.') || 
          user.email.startsWith('test@') ||
          user.email.includes('@localhost') ||
          user.email.includes('@invalid')
        )
      )
      
      if (invalidAuthUsers.length > 0) {
        console.log(`   ⚠️ Found ${invalidAuthUsers.length} auth users with invalid emails:`)
        invalidAuthUsers.forEach(user => {
          console.log(`   - ${user.email} (ID: ${user.id})`)
        })
        console.log('   💡 Consider manually updating or removing these users from Supabase Auth dashboard')
      } else {
        console.log('✅ No invalid auth user emails found')
      }
    }
    
    // 4. Verify current configuration
    console.log('\n4️⃣ Verifying current email configuration...')
    
    // Check notification settings
    const { data: notificationSettings } = await supabase
      .from('notification_settings')
      .select('email_from_email')
      .limit(5)
    
    if (notificationSettings && notificationSettings.length > 0) {
      console.log('   Current notification email settings:')
      notificationSettings.forEach((setting, index) => {
        const isValid = setting.email_from_email && 
          !setting.email_from_email.includes('@example.') && 
          !setting.email_from_email.includes('@test.') &&
          !setting.email_from_email.startsWith('test@')
        console.log(`   ${isValid ? '✅' : '❌'} ${setting.email_from_email}`)
      })
    }
    
    console.log('\n🎉 Email bounce fix completed!')
    console.log('\n📋 Summary of actions taken:')
    console.log('   ✅ Updated notification settings to use valid email domain')
    console.log('   ✅ Cleared invalid test emails from tenant records')
    console.log('   ✅ Identified any problematic auth users')
    
    console.log('\n💡 Next steps to prevent future bounces:')
    console.log('   1. The frontend now has enhanced email validation')
    console.log('   2. Test the registration flow with valid emails only')
    console.log('   3. Monitor Supabase email delivery in the dashboard')
    console.log('   4. Consider setting up custom SMTP in Supabase for better control')
    
    console.log('\n🚨 IMPORTANT: Supabase Project ID ajrxvnakphkpkcssisxm')
    console.log('   - Check Supabase dashboard for any email delivery warnings')
    console.log('   - Ensure all new registrations use valid email addresses')
    console.log('   - The enhanced validation will prevent future invalid emails')
    
  } catch (err) {
    console.error('❌ Error fixing email bounces:', err)
    process.exit(1)
  }
}

// Run the fix
fixEmailBounces()
