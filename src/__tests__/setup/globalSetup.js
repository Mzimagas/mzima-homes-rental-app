// Global test setup for database and environment
const { createClient } = require('@supabase/supabase-js')

module.exports = async () => {
  console.log('Setting up test environment...')
  
  // Ensure we're using test environment
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test'
  }

  // Setup test database connection
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Test database connection
    const { data, error } = await supabase.from('parcels').select('count').limit(1)
    if (error) {
      console.error('Database connection failed:', error)
      throw error
    }
    
    console.log('Database connection successful')
    
    // Create test data if needed
    await setupTestData(supabase)
    
  } catch (error) {
    console.error('Test setup failed:', error)
    throw error
  }
}

async function setupTestData(supabase) {
  // Create test parcel if it doesn't exist
  const { data: existingParcel } = await supabase
    .from('parcels')
    .select('parcel_id')
    .eq('lr_number', 'TEST/BLOCK1/001')
    .single()

  if (!existingParcel) {
    await supabase
      .from('parcels')
      .insert({
        lr_number: 'TEST/BLOCK1/001',
        registry_office: 'Test Registry',
        county: 'Test County',
        locality: 'Test Locality',
        tenure: 'freehold',
        acreage_ha: 1.0,
        current_use: 'residential'
      })
    
    console.log('Test parcel created')
  }

  // Create test subdivision if it doesn't exist
  const { data: existingSubdivision } = await supabase
    .from('subdivisions')
    .select('subdivision_id')
    .eq('name', 'Test Subdivision')
    .single()

  if (!existingSubdivision) {
    const { data: parcel } = await supabase
      .from('parcels')
      .select('parcel_id')
      .eq('lr_number', 'TEST/BLOCK1/001')
      .single()

    if (parcel) {
      await supabase
        .from('subdivisions')
        .insert({
          parcel_id: parcel.parcel_id,
          name: 'Test Subdivision',
          description: 'Test subdivision for integration testing',
          total_plots_planned: 10,
          status: 'planning'
        })
      
      console.log('Test subdivision created')
    }
  }

  // Create test plots if they don't exist
  const { data: existingPlots } = await supabase
    .from('plots')
    .select('plot_id')
    .ilike('plot_no', 'TEST%')

  if (!existingPlots || existingPlots.length === 0) {
    const { data: subdivision } = await supabase
      .from('subdivisions')
      .select('subdivision_id')
      .eq('name', 'Test Subdivision')
      .single()

    if (subdivision) {
      const testPlots = []
      for (let i = 1; i <= 5; i++) {
        testPlots.push({
          subdivision_id: subdivision.subdivision_id,
          plot_no: `TEST${i.toString().padStart(3, '0')}`,
          size_sqm: 1000,
          access_type: 'public_road',
          utility_level: 'water_power',
          stage: 'ready_for_sale'
        })
      }

      await supabase
        .from('plots')
        .insert(testPlots)
      
      console.log('Test plots created')
    }
  }

  console.log('Test data setup complete')
}
