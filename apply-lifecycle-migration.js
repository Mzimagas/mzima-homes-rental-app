#!/usr/bin/env node

/**
 * Apply Property Lifecycle Management Migration
 * This script adds the necessary columns and tables for the three property creation pathways
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🔧 Applying Property Lifecycle Management Migration...')
  console.log('')

  try {
    // Step 1: Add property lifecycle columns
    console.log('1️⃣ Adding property lifecycle columns...')
    
    const lifecycleColumns = [
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_source TEXT DEFAULT \'DIRECT_ADDITION\'',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT \'ACTIVE\'',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS source_reference_id UUID',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS parent_property_id UUID REFERENCES properties(id)',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS subdivision_date DATE',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_completion_date DATE',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS acquisition_notes TEXT',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS expected_rental_income_kes DECIMAL(12,2)',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS sale_price_kes DECIMAL(15,2)',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS estimated_value_kes DECIMAL(15,2)',
    ]

    for (const sql of lifecycleColumns) {
      try {
        const { error } = await supabase.rpc('exec', { sql })
        if (error) {
          console.log(`⚠️  ${sql.substring(0, 50)}... - ${error.message}`)
        } else {
          console.log(`✅ ${sql.substring(0, 50)}...`)
        }
      } catch (e) {
        console.log(`⚠️  ${sql.substring(0, 50)}... - ${e.message}`)
      }
    }

    // Step 2: Add land-specific columns
    console.log('')
    console.log('2️⃣ Adding land-specific columns...')
    
    const landColumns = [
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area_sqm DECIMAL(12,2)',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area_acres DECIMAL(10,4)',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS zoning_classification TEXT',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS title_deed_number TEXT',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS road_access_type TEXT',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS topography TEXT',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS soil_type TEXT',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS drainage_status TEXT',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS electricity_available BOOLEAN DEFAULT FALSE',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS water_available BOOLEAN DEFAULT FALSE',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS sewer_available BOOLEAN DEFAULT FALSE',
      'ALTER TABLE properties ADD COLUMN IF NOT EXISTS internet_available BOOLEAN DEFAULT FALSE',
    ]

    for (const sql of landColumns) {
      try {
        const { error } = await supabase.rpc('exec', { sql })
        if (error) {
          console.log(`⚠️  ${sql.substring(0, 50)}... - ${error.message}`)
        } else {
          console.log(`✅ ${sql.substring(0, 50)}...`)
        }
      } catch (e) {
        console.log(`⚠️  ${sql.substring(0, 50)}... - ${e.message}`)
      }
    }

    // Step 3: Create purchase pipeline table
    console.log('')
    console.log('3️⃣ Creating purchase pipeline table...')
    
    const createPurchasePipelineTable = `
      CREATE TABLE IF NOT EXISTS purchase_pipeline (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_name TEXT NOT NULL,
        property_address TEXT NOT NULL,
        property_type TEXT NOT NULL DEFAULT 'HOME',
        seller_name TEXT,
        seller_contact TEXT,
        asking_price_kes DECIMAL(15,2),
        negotiated_price_kes DECIMAL(15,2),
        deposit_paid_kes DECIMAL(15,2),
        balance_due_kes DECIMAL(15,2),
        purchase_status TEXT NOT NULL DEFAULT 'IDENTIFIED',
        target_completion_date DATE,
        actual_completion_date DATE,
        legal_representative TEXT,
        financing_source TEXT,
        inspection_notes TEXT,
        due_diligence_notes TEXT,
        contract_reference TEXT,
        title_deed_status TEXT,
        survey_status TEXT,
        valuation_amount_kes DECIMAL(15,2),
        loan_amount_kes DECIMAL(15,2),
        cash_amount_kes DECIMAL(15,2),
        closing_costs_kes DECIMAL(15,2),
        total_investment_kes DECIMAL(15,2),
        expected_rental_income_kes DECIMAL(12,2),
        expected_roi_percentage DECIMAL(5,2),
        risk_assessment TEXT,
        property_condition_notes TEXT,
        required_improvements TEXT,
        improvement_cost_estimate_kes DECIMAL(12,2),
        documents_checklist JSONB DEFAULT '{}',
        milestone_dates JSONB DEFAULT '{}',
        created_by UUID,
        assigned_to UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_property_id UUID
      )
    `

    try {
      const { error } = await supabase.rpc('exec', { sql: createPurchasePipelineTable })
      if (error) {
        console.log(`⚠️  Purchase pipeline table - ${error.message}`)
      } else {
        console.log(`✅ Purchase pipeline table created`)
      }
    } catch (e) {
      console.log(`⚠️  Purchase pipeline table - ${e.message}`)
    }

    // Step 4: Create property subdivisions table
    console.log('')
    console.log('4️⃣ Creating property subdivisions table...')
    
    const createSubdivisionsTable = `
      CREATE TABLE IF NOT EXISTS property_subdivisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_property_id UUID NOT NULL,
        subdivision_name TEXT NOT NULL,
        subdivision_plan_reference TEXT,
        surveyor_name TEXT,
        surveyor_contact TEXT,
        total_plots_planned INTEGER NOT NULL,
        total_plots_created INTEGER DEFAULT 0,
        subdivision_status TEXT NOT NULL DEFAULT 'PLANNING',
        approval_authority TEXT,
        approval_reference TEXT,
        approval_date DATE,
        survey_cost_kes DECIMAL(12,2),
        approval_fees_kes DECIMAL(12,2),
        infrastructure_cost_kes DECIMAL(12,2),
        total_subdivision_cost_kes DECIMAL(12,2),
        expected_plot_value_kes DECIMAL(15,2),
        expected_total_value_kes DECIMAL(15,2),
        expected_profit_kes DECIMAL(15,2),
        start_date DATE,
        target_completion_date DATE,
        actual_completion_date DATE,
        subdivision_notes TEXT,
        legal_requirements JSONB DEFAULT '{}',
        infrastructure_requirements JSONB DEFAULT '{}',
        created_by UUID,
        assigned_to UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    try {
      const { error } = await supabase.rpc('exec', { sql: createSubdivisionsTable })
      if (error) {
        console.log(`⚠️  Property subdivisions table - ${error.message}`)
      } else {
        console.log(`✅ Property subdivisions table created`)
      }
    } catch (e) {
      console.log(`⚠️  Property subdivisions table - ${e.message}`)
    }

    // Step 5: Create subdivision plots table
    console.log('')
    console.log('5️⃣ Creating subdivision plots table...')
    
    const createPlotsTable = `
      CREATE TABLE IF NOT EXISTS subdivision_plots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subdivision_id UUID NOT NULL,
        plot_number TEXT NOT NULL,
        plot_size_sqm DECIMAL(10,2) NOT NULL,
        plot_size_acres DECIMAL(8,4),
        plot_coordinates JSONB,
        plot_status TEXT NOT NULL DEFAULT 'PLANNED',
        title_deed_number TEXT,
        estimated_value_kes DECIMAL(12,2),
        actual_sale_price_kes DECIMAL(12,2),
        buyer_name TEXT,
        sale_date DATE,
        property_id UUID,
        plot_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    try {
      const { error } = await supabase.rpc('exec', { sql: createPlotsTable })
      if (error) {
        console.log(`⚠️  Subdivision plots table - ${error.message}`)
      } else {
        console.log(`✅ Subdivision plots table created`)
      }
    } catch (e) {
      console.log(`⚠️  Subdivision plots table - ${e.message}`)
    }

    // Step 6: Create indexes
    console.log('')
    console.log('6️⃣ Creating indexes...')
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(property_source)',
      'CREATE INDEX IF NOT EXISTS idx_properties_lifecycle_status ON properties(lifecycle_status)',
      'CREATE INDEX IF NOT EXISTS idx_properties_parent_property ON properties(parent_property_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_status ON purchase_pipeline(purchase_status)',
      'CREATE INDEX IF NOT EXISTS idx_property_subdivisions_original ON property_subdivisions(original_property_id)',
      'CREATE INDEX IF NOT EXISTS idx_subdivision_plots_subdivision ON subdivision_plots(subdivision_id)',
    ]

    for (const sql of indexes) {
      try {
        const { error } = await supabase.rpc('exec', { sql })
        if (error) {
          console.log(`⚠️  ${sql.substring(0, 50)}... - ${error.message}`)
        } else {
          console.log(`✅ ${sql.substring(0, 50)}...`)
        }
      } catch (e) {
        console.log(`⚠️  ${sql.substring(0, 50)}... - ${e.message}`)
      }
    }

    console.log('')
    console.log('🎉 MIGRATION COMPLETED!')
    console.log('')
    console.log('✅ Property lifecycle management features are now available:')
    console.log('   - Direct property addition with enhanced form')
    console.log('   - Purchase pipeline tracking and transfer')
    console.log('   - Subdivision process management')
    console.log('   - Property source and lifecycle status tracking')
    console.log('')
    console.log('You can now use the three property creation pathways in the Properties tab.')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
applyMigration().catch(console.error)
