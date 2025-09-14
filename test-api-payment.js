#!/usr/bin/env node

/**
 * Test Payment API with Authentication
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPaymentAPI() {
  console.log('🧪 TESTING PAYMENT API WITH AUTHENTICATION')
  console.log('==========================================')

  try {
    // 1. Sign in as test user
    console.log('\n1️⃣ Signing in as test user...')
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@mzimahomes.com',
      password: 'TestPassword123!'
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
      return
    }

    console.log('✅ Signed in successfully')
    console.log(`   User ID: ${authData.user.id}`)
    console.log(`   Email: ${authData.user.email}`)

    // 2. Get session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('❌ No session found')
      return
    }

    console.log('✅ Session obtained')

    // 3. Test payment API
    console.log('\n2️⃣ Testing payment API...')
    
    const testPaymentData = {
      propertyId: 'bc424057-203c-477e-889d-d81cf0643fa0',
      clientId: authData.user.id,
      amount: 25000,
      paymentMethod: 'bank'
    }

    const response = await fetch('http://localhost:3001/api/clients/make-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Cookie': `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
      },
      body: JSON.stringify(testPaymentData)
    })

    const result = await response.json()
    console.log(`API Response: ${response.status}`)
    console.log('Response body:', JSON.stringify(result, null, 2))

    if (response.ok) {
      console.log('✅ Payment API call successful!')
      
      // 4. Verify payment was saved
      console.log('\n3️⃣ Verifying payment was saved...')
      const { data: interests, error: interestsError } = await supabase
        .from('client_property_interests')
        .select('id, deposit_amount_kes, deposit_paid_at, payment_method, payment_reference, status')
        .eq('client_id', authData.user.id)
        .eq('property_id', testPaymentData.propertyId)

      if (interestsError) {
        console.error('❌ Error checking payment:', interestsError.message)
      } else {
        console.log('✅ Payment verification:')
        interests.forEach((interest, index) => {
          console.log(`   Interest ${index + 1}:`)
          console.log(`   - Deposit Amount: KES ${interest.deposit_amount_kes}`)
          console.log(`   - Deposit Paid At: ${interest.deposit_paid_at}`)
          console.log(`   - Payment Method: ${interest.payment_method}`)
          console.log(`   - Payment Reference: ${interest.payment_reference}`)
          console.log(`   - Status: ${interest.status}`)
        })
      }

      // 5. Check payment installments table
      console.log('\n4️⃣ Checking payment installments...')
      const { data: installments, error: installmentsError } = await supabase
        .from('property_payment_installments')
        .select('*')
        .eq('property_id', testPaymentData.propertyId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (installmentsError) {
        console.log('⚠️ Could not check installments (may need admin access):', installmentsError.message)
      } else {
        console.log(`✅ Found ${installments.length} payment installments`)
        installments.forEach((installment, index) => {
          console.log(`   Installment ${index + 1}:`)
          console.log(`   - Amount: KES ${installment.amount_kes}`)
          console.log(`   - Method: ${installment.payment_method}`)
          console.log(`   - Reference: ${installment.payment_reference}`)
          console.log(`   - Created: ${installment.created_at}`)
        })
      }

    } else {
      console.error('❌ Payment API call failed')
    }

    // 6. Sign out
    await supabase.auth.signOut()
    console.log('\n✅ Signed out successfully')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testPaymentAPI()
