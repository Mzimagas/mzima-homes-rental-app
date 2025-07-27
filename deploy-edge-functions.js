#!/usr/bin/env node

/**
 * Helper script to deploy Edge Functions to Supabase
 * This script provides instructions and code snippets for manual deployment
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const functionsDir = path.join(__dirname, 'supabase', 'functions')

function readFunctionCode(functionName) {
  const functionPath = path.join(functionsDir, functionName, 'index.ts')
  try {
    return fs.readFileSync(functionPath, 'utf8')
  } catch (err) {
    return null
  }
}

function generateDeploymentInstructions() {
  console.log('🚀 Edge Functions Deployment Guide')
  console.log('=====================================\n')
  
  console.log('The FunctionsFetchError occurs because Edge Functions are not deployed.')
  console.log('Here are your deployment options:\n')
  
  console.log('📋 Option 1: Manual Deployment via Supabase Dashboard')
  console.log('------------------------------------------------------')
  console.log('1. Go to: https://supabase.com/dashboard')
  console.log('2. Select your project')
  console.log('3. Navigate to "Edge Functions" in the sidebar')
  console.log('4. Click "Create a new function"')
  console.log('5. Use the function names and code provided below\n')
  
  console.log('📋 Option 2: Using Supabase CLI')
  console.log('--------------------------------')
  console.log('npm install -g supabase')
  console.log('supabase login')
  console.log('supabase link --project-ref ajrxvnakphkpkcssisxm')
  console.log('supabase functions deploy process-notifications')
  console.log('supabase functions deploy cron-scheduler')
  console.log('supabase functions deploy send-email')
  console.log('supabase functions deploy send-sms\n')
  
  // List available functions
  const functions = ['process-notifications', 'cron-scheduler', 'send-email', 'send-sms']
  
  console.log('📁 Available Functions to Deploy:')
  console.log('==================================\n')
  
  functions.forEach((functionName, index) => {
    const code = readFunctionCode(functionName)
    if (code) {
      console.log(`${index + 1}. Function Name: ${functionName}`)
      console.log(`   File: supabase/functions/${functionName}/index.ts`)
      console.log(`   Status: ✅ Code available`)
      console.log(`   Priority: ${functionName === 'process-notifications' ? '🔥 HIGH (fixes current error)' : '⭐ Medium'}`)
      console.log('')
    } else {
      console.log(`${index + 1}. Function Name: ${functionName}`)
      console.log(`   Status: ❌ Code not found`)
      console.log('')
    }
  })
  
  console.log('🎯 Priority Deployment Order:')
  console.log('==============================')
  console.log('1. process-notifications (fixes the current FunctionsFetchError)')
  console.log('2. cron-scheduler (enables automated scheduling)')
  console.log('3. send-email (enables email notifications)')
  console.log('4. send-sms (enables SMS notifications)\n')
  
  console.log('⚙️ Environment Variables Required:')
  console.log('===================================')
  console.log('Set these in Supabase Dashboard > Edge Functions > Settings:')
  console.log('- SUPABASE_URL (your Supabase project URL)')
  console.log('- SUPABASE_SERVICE_ROLE_KEY (your service role key)')
  console.log('- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (for email function)')
  console.log('- SMS_API_KEY, SMS_SENDER_ID (for SMS function)\n')
}

function generateFunctionCode(functionName) {
  const code = readFunctionCode(functionName)
  if (!code) {
    console.log(`❌ Function code not found for: ${functionName}`)
    return
  }
  
  console.log(`📄 Code for ${functionName}:`)
  console.log('='.repeat(50))
  console.log(code)
  console.log('='.repeat(50))
  console.log('')
}

function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    generateDeploymentInstructions()
    
    console.log('💡 Usage Examples:')
    console.log('==================')
    console.log('node deploy-edge-functions.js --show-code process-notifications')
    console.log('node deploy-edge-functions.js --show-all-code')
    console.log('node deploy-edge-functions.js --test-deployment\n')
    
    return
  }
  
  if (args[0] === '--show-code' && args[1]) {
    generateFunctionCode(args[1])
    return
  }
  
  if (args[0] === '--show-all-code') {
    const functions = ['process-notifications', 'cron-scheduler', 'send-email', 'send-sms']
    functions.forEach(functionName => {
      generateFunctionCode(functionName)
    })
    return
  }
  
  if (args[0] === '--test-deployment') {
    console.log('🧪 Testing deployment status...')
    console.log('Run this command to test if functions are deployed:')
    console.log('node debug-edge-function.js\n')
    return
  }
  
  console.log('❌ Unknown command. Use --help for usage information.')
}

main()
