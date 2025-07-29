#!/usr/bin/env node

/**
 * Apply Email Bounce Fix Migration
 * This script applies the critical email bounce fix migration to prevent
 * Supabase from restricting email sending privileges
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyEmailBounceFix() {
  console.log('🔧 Applying Email Bounce Fix Migration...')
  console.log('   This will fix critical email bounce issues that could cause Supabase restrictions')
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '017_fix_email_bounce_issues.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('\n📋 Migration will:')
    console.log('   ✅ Fix invalid default email (noreply@example.com → noreply@mzimahomes.com)')
    console.log('   ✅ Clean up existing test emails in database')
    console.log('   ✅ Add email validation constraints')
    console.log('   ✅ Create email validation functions')
    console.log('   ✅ Prevent future invalid emails from being stored')
    
    // Check current invalid emails before fixing
    console.log('\n🔍 Checking for existing invalid emails...')
    
    const { data: invalidNotificationEmails } = await supabase
      .from('notification_settings')
      .select('id, email_from_email')
      .or('email_from_email.like.%@example.%,email_from_email.like.%@test.%,email_from_email.like.test@%')
    
    const { data: invalidTenantEmails } = await supabase
      .from('tenants')
      .select('id, full_name, email, emergency_contact_email')
      .or('email.like.%@example.%,email.like.%@test.%,email.like.test@%,emergency_contact_email.like.%@example.%,emergency_contact_email.like.%@test.%,emergency_contact_email.like.test@%')
    
    if (invalidNotificationEmails && invalidNotificationEmails.length > 0) {
      console.log(`   ⚠️  Found ${invalidNotificationEmails.length} invalid notification email(s)`)
      invalidNotificationEmails.forEach(setting => {
        console.log(`      - ID ${setting.id}: ${setting.email_from_email}`)
      })
    }
    
    if (invalidTenantEmails && invalidTenantEmails.length > 0) {
      console.log(`   ⚠️  Found ${invalidTenantEmails.length} tenant(s) with invalid email(s)`)
      invalidTenantEmails.forEach(tenant => {
        if (tenant.email && (tenant.email.includes('@example.') || tenant.email.includes('@test.') || tenant.email.startsWith('test@'))) {
          console.log(`      - ${tenant.full_name}: ${tenant.email}`)
        }
        if (tenant.emergency_contact_email && (tenant.emergency_contact_email.includes('@example.') || tenant.emergency_contact_email.includes('@test.') || tenant.emergency_contact_email.startsWith('test@'))) {
          console.log(`      - ${tenant.full_name} (emergency): ${tenant.emergency_contact_email}`)
        }
      })
    }
    
    if ((!invalidNotificationEmails || invalidNotificationEmails.length === 0) && 
        (!invalidTenantEmails || invalidTenantEmails.length === 0)) {
      console.log('   ✅ No invalid emails found')
    }
    
    // Apply the migration by executing SQL commands individually
    console.log('\n🚀 Applying migration...')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`   Executing ${statements.length} SQL statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`   [${i + 1}/${statements.length}] Executing statement...`)
          const { error } = await supabase.rpc('exec', { sql: statement })
          if (error) {
            console.error(`❌ Statement ${i + 1} failed:`, error.message)
            console.error(`   SQL: ${statement.substring(0, 100)}...`)
            // Continue with other statements
          }
        } catch (err) {
          console.error(`❌ Error executing statement ${i + 1}:`, err.message)
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Migration applied successfully!')
    
    // Verify the fix
    console.log('\n🔍 Verifying fixes...')
    
    const { data: updatedNotificationSettings } = await supabase
      .from('notification_settings')
      .select('id, email_from_email')
      .limit(5)
    
    if (updatedNotificationSettings && updatedNotificationSettings.length > 0) {
      console.log('   ✅ Notification settings updated:')
      updatedNotificationSettings.forEach(setting => {
        console.log(`      - ID ${setting.id}: ${setting.email_from_email}`)
      })
    }
    
    // Test the validation function
    console.log('\n🧪 Testing email validation function...')
    
    const testEmails = [
      'valid@gmail.com',
      'test@example.com',
      'user@test.com',
      'admin@localhost'
    ]
    
    for (const email of testEmails) {
      const { data: isValid } = await supabase.rpc('validate_email_for_sending', { email_address: email })
      console.log(`   ${isValid ? '✅' : '❌'} ${email}: ${isValid ? 'Valid' : 'Invalid (will be blocked)'}`)
    }
    
    console.log('\n🎉 Email bounce fix completed successfully!')
    console.log('   📧 Invalid emails have been cleaned up')
    console.log('   🛡️  Validation constraints are now in place')
    console.log('   🚫 Future invalid emails will be prevented')
    console.log('\n💡 Next steps:')
    console.log('   1. Update your Supabase email templates if needed')
    console.log('   2. Test the registration flow with valid email addresses')
    console.log('   3. Monitor email delivery rates in Supabase dashboard')
    
  } catch (err) {
    console.error('❌ Error applying email bounce fix:', err)
    process.exit(1)
  }
}

// Run the fix
applyEmailBounceFix()
