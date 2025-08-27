/**
 * Script to bulk create land properties in Mzima Homes
 * Run with: npx tsx scripts/create-land-properties.ts
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration - you'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface LandProperty {
  name: string
  lat: number
  lng: number
  property_type: 'RESIDENTIAL_LAND' | 'AGRICULTURAL_LAND' | 'COMMERCIAL_LAND' | 'MIXED_USE_LAND'
  physical_address: string
  notes?: string
}

// Land properties data
const landProperties: LandProperty[] = [
  // Oyosi / Vindo (RESIDENTIAL_LAND)
  {
    name: 'Oyosi Plots Vindo near Ketraco 1796',
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Oyosi Plots, Vindo, Voi',
  },
  {
    name: 'Oyosi Plots Vindo near Ketraco 1795',
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Oyosi Plots, Vindo, Voi',
  },
  {
    name: 'Oyosi Plots Vindo near Ketraco 1780',
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Oyosi Plots, Vindo, Voi',
  },
  {
    name: 'Oyosi Plots Vindo near Ketraco 1781',
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Oyosi Plots, Vindo, Voi',
  },
  {
    name: 'Oyosi Plots Vindo near Ketraco 1798',
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Oyosi Plots, Vindo, Voi',
  },
  {
    name: 'Oyosi Plots Vindo near Ketraco 1799',
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Oyosi Plots, Vindo, Voi',
  },
  {
    name: 'Oyosi Plots Vindo near Ketraco 1791',
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Oyosi Plots, Vindo, Voi',
  },

  // Voi Ndara 'A' (RESIDENTIAL_LAND)
  {
    name: "Voi Ndara 'A' 3573 (0.04Ha)",
    lat: -3.411058571553273,
    lng: 38.571013416460474,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: "Voi Ndara 'A', Voi",
  },
  {
    name: "Voi Ndara 'A' 3574 (0.04Ha)",
    lat: -3.4111478534178796,
    lng: 38.57109472584757,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: "Voi Ndara 'A', Voi",
  },
  {
    name: "Voi Ndara 'A' 3806 (0.1Ha)",
    lat: -3.4103181017010367,
    lng: 38.562074744553804,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: "Voi Ndara 'A', Voi",
  },
  {
    name: "Voi Ndara 'A' 3646 (0.04Ha)",
    lat: -3.4117521738141816,
    lng: 38.563240833305954,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: "Voi Ndara 'A', Voi",
  },
  {
    name: "Voi Ndara 'A' 3647 (0.04Ha)",
    lat: -3.4116525985084563,
    lng: 38.5631521647741,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: "Voi Ndara 'A', Voi",
  },
  {
    name: "Voi Ndara 'A' 121 (0.02Ha)",
    lat: -3.3948443088177367,
    lng: 38.5876689813544,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: "Voi Ndara 'A', Voi",
  },

  // Mbololo / Mraru (RESIDENTIAL_LAND)
  {
    name: 'Mbololo/Mraru/1950 (0.81Ha)',
    lat: -3.378474567786734,
    lng: 38.528306612888315,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Mbololo/Mraru, Voi',
  },

  // Chawia / Wusi / Kaya (RESIDENTIAL_LAND)
  {
    name: 'Chawia Wusi Kaya 3761 (0.07Ha)',
    lat: -3.501693503231535,
    lng: 38.3792648089544,
    property_type: 'RESIDENTIAL_LAND',
    physical_address: 'Chawia/Wusi/Kaya, Voi',
  },

  // Kwale – Mbuguni Phase 1 Scheme (AGRICULTURAL_LAND)
  {
    name: 'Kwale Mbuguni Phase 1 / 470',
    lat: -4.126751777518665,
    lng: 39.563322567563894,
    property_type: 'AGRICULTURAL_LAND',
    physical_address: 'Mbuguni Phase 1, Kwale',
  },
  {
    name: 'Kwale Mbuguni Phase 1 / 475',
    lat: -4.128097873851513,
    lng: 39.56551268105572,
    property_type: 'AGRICULTURAL_LAND',
    physical_address: 'Mbuguni Phase 1, Kwale',
  },
  {
    name: 'Kwale Mbuguni Phase 1 / 483',
    lat: -4.127563775703985,
    lng: 39.55668815407185,
    property_type: 'AGRICULTURAL_LAND',
    physical_address: 'Mbuguni Phase 1, Kwale',
  },
  {
    name: 'Kwale Mbuguni Phase 1 / 512',
    lat: -4.13114277379516,
    lng: 39.5563459810559,
    property_type: 'AGRICULTURAL_LAND',
    physical_address: 'Mbuguni Phase 1, Kwale',
  },

  // Kwale – Ng'ombeni (COMMERCIAL_LAND)
  {
    name: "Kwale Ng'ombeni 3046 (0.1Ha)",
    lat: -4.0965540211870355,
    lng: 39.611758460649355,
    property_type: 'COMMERCIAL_LAND',
    physical_address: "Ng'ombeni, Kwale",
  },
  {
    name: "Kwale Ng'ombeni 3047 (0.05Ha)",
    lat: -4.0965540211870355,
    lng: 39.611758460649355,
    property_type: 'COMMERCIAL_LAND',
    physical_address: "Ng'ombeni, Kwale",
  },
  {
    name: "Kwale Ng'ombeni 3048 (0.05Ha)",
    lat: -4.0965540211870355,
    lng: 39.611758460649355,
    property_type: 'COMMERCIAL_LAND',
    physical_address: "Ng'ombeni, Kwale",
  },

  // Rong'e / Nyika (MIXED_USE_LAND)
  {
    name: "Rong'e Nyika 3588 (0.045Ha)",
    lat: -3.417053081471783,
    lng: 38.4984110186349,
    property_type: 'MIXED_USE_LAND',
    physical_address: "Rong'e/Nyika, Voi",
  },

  // Kwale – Tsunza S.S. (RESIDENTIAL_LAND) - Sample entries
  // Note: You mentioned 11 properties but didn't provide all coordinates
  // Add the remaining properties with their specific coordinates here
]

async function createLandProperties() {
  console.log(`Starting bulk creation of ${landProperties.length} land properties...`)

  let successCount = 0
  let errorCount = 0

  for (const property of landProperties) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          name: property.name,
          physical_address: property.physical_address,
          property_type: property.property_type,
          lat: property.lat,
          lng: property.lng,
          notes: property.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error(`Failed to create property "${property.name}":`, error.message)
        errorCount++
      } else {
        console.log(`✓ Created property: ${property.name}`)
        successCount++
      }
    } catch (err) {
      console.error(`Error creating property "${property.name}":`, err)
      errorCount++
    }
  }

  console.log(`\nBulk creation completed:`)
  console.log(`✓ Successfully created: ${successCount} properties`)
  console.log(`✗ Failed: ${errorCount} properties`)
}

// Run the script
if (require.main === module) {
  createLandProperties()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Script failed:', err)
      process.exit(1)
    })
}

export { createLandProperties, landProperties }
