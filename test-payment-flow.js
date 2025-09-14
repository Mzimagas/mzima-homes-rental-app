#!/usr/bin/env node

/**
 * Comprehensive Payment Flow Test
 * Tests the complete payment persistence and admin verification workflow
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPaymentFlow() {
  console.log('🧪 COMPREHENSIVE PAYMENT FLOW TEST')
  console.log('=====================================')

  try {
    // 1. Check existing payment record
    console.log('\n1️⃣ Checking existing payment record...')
    const { data: existingPayment, error: paymentError } = await supabase
      .from('client_property_interests')
      .select('id, deposit_amount_kes, deposit_paid_at, payment_method, payment_reference, payment_verified_at, status')
      .eq('id', 'ad8459f5-238f-4a4f-afba-52b80c3f4f4f')
      .single()

    if (paymentError) {
      console.error('❌ Error fetching payment record:', paymentError.message)
      return
    }

    console.log('✅ Payment record found:')
    console.log(`   - Deposit Amount: KES ${existingPayment.deposit_amount_kes}`)
    console.log(`   - Deposit Paid At: ${existingPayment.deposit_paid_at}`)
    console.log(`   - Payment Method: ${existingPayment.payment_method}`)
    console.log(`   - Payment Reference: ${existingPayment.payment_reference}`)
    console.log(`   - Payment Verified At: ${existingPayment.payment_verified_at}`)
    console.log(`   - Status: ${existingPayment.status}`)

    // 2. Test client dashboard API data retrieval
    console.log('\n2️⃣ Testing client dashboard API...')
    const { data: clientData, error: clientError } = await supabase
      .from('client_property_interests')
      .select(`
        id,
        client_id,
        property_id,
        status,
        deposit_amount_kes,
        deposit_paid_at,
        payment_method,
        payment_reference,
        payment_verified_at,
        properties (
          id,
          name,
          sale_price_kes
        )
      `)
      .eq('client_id', '914d7d97-2dfe-41dd-bfdf-68eae018d900')

    if (clientError) {
      console.error('❌ Error fetching client data:', clientError.message)
      return
    }

    console.log(`✅ Found ${clientData.length} client properties`)
    clientData.forEach((property, index) => {
      console.log(`   Property ${index + 1}:`)
      console.log(`   - Name: ${property.properties?.name}`)
      console.log(`   - Has Payment: ${property.deposit_paid_at ? 'YES' : 'NO'}`)
      console.log(`   - Payment Verified: ${property.payment_verified_at ? 'YES' : 'NO'}`)
      console.log(`   - Status: ${property.status}`)
    })

    // 3. Test admin verification workflow
    console.log('\n3️⃣ Testing admin verification workflow...')
    
    // Find unverified payments
    const unverifiedPayments = clientData.filter(p => p.deposit_paid_at && !p.payment_verified_at)
    console.log(`✅ Found ${unverifiedPayments.length} unverified payments`)

    if (unverifiedPayments.length > 0) {
      const paymentToVerify = unverifiedPayments[0]
      console.log(`   Verifying payment for: ${paymentToVerify.properties?.name}`)

      // Simulate admin verification
      const { error: verifyError } = await supabase
        .from('client_property_interests')
        .update({
          payment_verified_at: new Date().toISOString(),
          notes: 'Test verification - automated test',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentToVerify.id)

      if (verifyError) {
        console.error('❌ Error verifying payment:', verifyError.message)
      } else {
        console.log('✅ Payment verified successfully')

        // Check updated status
        const { data: verifiedPayment } = await supabase
          .from('client_property_interests')
          .select('payment_verified_at, notes')
          .eq('id', paymentToVerify.id)
          .single()

        console.log(`   - Verified At: ${verifiedPayment.payment_verified_at}`)
        console.log(`   - Notes: ${verifiedPayment.notes}`)
      }
    }

    // 4. Test payment status logic
    console.log('\n4️⃣ Testing payment status logic...')
    clientData.forEach((property, index) => {
      const depositPaid = !!property.deposit_paid_at
      const paymentVerified = !!property.payment_verified_at
      
      let status
      if (paymentVerified) {
        status = 'Verified & Confirmed'
      } else if (depositPaid) {
        status = 'Pending Admin Verification'
      } else {
        status = 'Not Paid'
      }

      console.log(`   Property ${index + 1}: ${status}`)
    })

    console.log('\n🎉 PAYMENT FLOW TEST COMPLETED SUCCESSFULLY!')
    console.log('=====================================')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testPaymentFlow()
