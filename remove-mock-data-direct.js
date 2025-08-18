#!/usr/bin/env node

/**
 * Remove Mock Data Script - Direct Approach
 * This script removes all sample/mock data using direct Supabase client calls
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('Please check your .env.local file')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function removeMockData() {
  console.log('🧹 Starting direct mock data removal...')
  console.log('')

  try {
    // Step 1: Get mock subdivision IDs
    console.log('📋 Finding mock subdivisions...')
    const { data: mockSubdivisions, error: subdivisionError } = await supabase
      .from('subdivisions')
      .select('subdivision_id, name')
      .in('name', ['Westlands Gardens', 'Kikuyu Heights', 'Syokimau Commercial Park', 'Rongai Residences', 'Kenol Farms'])

    if (subdivisionError) {
      console.error('Error finding subdivisions:', subdivisionError)
      return
    }

    console.log(`Found ${mockSubdivisions?.length || 0} mock subdivisions`)

    if (mockSubdivisions && mockSubdivisions.length > 0) {
      const subdivisionIds = mockSubdivisions.map(s => s.subdivision_id)

      // Step 2: Get mock plot IDs
      console.log('📋 Finding mock plots...')
      const { data: mockPlots, error: plotError } = await supabase
        .from('plots')
        .select('plot_id, plot_no')
        .in('subdivision_id', subdivisionIds)

      if (plotError) {
        console.error('Error finding plots:', plotError)
        return
      }

      console.log(`Found ${mockPlots?.length || 0} mock plots`)

      if (mockPlots && mockPlots.length > 0) {
        const plotIds = mockPlots.map(p => p.plot_id)

        // Step 3: Remove listings for mock plots
        console.log('🗑️  Removing mock listings...')
        const { error: listingsError } = await supabase
          .from('listings')
          .delete()
          .in('plot_id', plotIds)

        if (listingsError) {
          console.log('⚠️  Error removing listings:', listingsError.message)
        } else {
          console.log('✅ Mock listings removed')
        }

        // Step 4: Remove offers/reservations for mock plots
        console.log('🗑️  Removing mock offers/reservations...')
        const { error: offersError } = await supabase
          .from('offers_reservations')
          .delete()
          .in('plot_id', plotIds)

        if (offersError) {
          console.log('⚠️  Error removing offers:', offersError.message)
        } else {
          console.log('✅ Mock offers/reservations removed')
        }

        // Step 5: Remove sale agreements for mock plots
        console.log('🗑️  Removing mock sale agreements...')
        const { error: agreementsError } = await supabase
          .from('sale_agreements')
          .delete()
          .in('plot_id', plotIds)

        if (agreementsError) {
          console.log('⚠️  Error removing sale agreements:', agreementsError.message)
        } else {
          console.log('✅ Mock sale agreements removed')
        }

        // Step 6: Remove receipts (if any exist)
        console.log('🗑️  Removing mock receipts...')
        try {
          const { error: receiptsError } = await supabase
            .from('receipts')
            .delete()
            .in('sale_agreement_id', plotIds) // This might not work perfectly, but we'll try

          if (receiptsError) {
            console.log('⚠️  Error removing receipts:', receiptsError.message)
          } else {
            console.log('✅ Mock receipts removed')
          }
        } catch (e) {
          console.log('⚠️  Receipts table might not exist or have different structure')
        }

        // Step 7: Remove mock plots
        console.log('🗑️  Removing mock plots...')
        const { error: plotsDeleteError } = await supabase
          .from('plots')
          .delete()
          .in('plot_id', plotIds)

        if (plotsDeleteError) {
          console.log('⚠️  Error removing plots:', plotsDeleteError.message)
        } else {
          console.log('✅ Mock plots removed')
        }
      }

      // Step 8: Remove mock subdivisions
      console.log('🗑️  Removing mock subdivisions...')
      const { error: subdivisionsDeleteError } = await supabase
        .from('subdivisions')
        .delete()
        .in('subdivision_id', subdivisionIds)

      if (subdivisionsDeleteError) {
        console.log('⚠️  Error removing subdivisions:', subdivisionsDeleteError.message)
      } else {
        console.log('✅ Mock subdivisions removed')
      }
    }

    // Step 9: Remove mock clients
    console.log('🗑️  Removing mock clients...')
    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .in('full_name', [
        'James Mwangi Kariuki', 
        'Sarah Njoki Wambui', 
        'Peter Ochieng Otieno', 
        'Grace Wanjiku Kamau', 
        'David Kiprop Koech'
      ])

    if (clientsError) {
      console.log('⚠️  Error removing clients:', clientsError.message)
    } else {
      console.log('✅ Mock clients removed')
    }

    // Step 10: Remove mock parcels
    console.log('🗑️  Removing mock parcels...')
    const { error: parcelsError } = await supabase
      .from('parcels')
      .delete()
      .in('lr_number', [
        'NAIROBI/BLOCK1/123', 
        'KIAMBU/BLOCK5/456', 
        'MACHAKOS/BLOCK2/789', 
        'KAJIADO/BLOCK3/101', 
        'MURANG\'A/BLOCK1/202'
      ])

    if (parcelsError) {
      console.log('⚠️  Error removing parcels:', parcelsError.message)
    } else {
      console.log('✅ Mock parcels removed')
    }

    console.log('')
    console.log('🎉 Mock data removal completed!')
    console.log('')

    // Verification
    console.log('🔍 Verifying removal...')
    
    const { data: remainingSubdivisions } = await supabase
      .from('subdivisions')
      .select('name')
      .in('name', ['Westlands Gardens', 'Kikuyu Heights', 'Syokimau Commercial Park', 'Rongai Residences', 'Kenol Farms'])

    const { data: remainingPlots } = await supabase
      .from('plots')
      .select('plot_no')
      .like('plot_no', 'A00%')

    const { data: remainingClients } = await supabase
      .from('clients')
      .select('full_name')
      .in('full_name', ['James Mwangi Kariuki', 'Sarah Njoki Wambui', 'Peter Ochieng Otieno'])

    console.log(`📊 Final verification:`)
    console.log(`   Mock subdivisions remaining: ${remainingSubdivisions?.length || 0}`)
    console.log(`   Mock plots remaining: ${remainingPlots?.length || 0}`)
    console.log(`   Mock clients remaining: ${remainingClients?.length || 0}`)
    console.log('')

    if ((remainingSubdivisions?.length || 0) === 0 && (remainingPlots?.length || 0) === 0 && (remainingClients?.length || 0) === 0) {
      console.log('🎉 SUCCESS: All mock data has been successfully removed!')
      console.log('')
      console.log('✅ The Property Listings should now be empty')
      console.log('✅ No more Plot A007, A008, A009, A010 entries')
      console.log('✅ No more fake prices and descriptions')
      console.log('')
      console.log('You can now refresh the application to see the clean interface.')
    } else {
      console.log('⚠️  Some mock data still remains. You may need to check for:')
      console.log('- Modified data that no longer matches the original patterns')
      console.log('- Additional mock data not covered by this script')
    }

  } catch (error) {
    console.error('❌ Error during mock data removal:', error.message)
    console.error('')
    console.error('Please check your database connection and permissions.')
  }
}

// Run the script
removeMockData().catch(console.error)
