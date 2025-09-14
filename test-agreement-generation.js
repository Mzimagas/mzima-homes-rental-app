require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 TESTING AGREEMENT GENERATION FOR PROPERTY 3588')
console.log('=' .repeat(50))

async function testAgreementGeneration() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // 1. Sign in as test user
    console.log('\n1️⃣ Signing in as test user...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@mzimahomes.com',
      password: 'TestPassword123!'
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError)
      return
    }

    console.log('✅ Signed in successfully')

    // 2. Get property 3588 details
    console.log('\n2️⃣ Getting property 3588 details...')
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, name, sale_price_kes')
      .ilike('name', '%3588%')
      .single()

    if (propError) {
      console.error('❌ Error fetching property:', propError)
      return
    }

    console.log('✅ Property found:', {
      id: property.id,
      name: property.name,
      sale_price_kes: property.sale_price_kes
    })

    // 3. Check current interest status
    console.log('\n3️⃣ Checking current interest status...')
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, status, agreement_generated_at, agreement_signed_at')
      .eq('property_id', property.id)
      .single()

    if (interestError) {
      console.error('❌ Error fetching interest:', interestError)
      return
    }

    console.log('✅ Interest found:', {
      id: interest.id,
      status: interest.status,
      agreement_generated_at: interest.agreement_generated_at,
      agreement_signed_at: interest.agreement_signed_at
    })

    // 4. Test agreement generation
    console.log('\n4️⃣ Testing agreement generation...')
    const generateResponse = await fetch('http://localhost:3001/api/clients/generate-agreement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      },
      body: JSON.stringify({
        propertyId: property.id
      })
    })

    if (generateResponse.ok) {
      const generateData = await generateResponse.json()
      console.log('✅ Agreement generation successful!')
      console.log('Agreement details:', {
        agreementId: generateData.agreement?.agreementId,
        propertyName: generateData.agreement?.property?.name,
        purchasePrice: generateData.agreement?.property?.purchasePrice,
        depositAmount: generateData.agreement?.terms?.depositAmount
      })
    } else {
      const errorData = await generateResponse.json()
      console.log('❌ Agreement generation failed:', generateResponse.status, errorData.error)
    }

    // 5. Check if agreement timestamp was set
    console.log('\n5️⃣ Checking if agreement timestamp was set...')
    const { data: updatedInterest, error: updatedError } = await supabase
      .from('client_property_interests')
      .select('id, status, agreement_generated_at, agreement_signed_at')
      .eq('property_id', property.id)
      .single()

    if (updatedError) {
      console.error('❌ Error fetching updated interest:', updatedError)
    } else {
      console.log('✅ Updated interest status:', {
        id: updatedInterest.id,
        status: updatedInterest.status,
        agreement_generated_at: updatedInterest.agreement_generated_at,
        agreement_signed_at: updatedInterest.agreement_signed_at
      })

      if (updatedInterest.agreement_generated_at) {
        console.log('✅ Agreement timestamp properly set!')
      } else {
        console.log('❌ Agreement timestamp not set')
      }
    }

    // 6. Test agreement status API
    console.log('\n6️⃣ Testing agreement status API...')
    const statusResponse = await fetch(`http://localhost:3001/api/clients/agreement-status?propertyId=${property.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log('✅ Agreement status API successful:', {
        agreementGenerated: statusData.agreementGenerated,
        agreementSigned: statusData.agreementSigned,
        signature: statusData.signature
      })
    } else {
      const errorData = await statusResponse.json()
      console.log('❌ Agreement status API failed:', statusResponse.status, errorData)
    }

    // Sign out
    await supabase.auth.signOut()
    console.log('\n✅ Signed out')

    // 7. Summary
    console.log('\n📊 SUMMARY')
    console.log('=' .repeat(40))
    console.log(`Property: ${property.name}`)
    console.log(`Interest Status: ${interest.status}`)
    console.log(`Agreement Generated: ${interest.agreement_generated_at ? 'Yes' : 'No'}`)
    console.log(`Agreement Signed: ${interest.agreement_signed_at ? 'Yes' : 'No'}`)
    
    console.log('\n🎯 EXPECTED BEHAVIOR:')
    console.log('✅ Agreement generation should work for CONVERTED status')
    console.log('✅ Agreement timestamp should be set after generation')
    console.log('✅ Agreement status API should return correct status')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testAgreementGeneration()
