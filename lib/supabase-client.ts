// Compatibility shim to ensure a single Supabase client instance.
// Re-export everything from src/lib/supabase-client to avoid duplicate clients.
export * from '../src/lib/supabase-client'
export { default } from '../src/lib/supabase-client'

// Client-side business logic function wrappers
export const clientBusinessFunctions = {
  // Generate monthly rent invoices
  async runMonthlyRent(periodStart: string, dueDate?: string) {
    return callRPC<{ invoices_created: number; total_amount_kes: number }[]>(
      'run_monthly_rent',
      { p_period_start: periodStart, p_due_date: dueDate }
    )
  },

  // Get tenant outstanding balance
  async getTenantBalance(tenantId: string) {
    return callRPC<number>('get_tenant_balance', { p_tenant_id: tenantId })
  },

  // Get property statistics
  async getPropertyStats(propertyId: string) {
    return callRPC<{
      total_units: number
      occupied_units: number
      vacant_units: number
      occupancy_rate: number
      monthly_rent_potential: number
      monthly_rent_actual: number
    }[]>('get_property_stats', { p_property_id: propertyId })
  },

  // Get tenant payment history
  async getTenantPaymentHistory(tenantId: string, limit = 50) {
    return callRPC<{
      payment_date: string
      amount_kes: number
      method: string
      tx_ref: string | null
      allocated_to_invoices: any[]
    }[]>('get_tenant_payment_history', { p_tenant_id: tenantId, p_limit: limit })
  },

  // Apply payment to tenant account
  async applyPayment(
    tenantId: string,
    amountKes: number,
    paymentDate: string,
    method: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER' = 'MPESA',
    txRef?: string,
    postedByUserId?: string
  ) {
    return callRPC<string>('apply_payment', {
      p_tenant_id: tenantId,
      p_amount_kes: amountKes,
      p_payment_date: paymentDate,
      p_method: method,
      p_tx_ref: txRef,
      p_posted_by_user_id: postedByUserId
    })
  },

  // Helper function to get user's landlord IDs with auto-setup option
  async getUserLandlordIds(autoSetup: boolean = false) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        return { data: null, error: handleSupabaseError(userError || new Error('User not authenticated')) }
      }

      // Use the RPC function to get landlord IDs (respects RLS policies)
      const { data, error } = await supabase.rpc('get_user_landlord_ids', { user_uuid: user.id })

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      const landlordIds = data || []

      // If no landlord access and auto-setup is enabled, try to create it
      if (landlordIds.length === 0 && autoSetup) {
        console.log('No landlord access found, attempting auto-setup...')

        // Try to create landlord access automatically
        const setupResult = await this.setupLandlordAccess()

        if (setupResult.success && setupResult.landlordId) {
          return { data: [setupResult.landlordId], error: null }
        } else {
          return { data: null, error: setupResult.message }
        }
      }

      return { data: landlordIds, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  // Helper function to set up landlord access for the current user
  async setupLandlordAccess() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        return { success: false, message: 'User not authenticated' }
      }

      // Check if a landlord record already exists for this email
      const { data: existingLandlords, error: checkError } = await supabase
        .from('landlords')
        .select('id')
        .eq('email', user.email)
        .limit(1)

      if (checkError) {
        return { success: false, message: `Error checking existing landlords: ${checkError.message}` }
      }

      let landlordId: string

      if (existingLandlords && existingLandlords.length > 0) {
        // Use existing landlord record
        landlordId = existingLandlords[0].id
      } else {
        // Create new landlord record
        const { data: newLandlord, error: createError } = await supabase
          .from('landlords')
          .insert([{
            full_name: user.user_metadata?.full_name || (user.email || 'Unknown User').split('@')[0],
            email: user.email || '',
            phone: user.user_metadata?.phone || '+254700000000'
          }])
          .select()
          .single()

        if (createError) {
          return { success: false, message: `Error creating landlord record: ${createError.message}` }
        }

        landlordId = newLandlord.id
      }

      // Create user role assignment
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: user.id,
          landlord_id: landlordId,
          role: 'LANDLORD'
        }])

      if (roleError && roleError.code !== '23505') { // Ignore duplicate key errors
        return { success: false, message: `Error creating user role: ${roleError.message}` }
      }

      return { success: true, message: 'Successfully set up landlord access', landlordId }
    } catch (err) {
      return { success: false, message: handleSupabaseError(err) }
    }
  },

  // Notification Management Functions
  async getNotificationRules() {
    try {
      // Try to get landlord IDs with auto-setup enabled
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds(true)

      if (landlordError) {
        return { data: null, error: landlordError }
      }

      if (!landlordIds || landlordIds.length === 0) {
        return { data: null, error: 'No landlord access found for this user' }
      }

      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .in('landlord_id', landlordIds)
        .order('created_at', { ascending: false })

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async createNotificationRule(rule: any) {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds()
      if (landlordError || !landlordIds || landlordIds.length === 0) {
        return { data: null, error: landlordError || 'No landlord access found for this user' }
      }

      // Use the first landlord ID (in most cases, users will have one landlord role)
      const landlordId = landlordIds[0]

      // Add landlord_id to the rule
      const ruleWithLandlordId = {
        ...rule,
        landlord_id: landlordId
      }

      const { data, error } = await supabase
        .from('notification_rules')
        .insert([ruleWithLandlordId])
        .select()
        .single()

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async updateNotificationRule(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async deleteNotificationRule(id: string) {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', id)

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async getNotificationTemplates() {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { data: null, error: handleSupabaseError(userError || new Error('User not authenticated')) }
      }

      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async createNotificationTemplate(template: any) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { data: null, error: handleSupabaseError(userError || new Error('User not authenticated')) }
      }

      // Add landlord_id to the template
      const templateWithLandlordId = {
        ...template,
        landlord_id: user.id
      }

      const { data, error } = await supabase
        .from('notification_templates')
        .insert([templateWithLandlordId])
        .select()
        .single()

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async getNotificationHistory(limit = 50, offset = 0) {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds(true)
      if (landlordError || !landlordIds || landlordIds.length === 0) {
        return { data: null, error: landlordError || 'No landlord access found for this user' }
      }

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .in('landlord_id', landlordIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async getNotificationSettings() {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds()
      if (landlordError || !landlordIds || landlordIds.length === 0) {
        return { data: null, error: landlordError || 'No landlord access found for this user' }
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('landlord_id', landlordIds[0])
        .single()

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async updateNotificationSettings(settings: any) {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds()
      if (landlordError || !landlordIds || landlordIds.length === 0) {
        return { data: null, error: landlordError || 'No landlord access found for this user' }
      }

      const landlordId = landlordIds[0]

      // Check if settings already exist
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('landlord_id', landlordId)
        .single()

      const settingsData = {
        landlord_id: landlordId,
        email_enabled: settings.email.enabled,
        email_smtp_host: settings.email.smtp_host,
        email_smtp_port: settings.email.smtp_port,
        email_smtp_username: settings.email.smtp_username,
        email_smtp_password: settings.email.smtp_password,
        email_from_email: settings.email.from_email,
        email_from_name: settings.email.from_name,
        sms_enabled: settings.sms.enabled,
        sms_provider: settings.sms.provider,
        sms_api_key: settings.sms.api_key,
        sms_api_secret: settings.sms.api_secret,
        sms_sender_id: settings.sms.sender_id,
        timezone: settings.general.timezone,
        business_hours_start: settings.general.business_hours_start,
        business_hours_end: settings.general.business_hours_end,
        send_during_business_hours_only: settings.general.send_during_business_hours_only,
        max_retries: settings.general.max_retries,
        retry_interval_minutes: settings.general.retry_interval_minutes,
        updated_at: new Date().toISOString()
      }

      let result
      if (existing) {
        // Update existing settings
        result = await supabase
          .from('notification_settings')
          .update(settingsData)
          .eq('landlord_id', landlordId)
          .select()
          .single()
      } else {
        // Insert new settings
        result = await supabase
          .from('notification_settings')
          .insert([settingsData])
          .select()
          .single()
      }

      return { data: result.data, error: result.error ? handleSupabaseError(result.error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async processNotifications() {
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
    } catch (err: any) {
      console.error('Process notifications error:', err)

      // Handle FunctionsFetchError specifically
      if (err.name === 'FunctionsFetchError') {
        console.warn('FunctionsFetchError caught - Edge Function likely not deployed.')
        return {
          data: {
            message: 'Edge Function not deployed - FunctionsFetchError',
            processed: 0,
            status: 'not_deployed'
          },
          error: null
        }
      }

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

      // Handle other HTTP errors from the function response
      if (err?.context?.status) {
        console.warn(`Edge Function returned status ${err.context.status}`)
        return {
          data: {
            message: `Edge Function error: ${err.context.status}`,
            processed: 0,
            status: 'error'
          },
          error: null
        }
      }

      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async testEmailSettings(email: string, settings: any) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Test Email - Notification Settings',
          message: 'This is a test email to verify your notification settings are working correctly.',
          settings: {
            smtp_host: settings.email.smtp_host,
            smtp_port: settings.email.smtp_port,
            smtp_username: settings.email.smtp_username,
            smtp_password: settings.email.smtp_password,
            from_email: settings.email.from_email,
            from_name: settings.email.from_name,
          }
        }
      })

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async testSmsSettings(phone: string, settings: any) {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phone,
          message: 'Test SMS - Your notification settings are working correctly.',
          settings: {
            provider: settings.sms.provider,
            api_key: settings.sms.api_key,
            api_secret: settings.sms.api_secret,
            sender_id: settings.sms.sender_id,
          }
        }
      })

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async triggerCronScheduler() {
    try {
      const { data, error } = await supabase.functions.invoke('cron-scheduler', {
        body: {}
      })

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async getCronJobStats(jobName?: string, days: number = 7) {
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
  },

  async sendCustomNotification(notificationData: any) {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds()
      if (landlordError || !landlordIds || landlordIds.length === 0) {
        return { data: null, error: landlordError || 'No landlord access found for this user' }
      }

      // Use the first landlord ID
      const landlordId = landlordIds[0]

      // Prepare notification history entries
      const notifications = []

      if (notificationData.recipientType === 'all') {
        // Get all tenants for this landlord
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, name, email, phone')
          .eq('landlord_id', landlordId)

        if (tenantsError) {
          return { data: null, error: handleSupabaseError(tenantsError) }
        }

        // Create notification entries for all tenants
        for (const tenant of tenants || []) {
          for (const channel of notificationData.channels) {
            const contact = channel === 'email' ? tenant.email :
                           channel === 'sms' ? tenant.phone :
                           tenant.id // for in-app notifications

            notifications.push({
              landlord_id: landlordId,
              type: 'custom',
              recipient_type: 'tenant',
              recipient_id: tenant.id,
              recipient_contact: contact,
              channel: channel,
              subject: notificationData.subject,
              message: notificationData.message,
              status: notificationData.sendImmediately ? 'pending' : 'scheduled',
              sent_at: notificationData.sendImmediately ? new Date().toISOString() : null,
              scheduled_for: notificationData.scheduledFor || null
            })
          }
        }
      } else {
        // Send to selected recipients
        for (const recipientId of notificationData.recipients) {
          // Get tenant details
          const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, name, email, phone')
            .eq('id', recipientId)
            .eq('landlord_id', landlordId)
            .single()

          if (tenantError) {
            console.error('Error fetching tenant:', tenantError)
            continue
          }

          for (const channel of notificationData.channels) {
            const contact = channel === 'email' ? tenant.email :
                           channel === 'sms' ? tenant.phone :
                           tenant.id // for in-app notifications

            notifications.push({
              landlord_id: landlordId,
              type: 'custom',
              recipient_type: 'tenant',
              recipient_id: tenant.id,
              recipient_contact: contact,
              channel: channel,
              subject: notificationData.subject,
              message: notificationData.message,
              status: notificationData.sendImmediately ? 'pending' : 'scheduled',
              sent_at: notificationData.sendImmediately ? new Date().toISOString() : null,
              scheduled_for: notificationData.scheduledFor || null
            })
          }
        }
      }

      // Insert notification history entries
      const { data, error } = await supabase
        .from('notification_history')
        .insert(notifications)
        .select()

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      // In a real implementation, you would also trigger the actual sending
      // via email service, SMS service, etc. For now, we just log the notifications
      console.log(`Created ${notifications.length} notification entries`)

      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async getTenants() {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds()
      if (landlordError || !landlordIds || landlordIds.length === 0) {
        return { data: null, error: landlordError || 'No landlord access found for this user' }
      }

      // Query tenants with their current unit and property information
      // Using the correct relationships: tenants -> units -> properties
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          full_name,
          email,
          phone,
          status,
          units!current_unit_id (
            id,
            unit_label,
            properties (
              id,
              name,
              landlord_id
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .not('current_unit_id', 'is', null)
        .order('full_name')

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      // Filter tenants that belong to the current landlord's properties
      // and transform the data to include property and unit information
      const transformedData = data
        ?.filter((tenant: any) => {
          // Check if the tenant's unit belongs to one of the landlord's properties
          const propertyLandlordId = tenant.units?.properties?.landlord_id
          return propertyLandlordId && landlordIds.includes(propertyLandlordId)
        })
        .map((tenant: any) => ({
          id: tenant.id,
          name: tenant.full_name,
          email: tenant.email || '',
          phone: tenant.phone || '',
          property_name: tenant.units?.properties?.name || 'Unknown Property',
          unit_label: tenant.units?.unit_label || 'Unknown Unit'
        }))

      return { data: transformedData || [], error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async getInAppNotifications(limit = 20) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { data: null, error: handleSupabaseError(userError || new Error('User not authenticated')) }
      }

      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  async markNotificationAsRead(id: string) {
    try {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id)

      return { data, error: error ? handleSupabaseError(error) : null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  }
}

// Utility functions for common queries
export const clientQueries = {
  // Get all properties for a landlord
  async getPropertiesByLandlord(landlordId: string) {
    return supabase
      .from('properties')
      .select(`
        *,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active
        )
      `)
      .eq('landlord_id', landlordId)
      .order('name')
  },

  // Get tenant details with current unit
  async getTenantWithUnit(tenantId: string) {
    return supabase
      .from('tenants')
      .select(`
        *,
        units (
          *,
          properties (
            name,
            physical_address
          )
        )
      `)
      .eq('id', tenantId)
      .single()
  },

  // Get outstanding invoices for a tenant
  async getOutstandingInvoices(tenantId: string) {
    return supabase
      .from('rent_invoices')
      .select(`
        *,
        units (
          unit_label,
          properties (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['PENDING', 'PARTIAL', 'OVERDUE'])
      .order('due_date')
  },

  // Get recent payments for a property
  async getRecentPayments(propertyId: string, limit = 20) {
    return supabase
      .from('payments')
      .select(`
        *,
        tenants (
          full_name,
          units (
            unit_label
          )
        )
      `)
      .eq('tenants.units.property_id', propertyId)
      .order('payment_date', { ascending: false })
      .limit(limit)
  }
}

// Export single instance as default to prevent multiple instances
export default supabase
export { supabase }
