import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cronJobs, shouldRunNow, getNextRunTime, formatCronDescription } from '../_shared/cron.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const currentTime = new Date()
    console.log(`Cron scheduler running at ${currentTime.toISOString()}`)

    const results = []

    // Check each cron job
    for (const job of cronJobs) {
      if (!job.enabled) {
        console.log(`Skipping disabled job: ${job.name}`)
        continue
      }

      try {
        // Check if this job should run now
        if (shouldRunNow(job.schedule, currentTime)) {
          console.log(`Running job: ${job.name}`)

          // Record job execution start
          const { data: jobRecord, error: jobError } = await supabaseClient
            .from('cron_job_history')
            .insert({
              job_name: job.name,
              started_at: currentTime.toISOString(),
              status: 'running',
            })
            .select()
            .single()

          if (jobError) {
            console.error(`Failed to record job start for ${job.name}:`, jobError)
          }

          // Execute the job function
          let jobResult
          let jobStatus = 'completed'
          let errorMessage = null

          try {
            switch (job.function) {
              case 'process-notifications':
                jobResult = await executeProcessNotifications()
                break
              case 'mark-overdue-invoices':
                jobResult = await executeMarkOverdueInvoices(supabaseClient)
                break
              case 'cleanup-notifications':
                jobResult = await executeCleanupNotifications(supabaseClient)
                break
              default:
                throw new Error(`Unknown function: ${job.function}`)
            }
          } catch (error) {
            jobStatus = 'failed'
            errorMessage = error.message
            console.error(`Job ${job.name} failed:`, error)
          }

          // Update job execution record
          if (jobRecord) {
            await supabaseClient
              .from('cron_job_history')
              .update({
                completed_at: new Date().toISOString(),
                status: jobStatus,
                result: jobResult,
                error_message: errorMessage,
              })
              .eq('id', jobRecord.id)
          }

          results.push({
            job: job.name,
            status: jobStatus,
            result: jobResult,
            error: errorMessage,
          })
        } else {
          const nextRun = getNextRunTime(job.schedule, currentTime)
          console.log(
            `Job ${job.name} not scheduled to run now. Next run: ${nextRun.toISOString()}`
          )
        }
      } catch (error) {
        console.error(`Error processing job ${job.name}:`, error)
        results.push({
          job: job.name,
          status: 'error',
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Cron scheduler completed',
        timestamp: currentTime.toISOString(),
        results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in cron scheduler:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function executeProcessNotifications() {
  console.log('Executing process-notifications job')

  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-notifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    )

    if (!response.ok) {
      throw new Error(`Process notifications failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    throw new Error(`Failed to execute process-notifications: ${error.message}`)
  }
}

async function executeMarkOverdueInvoices(supabaseClient: any) {
  console.log('Executing mark-overdue-invoices job')

  try {
    const { data, error } = await supabaseClient.rpc('mark_overdue_invoices')

    if (error) {
      throw new Error(`Mark overdue invoices failed: ${error.message}`)
    }

    return { invoicesMarkedOverdue: data }
  } catch (error) {
    throw new Error(`Failed to mark overdue invoices: ${error.message}`)
  }
}

async function executeCleanupNotifications(supabaseClient: any) {
  console.log('Executing cleanup-notifications job')

  try {
    // Delete notification history older than 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data, error } = await supabaseClient
      .from('notification_history')
      .delete()
      .lt('created_at', sixMonthsAgo.toISOString())

    if (error) {
      throw new Error(`Cleanup notifications failed: ${error.message}`)
    }

    // Also clean up old cron job history (keep last 1000 records)
    const { data: oldJobs, error: jobsError } = await supabaseClient
      .from('cron_job_history')
      .select('id')
      .order('started_at', { ascending: false })
      .range(1000, 10000) // Skip first 1000, get next batch

    if (jobsError) {
      console.error('Failed to fetch old job records:', jobsError)
    } else if (oldJobs && oldJobs.length > 0) {
      const oldJobIds = oldJobs.map((job) => job.id)
      await supabaseClient.from('cron_job_history').delete().in('id', oldJobIds)
    }

    return {
      notificationsDeleted: data?.length || 0,
      oldJobsDeleted: oldJobs?.length || 0,
    }
  } catch (error) {
    throw new Error(`Failed to cleanup notifications: ${error.message}`)
  }
}
