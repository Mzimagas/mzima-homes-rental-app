const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Import our enhanced error handling function
function handleSupabaseError(error) {
  // Handle null/undefined errors
  if (!error) {
    console.error('Supabase error: Received null or undefined error')
    return 'An unknown error occurred'
  }

  // Extract error properties safely
  const errorProps = {
    message: error?.message || '',
    details: error?.details || '',
    hint: error?.hint || '',
    code: error?.code || '',
    stack: error?.stack || '',
    name: error?.name || '',
    // Handle nested error objects
    originalError: error?.error || null,
    // Handle Edge Function errors
    status: error?.status || error?.context?.status || null,
    statusText: error?.statusText || error?.context?.statusText || ''
  }

  // Handle Edge Function errors (404, 500, etc.)
  if (errorProps.status) {
    if (errorProps.status === 404) {
      return 'Service not found: The requested function or endpoint is not available'
    }
    if (errorProps.status === 500) {
      return 'Server error: The service encountered an internal error'
    }
    if (errorProps.status >= 400 && errorProps.status < 500) {
      return `Client error: ${errorProps.statusText || 'Bad request'} (${errorProps.status})`
    }
    if (errorProps.status >= 500) {
      return `Server error: ${errorProps.statusText || 'Internal server error'} (${errorProps.status})`
    }
  }

  // Handle specific Supabase/PostgREST error codes
  if (errorProps.code === 'PGRST202') {
    const functionName = errorProps.message.match(/function\s+(\w+\.\w+)/)?.[1] || 'unknown function'
    return `Database function not found: ${functionName}. This function may not be deployed or the migration may not have been applied.`
  }

  if (errorProps.code === '42P01') {
    const tableName = errorProps.message.match(/relation\s+"([^"]+)"/)?.[1] || 'unknown table'
    return `Table not found: ${tableName}. This table may not exist or the migration may not have been applied.`
  }

  // Return detailed error information
  const errorMessage = errorProps.message || errorProps.details || 'An unexpected error occurred'
  const errorHint = errorProps.hint ? ` Hint: ${errorProps.hint}` : ''
  const errorCode = errorProps.code ? ` (Code: ${errorProps.code})` : ''

  return `${errorMessage}${errorHint}${errorCode}`
}

// Enhanced getCronJobStats function
async function getCronJobStats(jobName, days = 7) {
  try {
    const { data, error } = await supabase.rpc('get_cron_job_stats', {
      p_job_name: jobName || null,
      p_days: days
    })

    if (error) {
      // If the function doesn't exist, return mock data with a helpful message
      if (error.code === 'PGRST202' || error.message?.includes('get_cron_job_stats')) {
        console.warn('Cron job stats function not found. Returning mock data. Please apply migration 007_cron_job_history.sql')
        
        // Return mock data structure that matches the expected format
        const mockData = [
          {
            job_name: 'process-notifications',
            total_runs: 0,
            successful_runs: 0,
            failed_runs: 0,
            success_rate: 0,
            last_run: null,
            last_status: 'not_deployed',
            avg_duration_seconds: null
          },
          {
            job_name: 'mark-overdue-invoices',
            total_runs: 0,
            successful_runs: 0,
            failed_runs: 0,
            success_rate: 0,
            last_run: null,
            last_status: 'not_deployed',
            avg_duration_seconds: null
          },
          {
            job_name: 'cleanup-old-notifications',
            total_runs: 0,
            successful_runs: 0,
            failed_runs: 0,
            success_rate: 0,
            last_run: null,
            last_status: 'not_deployed',
            avg_duration_seconds: null
          }
        ]
        
        return { 
          data: jobName ? mockData.filter(job => job.job_name === jobName) : mockData, 
          error: null 
        }
      }
      
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: handleSupabaseError(err) }
  }
}

// Enhanced processNotifications function
async function processNotifications() {
  try {
    const { data, error } = await supabase.functions.invoke('process-notifications', {
      body: {}
    })

    if (error) {
      // Handle Edge Function not deployed scenario
      if (error.status === 404 || error.context?.status === 404) {
        console.warn('Process notifications Edge Function not deployed. Returning mock response.')
        return { 
          data: { 
            message: 'Edge Function not deployed',
            processed: 0,
            status: 'not_deployed'
          }, 
          error: null 
        }
      }
      
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data, error: null }
  } catch (err) {
    // Handle network errors or function not found
    if (err?.status === 404 || err?.context?.status === 404) {
      console.warn('Process notifications Edge Function not deployed. Returning mock response.')
      return { 
        data: { 
          message: 'Edge Function not deployed',
          processed: 0,
          status: 'not_deployed'
        }, 
        error: null 
      }
    }
    
    return { data: null, error: handleSupabaseError(err) }
  }
}

async function testImprovedErrorHandling() {
  console.log('🧪 Testing improved error handling...\n')

  // Test 1: getCronJobStats with enhanced error handling
  console.log('1. Testing enhanced getCronJobStats...')
  const { data: cronData, error: cronError } = await getCronJobStats()
  
  if (cronError) {
    console.log('❌ Error:', cronError)
  } else {
    console.log('✅ Success! Received data:')
    console.log(JSON.stringify(cronData, null, 2))
  }

  // Test 2: processNotifications with enhanced error handling
  console.log('\n2. Testing enhanced processNotifications...')
  const { data: notifData, error: notifError } = await processNotifications()
  
  if (notifError) {
    console.log('❌ Error:', notifError)
  } else {
    console.log('✅ Success! Received data:')
    console.log(JSON.stringify(notifData, null, 2))
  }

  console.log('\n🎉 Enhanced error handling test completed!')
  console.log('\nThe application will now:')
  console.log('- Show helpful error messages instead of breaking')
  console.log('- Provide mock data when services are not deployed')
  console.log('- Allow the UI to function gracefully during setup')
}

testImprovedErrorHandling().catch(console.error)
