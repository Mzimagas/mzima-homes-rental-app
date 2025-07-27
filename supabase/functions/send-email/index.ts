import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  message: string
  settings: {
    smtp_host: string
    smtp_port: number
    smtp_username: string
    smtp_password: string
    from_email: string
    from_name: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const emailRequest: EmailRequest = await req.json()
    const { to, subject, message, settings } = emailRequest

    // Validate required fields
    if (!to || !subject || !message || !settings) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        tls: settings.smtp_port === 465,
        auth: {
          username: settings.smtp_username,
          password: settings.smtp_password,
        },
      },
    })

    // Send email
    await client.send({
      from: `${settings.from_name} <${settings.from_email}>`,
      to: to,
      subject: subject,
      content: message,
      html: message.replace(/\n/g, '<br>'), // Simple HTML conversion
    })

    await client.close()

    console.log(`Email sent successfully to ${to}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
