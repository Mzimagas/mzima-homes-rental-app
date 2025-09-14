require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 TESTING PROPERTY 3588 VISIBILITY ACROSS ALL SYSTEMS')
console.log('=' .repeat(60))

async function testPropertyVisibility() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // 1. Check property 3588 current status
    console.log('\n1️⃣ Checking Property 3588 Current Status...')
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, name, handover_status, updated_at')
      .ilike('name', '%3588%')
      .single()

    if (propError) {
      console.error('❌ Error fetching property:', propError)
      return
    }

    console.log('✅ Property found:', {
      id: property.id,
      name: property.name,
      handover_status: property.handover_status,
      updated_at: property.updated_at
    })

    // 2. Check client interest status
    console.log('\n2️⃣ Checking Client Interest Status...')
    const { data: interests, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, status, deposit_amount_kes, deposit_paid_at, payment_verified_at, client_id')
      .eq('property_id', property.id)

    if (interestError) {
      console.error('❌ Error fetching interests:', interestError)
      return
    }

    if (!interests || interests.length === 0) {
      console.log('❌ No interests found for this property')
      return
    }

    const interest = interests[0] // Use the first/most recent interest
    console.log('✅ Interest found:', {
      id: interest.id,
      status: interest.status,
      deposit_amount_kes: interest.deposit_amount_kes,
      deposit_paid_at: interest.deposit_paid_at,
      payment_verified_at: interest.payment_verified_at,
      client_id: interest.client_id
    })

    if (interests.length > 1) {
      console.log(`ℹ️ Found ${interests.length} interests for this property, using the first one`)
    }

    // 3. Test Client Dashboard API
    console.log('\n3️⃣ Testing Client Dashboard API...')
    
    // Sign in as test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@mzimahomes.com',
      password: 'TestPassword123!'
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError)
      return
    }

    console.log('✅ Signed in as test user')

    // Test dashboard API
    const dashboardResponse = await fetch('http://localhost:3001/api/clients/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    })

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json()
      const property3588 = dashboardData.properties?.find(p => p.name.includes('3588'))
      
      if (property3588) {
        console.log('✅ Property 3588 found in client dashboard:', {
          name: property3588.name,
          status: property3588.status,
          handover_status: property3588.handover_status
        })
      } else {
        console.log('❌ Property 3588 NOT found in client dashboard')
        console.log('Available properties:', dashboardData.properties?.map(p => ({ name: p.name, status: p.status })))
      }
    } else {
      console.log('❌ Dashboard API failed:', dashboardResponse.status, await dashboardResponse.text())
    }

    // 4. Test Admin Client Interests API
    console.log('\n4️⃣ Testing Admin Client Interests API...')
    const adminResponse = await fetch('http://localhost:3001/api/admin/client-interests', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    })

    if (adminResponse.ok) {
      const adminData = await adminResponse.json()
      const interest3588 = adminData.interests?.find(i => i.property?.name?.includes('3588'))
      
      if (interest3588) {
        console.log('✅ Property 3588 interest found in admin dashboard:', {
          property_name: interest3588.property?.name,
          status: interest3588.status,
          client_name: interest3588.client?.full_name
        })
      } else {
        console.log('❌ Property 3588 interest NOT found in admin dashboard')
        console.log('Available interests:', adminData.interests?.map(i => ({ 
          property: i.property?.name, 
          status: i.status 
        })))
      }
    } else {
      console.log('❌ Admin API failed:', adminResponse.status, await adminResponse.text())
    }

    // 5. Check if property should appear in handover pipeline
    console.log('\n5️⃣ Checking Handover Pipeline Eligibility...')
    if (property.handover_status === 'IN_PROGRESS') {
      console.log('✅ Property has IN_PROGRESS handover status - should appear in handover pipeline')
      
      // Check if handover pipeline record exists
      const { data: handover, error: handoverError } = await supabase
        .from('handover_pipeline')
        .select('id, handover_status, current_stage, overall_progress')
        .eq('property_id', property.id)
        .single()

      if (handover) {
        console.log('✅ Handover pipeline record found:', {
          id: handover.id,
          handover_status: handover.handover_status,
          current_stage: handover.current_stage,
          overall_progress: handover.overall_progress
        })
      } else {
        console.log('⚠️ No handover pipeline record found - will create mock record in UI')
      }
    } else {
      console.log(`ℹ️ Property handover status is ${property.handover_status} - not eligible for handover pipeline`)
    }

    // Sign out
    await supabase.auth.signOut()
    console.log('✅ Signed out')

    // 6. Summary
    console.log('\n📊 SUMMARY')
    console.log('=' .repeat(40))
    console.log(`Property: ${property.name}`)
    console.log(`Property Status: ${property.handover_status}`)
    console.log(`Interest Status: ${interest.status}`)
    console.log(`Payment Amount: KES ${interest.deposit_amount_kes}`)
    console.log(`Payment Date: ${interest.deposit_paid_at}`)
    console.log(`Verified Date: ${interest.payment_verified_at}`)
    
    console.log('\n🎯 EXPECTED VISIBILITY:')
    console.log('✅ Client Portal - My Properties tab (status: CONVERTED)')
    console.log('✅ Admin Dashboard - Client Interests (status: CONVERTED)')
    console.log('✅ Admin Dashboard - Handover Pipeline (handover_status: IN_PROGRESS)')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testPropertyVisibility()
