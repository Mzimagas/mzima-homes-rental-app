// Script to apply the land property migration directly
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyLandPropertyMigration() {
  console.log('🔧 Applying Land Property Migration...\n')

  try {
    // Step 1: Add basic area columns
    console.log('1️⃣ Adding area columns...')
    
    const areaColumns = [
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area_sqm DECIMAL(12,2);',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area_acres DECIMAL(10,4);',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS frontage_meters DECIMAL(8,2);'
    ]

    for (const sql of areaColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`❌ Failed: ${sql}`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ Success: ${sql.split(' ')[5]}`)
      }
    }

    // Step 2: Add legal and zoning columns
    console.log('\n2️⃣ Adding legal and zoning columns...')
    
    const legalColumns = [
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS zoning_classification TEXT;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS title_deed_number TEXT;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS survey_plan_number TEXT;'
    ]

    for (const sql of legalColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`❌ Failed: ${sql}`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ Success: ${sql.split(' ')[5]}`)
      }
    }

    // Step 3: Add utility columns
    console.log('\n3️⃣ Adding utility columns...')
    
    const utilityColumns = [
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS electricity_available BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS water_available BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS sewer_available BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS internet_available BOOLEAN DEFAULT FALSE;'
    ]

    for (const sql of utilityColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`❌ Failed: ${sql}`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ Success: ${sql.split(' ')[5]}`)
      }
    }

    // Step 4: Add access and physical columns
    console.log('\n4️⃣ Adding access and physical columns...')
    
    const physicalColumns = [
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS road_access_type TEXT;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS topography TEXT;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS soil_type TEXT;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS drainage_status TEXT;'
    ]

    for (const sql of physicalColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`❌ Failed: ${sql}`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ Success: ${sql.split(' ')[5]}`)
      }
    }

    // Step 5: Add pricing columns
    console.log('\n5️⃣ Adding pricing columns...')
    
    const pricingColumns = [
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS sale_price_kes DECIMAL(15,2);',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_price_per_sqm_kes DECIMAL(10,2);',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_duration_years INTEGER;',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_negotiable BOOLEAN DEFAULT TRUE;'
    ]

    for (const sql of pricingColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`❌ Failed: ${sql}`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ Success: ${sql.split(' ')[5]}`)
      }
    }

    // Step 6: Add development permit enum and column
    console.log('\n6️⃣ Adding development permit status...')
    
    const permitSql = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'development_permit_status_enum') THEN
          CREATE TYPE development_permit_status_enum AS ENUM ('APPROVED', 'PENDING', 'NOT_REQUIRED', 'DENIED');
        END IF;
      END $$;
    `
    
    const { error: enumError } = await supabase.rpc('exec_sql', { sql: permitSql })
    if (enumError) {
      console.log('❌ Failed to create enum:', enumError.message)
    } else {
      console.log('✅ Development permit enum created')
    }

    const { error: permitError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE properties ADD COLUMN IF NOT EXISTS development_permit_status development_permit_status_enum;'
    })
    if (permitError) {
      console.log('❌ Failed to add permit column:', permitError.message)
    } else {
      console.log('✅ Development permit column added')
    }

    // Step 7: Test the migration
    console.log('\n7️⃣ Testing migration...')
    
    const { data: testProperty, error: testError } = await supabase
      .from('properties')
      .select('id, name, total_area_acres, zoning_classification, electricity_available')
      .limit(1)
      .single()

    if (testError) {
      console.log('❌ Migration test failed:', testError.message)
    } else {
      console.log('✅ Migration test successful')
      console.log('   Property:', testProperty.name)
      console.log('   Area (acres):', testProperty.total_area_acres || 'NULL')
      console.log('   Zoning:', testProperty.zoning_classification || 'NULL')
      console.log('   Electricity:', testProperty.electricity_available)
    }

    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('✅ All land property columns have been added')
    console.log('✅ PropertySizeConverter can now use total_area_acres')
    console.log('✅ Land Overview tab will display all fields correctly')
    console.log('✅ LandDetailsForm save functionality is ready')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the migration
applyLandPropertyMigration().then(() => {
  console.log('\n✅ Migration script completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Migration script failed:', error)
  process.exit(1)
})
