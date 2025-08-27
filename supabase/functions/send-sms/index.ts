import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  to: string
  message: string
  settings: {
    provider: 'africastalking' | 'twilio' | 'custom'
    api_key: string
    api_secret: string
    sender_id: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const smsRequest: SMSRequest = await req.json()
    const { to, message, settings } = smsRequest

    // Validate required fields
    if (!to || !message || !settings) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result
    switch (settings.provider) {
      case 'africastalking':
        result = await sendAfricasTalkingSMS(to, message, settings)
        break
      case 'twilio':
        result = await sendTwilioSMS(to, message, settings)
        break
      default:
        throw new Error(`Unsupported SMS provider: ${settings.provider}`)
    }

    console.log(`SMS sent successfully to ${to} via ${settings.provider}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        provider: settings.provider,
        result: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending SMS:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to send SMS',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function sendAfricasTalkingSMS(to: string, message: string, settings: any) {
  const url = 'https://api.africastalking.com/version1/messaging'

  const formData = new FormData()
  formData.append('username', 'sandbox') // Use 'sandbox' for testing, actual username for production
  formData.append('to', to)
  formData.append('message', message)
  formData.append('from', settings.sender_id)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apiKey: settings.api_key,
      Accept: 'application/json',
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Africa's Talking API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.SMSMessageData?.Recipients?.[0]?.status !== 'Success') {
    throw new Error(`SMS delivery failed: ${result.SMSMessageData?.Recipients?.[0]?.status}`)
  }

  return result
}

async function sendTwilioSMS(to: string, message: string, settings: any) {
  const accountSid = settings.api_key
  const authToken = settings.api_secret
  const fromNumber = settings.sender_id

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const formData = new FormData()
  formData.append('To', to)
  formData.append('From', fromNumber)
  formData.append('Body', message)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(formData as any),
  })

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.error_code) {
    throw new Error(`SMS delivery failed: ${result.error_message}`)
  }

  return result
}
