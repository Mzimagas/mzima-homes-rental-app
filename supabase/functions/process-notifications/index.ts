import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRule {
  id: string
  landlord_id: string
  type: 'rent_due' | 'payment_overdue' | 'lease_expiring' | 'maintenance_due'
  name: string
  enabled: boolean
  trigger_days: number
  channels: string[]
  template_id?: string
}

interface NotificationSettings {
  email_enabled: boolean
  email_smtp_host: string
  email_smtp_port: number
  email_smtp_username: string
  email_smtp_password: string
  email_from_email: string
  email_from_name: string
  sms_enabled: boolean
  sms_provider: string
  sms_api_key: string
  sms_api_secret: string
  sms_sender_id: string
  timezone: string
  business_hours_start: string
  business_hours_end: string
  send_during_business_hours_only: boolean
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

    console.log('Processing notifications...')

    // Get all enabled notification rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('notification_rules')
      .select('*')
      .eq('enabled', true)

    if (rulesError) {
      throw new Error(`Failed to fetch notification rules: ${rulesError.message}`)
    }

    if (!rules || rules.length === 0) {
      console.log('No enabled notification rules found')
      return new Response(
        JSON.stringify({ message: 'No enabled notification rules found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0

    // Process each rule
    for (const rule of rules as NotificationRule[]) {
      try {
        console.log(`Processing rule: ${rule.name} (${rule.type})`)
        
        // Get notification settings for this landlord
        const { data: settings, error: settingsError } = await supabaseClient
          .from('notification_settings')
          .select('*')
          .eq('landlord_id', rule.landlord_id)
          .single()

        if (settingsError || !settings) {
          console.log(`No notification settings found for landlord ${rule.landlord_id}`)
          continue
        }

        const notificationSettings = settings as NotificationSettings

        // Process based on rule type
        switch (rule.type) {
          case 'rent_due':
            await processRentDueNotifications(supabaseClient, rule, notificationSettings)
            break
          case 'payment_overdue':
            await processOverdueNotifications(supabaseClient, rule, notificationSettings)
            break
          case 'lease_expiring':
            await processLeaseExpiryNotifications(supabaseClient, rule, notificationSettings)
            break
          default:
            console.log(`Unknown rule type: ${rule.type}`)
        }

        processedCount++
      } catch (error) {
        console.error(`Error processing rule ${rule.name}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed successfully', 
        processed: processedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-notifications function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processRentDueNotifications(
  supabaseClient: any,
  rule: NotificationRule,
  settings: NotificationSettings
) {
  console.log(`Processing rent due notifications for rule: ${rule.name}`)
  
  // Calculate target date (trigger_days before due date)
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + rule.trigger_days)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // Find rent invoices due on the target date
  const { data: invoices, error: invoicesError } = await supabaseClient
    .from('rent_invoices')
    .select(`
      *,
      tenants (id, name, email, phone),
      units (label, property_id),
      properties (name)
    `)
    .eq('due_date', targetDateStr)
    .in('status', ['PENDING', 'PARTIAL'])

  if (invoicesError) {
    throw new Error(`Failed to fetch rent invoices: ${invoicesError.message}`)
  }

  if (!invoices || invoices.length === 0) {
    console.log('No rent invoices found for target date')
    return
  }

  // Send notifications for each invoice
  for (const invoice of invoices) {
    await sendNotification(supabaseClient, {
      rule,
      settings,
      recipient: invoice.tenants,
      type: 'rent_due',
      subject: `Rent Payment Reminder - ${invoice.properties.name} ${invoice.units.label}`,
      message: `Dear ${invoice.tenants.name},\n\nThis is a friendly reminder that your rent payment of KES ${invoice.amount_due_kes} for ${invoice.properties.name} ${invoice.units.label} is due on ${new Date(invoice.due_date).toLocaleDateString()}.\n\nPlease ensure payment is made on time to avoid any late fees.\n\nThank you.`,
      metadata: {
        invoice_id: invoice.id,
        amount_due: invoice.amount_due_kes,
        due_date: invoice.due_date
      }
    })
  }
}

async function processOverdueNotifications(
  supabaseClient: any,
  rule: NotificationRule,
  settings: NotificationSettings
) {
  console.log(`Processing overdue notifications for rule: ${rule.name}`)
  
  // Calculate target date (trigger_days after due date)
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() - rule.trigger_days)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // Find overdue invoices
  const { data: invoices, error: invoicesError } = await supabaseClient
    .from('rent_invoices')
    .select(`
      *,
      tenants (id, name, email, phone),
      units (label, property_id),
      properties (name)
    `)
    .eq('due_date', targetDateStr)
    .in('status', ['OVERDUE', 'PARTIAL'])

  if (invoicesError) {
    throw new Error(`Failed to fetch overdue invoices: ${invoicesError.message}`)
  }

  if (!invoices || invoices.length === 0) {
    console.log('No overdue invoices found for target date')
    return
  }

  // Send notifications for each overdue invoice
  for (const invoice of invoices) {
    const outstandingAmount = invoice.amount_due_kes - invoice.amount_paid_kes
    
    await sendNotification(supabaseClient, {
      rule,
      settings,
      recipient: invoice.tenants,
      type: 'payment_overdue',
      subject: `OVERDUE: Payment Required - ${invoice.properties.name} ${invoice.units.label}`,
      message: `Dear ${invoice.tenants.name},\n\nYour rent payment for ${invoice.properties.name} ${invoice.units.label} is now ${rule.trigger_days} days overdue.\n\nOutstanding Amount: KES ${outstandingAmount}\nOriginal Due Date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nPlease make payment immediately to avoid further action.\n\nThank you.`,
      metadata: {
        invoice_id: invoice.id,
        outstanding_amount: outstandingAmount,
        days_overdue: rule.trigger_days
      }
    })
  }
}

async function processLeaseExpiryNotifications(
  supabaseClient: any,
  rule: NotificationRule,
  settings: NotificationSettings
) {
  console.log(`Processing lease expiry notifications for rule: ${rule.name}`)
  
  // Calculate target date (trigger_days before expiry)
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + rule.trigger_days)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // Find tenancy agreements expiring on the target date
  const { data: agreements, error: agreementsError } = await supabaseClient
    .from('tenancy_agreements')
    .select(`
      *,
      tenants (id, name, email, phone),
      units (label, property_id),
      properties (name)
    `)
    .eq('end_date', targetDateStr)
    .eq('status', 'ACTIVE')

  if (agreementsError) {
    throw new Error(`Failed to fetch tenancy agreements: ${agreementsError.message}`)
  }

  if (!agreements || agreements.length === 0) {
    console.log('No expiring tenancy agreements found for target date')
    return
  }

  // Send notifications for each expiring agreement
  for (const agreement of agreements) {
    await sendNotification(supabaseClient, {
      rule,
      settings,
      recipient: agreement.tenants,
      type: 'lease_expiring',
      subject: `Lease Expiry Notice - ${agreement.properties.name} ${agreement.units.label}`,
      message: `Dear ${agreement.tenants.name},\n\nThis is to notify you that your lease for ${agreement.properties.name} ${agreement.units.label} will expire on ${new Date(agreement.end_date).toLocaleDateString()}.\n\nPlease contact us to discuss renewal options or move-out procedures.\n\nThank you.`,
      metadata: {
        agreement_id: agreement.id,
        expiry_date: agreement.end_date,
        days_until_expiry: rule.trigger_days
      }
    })
  }
}

async function sendNotification(
  supabaseClient: any,
  params: {
    rule: NotificationRule
    settings: NotificationSettings
    recipient: any
    type: string
    subject: string
    message: string
    metadata: any
  }
) {
  const { rule, settings, recipient, type, subject, message, metadata } = params

  // Check if we should send during business hours
  if (settings.send_during_business_hours_only) {
    const now = new Date()
    const currentHour = now.getHours()
    const startHour = parseInt(settings.business_hours_start.split(':')[0])
    const endHour = parseInt(settings.business_hours_end.split(':')[0])
    
    if (currentHour < startHour || currentHour >= endHour) {
      console.log('Outside business hours, skipping notification')
      return
    }
  }

  // Send notifications for each enabled channel
  for (const channel of rule.channels) {
    try {
      let contact = ''
      let status = 'pending'

      switch (channel) {
        case 'email':
          if (settings.email_enabled && recipient.email) {
            contact = recipient.email
            try {
              const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: contact,
                  subject: subject,
                  message: message,
                  settings: {
                    smtp_host: settings.email_smtp_host,
                    smtp_port: settings.email_smtp_port,
                    smtp_username: settings.email_smtp_username,
                    smtp_password: settings.email_smtp_password,
                    from_email: settings.email_from_email,
                    from_name: settings.email_from_name,
                  }
                })
              })

              if (emailResponse.ok) {
                status = 'sent'
                console.log(`Email sent successfully to ${contact}`)
              } else {
                status = 'failed'
                console.error(`Failed to send email to ${contact}`)
              }
            } catch (error) {
              status = 'failed'
              console.error(`Email sending error:`, error)
            }
          }
          break
        case 'sms':
          if (settings.sms_enabled && recipient.phone) {
            contact = recipient.phone
            try {
              const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: contact,
                  message: message,
                  settings: {
                    provider: settings.sms_provider,
                    api_key: settings.sms_api_key,
                    api_secret: settings.sms_api_secret,
                    sender_id: settings.sms_sender_id,
                  }
                })
              })

              if (smsResponse.ok) {
                status = 'sent'
                console.log(`SMS sent successfully to ${contact}`)
              } else {
                status = 'failed'
                console.error(`Failed to send SMS to ${contact}`)
              }
            } catch (error) {
              status = 'failed'
              console.error(`SMS sending error:`, error)
            }
          }
          break
        case 'in_app':
          contact = recipient.id
          // Create in-app notification
          await supabaseClient
            .from('in_app_notifications')
            .insert({
              user_id: recipient.id,
              title: subject,
              message: message,
              type: 'info',
              metadata: metadata
            })
          status = 'sent'
          break
      }

      // Record notification in history
      if (contact) {
        await supabaseClient
          .from('notification_history')
          .insert({
            rule_id: rule.id,
            landlord_id: rule.landlord_id,
            type: type,
            recipient_type: 'tenant',
            recipient_id: recipient.id,
            recipient_contact: contact,
            channel: channel,
            subject: subject,
            message: message,
            status: status,
            sent_at: status === 'sent' ? new Date().toISOString() : null,
            metadata: metadata
          })
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error)
      
      // Record failed notification
      await supabaseClient
        .from('notification_history')
        .insert({
          rule_id: rule.id,
          landlord_id: rule.landlord_id,
          type: type,
          recipient_type: 'tenant',
          recipient_id: recipient.id,
          recipient_contact: contact,
          channel: channel,
          subject: subject,
          message: message,
          status: 'failed',
          error_message: error.message,
          metadata: metadata
        })
    }
  }
}
