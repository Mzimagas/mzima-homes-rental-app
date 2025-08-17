'use client'

import { useState } from 'react'
import supabase from '../../lib/supabase-client'
import { useAuth } from '../../lib/auth-context'
import { PropertyType } from '../../lib/validation/property'

interface LandPropertyData {
  name: string
  lat: number
  lng: number
  property_type: PropertyType
  physical_address: string
  notes?: string
}

interface BulkLandPropertyCreatorProps {
  onSuccess?: () => void
  onCancel?: () => void
  isOpen: boolean
}

// Complete comprehensive land properties data with exact plot identifiers
const sampleLandProperties: LandPropertyData[] = [
  // Vindo Block 1 (RESIDENTIAL_LAND) - 67 properties with exact plot identifiers
  {
    name: "Vindo Block 1/1796 (0.046Ha)",
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1795 (0.046Ha)",
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1780 (0.046Ha)",
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1781 (0.046Ha)",
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1798 (0.046Ha)",
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1799 (0.046Ha)",
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1791 (0.046Ha)",
    lat: -3.4187619083202248,
    lng: 38.52822721178401,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3620 (0.044Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3621 (0.044Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3622 (0.044Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3623 (0.048Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3624 (0.057Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3625 (0.044Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3626 (0.044Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3627 (0.044Ha)",
    lat: -3.3805687944555,
    lng: 38.53002377708872,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/17 (0.81Ha)",
    lat: -3.3799539677955117,
    lng: 38.52306111541812,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/213 (0.81Ha)",
    lat: -3.387240570350177,
    lng: 38.52809109173295,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2326 (0.045Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2327 (0.045Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2328 (0.045Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2329 (0.045Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2325 (0.045Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2324 (0.045Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2323 (0.045Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2322 (0.05Ha)",
    lat: -3.390915879307836,
    lng: 38.526311610694634,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/329 (0.41Ha)",
    lat: -3.3947336257229956,
    lng: 38.518956962325014,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3279 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3280 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3281 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3282 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3283 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3284 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3285 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/818/3286 (0.046Ha)",
    lat: -3.4083808341774198,
    lng: 38.517269184936936,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/715 (0.81Ha)",
    lat: -3.4090723392675915,
    lng: 38.514392846707786,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/716 (0.81Ha)",
    lat: -3.4090723392675915,
    lng: 38.514392846707786,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/883/3076 (0.086Ha)",
    lat: -3.4095984841123093,
    lng: 38.518323340304654,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/883/3077 (0.086Ha)",
    lat: -3.4095984841123093,
    lng: 38.518323340304654,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3136 (0.043Ha)",
    lat: -3.418475730269112,
    lng: 38.51784892113106,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3137 (0.046Ha)",
    lat: -3.418475730269112,
    lng: 38.51784892113106,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3134 (0.046Ha)",
    lat: -3.418475730269112,
    lng: 38.51784892113106,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3128 (0.043Ha)",
    lat: -3.418475730269112,
    lng: 38.51784892113106,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3129 (0.046Ha)",
    lat: -3.418475730269112,
    lng: 38.51784892113106,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3138 (0.046Ha)",
    lat: -3.418475730269112,
    lng: 38.51784892113106,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3130 (0.046Ha)",
    lat: -3.418475730269112,
    lng: 38.51784892113106,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1144 (0.405Ha)",
    lat: -3.41821217760858,
    lng: 38.51904362256217,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1984 (0.4Ha)",
    lat: -3.418545673594143,
    lng: 38.51550114622162,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1996 (0.045Ha)",
    lat: -3.4180527079859995,
    lng: 38.51544704784125,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1980 (0.045Ha)",
    lat: -3.418832738631604,
    lng: 38.51480387820819,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1988 (0.045Ha)",
    lat: -3.4185830876314807,
    lng: 38.514716648747175,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/1990 (0.045Ha)",
    lat: -3.4182796855817217,
    lng: 38.514794748285844,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/797 (0.81Ha)",
    lat: -3.4173728658502314,
    lng: 38.51420729330312,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3469 (0.045Ha)",
    lat: -3.4260972477137,
    lng: 38.50938085753778,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3471 (0.045Ha)",
    lat: -3.425982582773498,
    lng: 38.509681287399346,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3472 (0.045Ha)",
    lat: -3.425894378963995,
    lng: 38.509804993812935,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3473 (0.045Ha)",
    lat: -3.4258855585825914,
    lng: 38.509928700226524,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3474 (0.045Ha)",
    lat: -3.42582381591053,
    lng: 38.510078915157315,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3468 (0.045Ha)",
    lat: -3.426467703580465,
    lng: 38.50950456395137,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3412 (0.405Ha)",
    lat: -3.428032637861381,
    lng: 38.51487948733472,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3413 (0.405Ha)",
    lat: -3.4282584249568226,
    lng: 38.51466889492074,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2205 (0.05Ha)",
    lat: -3.4275434620546945,
    lng: 38.5179673641852,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2206 (0.05Ha)",
    lat: -3.4274368869406655,
    lng: 38.51808994747656,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/2508 (0.338Ha)",
    lat: -3.421838967233694,
    lng: 38.52127765184069,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/453 (0.82Ha)",
    lat: -3.393443859147454,
    lng: 38.53123343027686,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3634 (0.045Ha)",
    lat: -3.3907761636028426,
    lng: 38.52330634897828,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3630 (0.052Ha)",
    lat: -3.3907761636028426,
    lng: 38.52330634897828,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },
  {
    name: "Vindo Block 1/3629 (0.045Ha)",
    lat: -3.3907761636028426,
    lng: 38.52330634897828,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Vindo Block 1, Voi Municipality"
  },

  // Voi Ndara 'A' (RESIDENTIAL_LAND) - 6 properties
  {
    name: "Voi Ndara 'A' 3573 (0.04Ha)",
    lat: -3.411058571553273,
    lng: 38.571013416460474,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Voi Ndara 'A', Voi"
  },
  {
    name: "Voi Ndara 'A' 3574 (0.04Ha)",
    lat: -3.4111478534178796,
    lng: 38.57109472584757,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Voi Ndara 'A', Voi"
  },
  {
    name: "Voi Ndara 'A' 3806 (0.1Ha)",
    lat: -3.4103181017010367,
    lng: 38.562074744553804,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Voi Ndara 'A', Voi"
  },
  {
    name: "Voi Ndara 'A' 3646 (0.04Ha)",
    lat: -3.4117521738141816,
    lng: 38.563240833305954,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Voi Ndara 'A', Voi"
  },
  {
    name: "Voi Ndara 'A' 3647 (0.04Ha)",
    lat: -3.4116525985084563,
    lng: 38.5631521647741,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Voi Ndara 'A', Voi"
  },
  {
    name: "Voi Ndara 'A' 121 (0.02Ha)",
    lat: -3.3948443088177367,
    lng: 38.5876689813544,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Voi Ndara 'A', Voi"
  },

  // Mbololo/Mraru (RESIDENTIAL_LAND) - 1 property
  {
    name: "Mbololo/Mraru/1950 (0.4Ha)",
    lat: -3.378474567786734,
    lng: 38.528306612888315,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Mbololo/Mraru, Voi"
  },

  // Chawia/Wusi/Kaya (RESIDENTIAL_LAND) - 1 property
  {
    name: "Chawia Wusi Kaya 3761 (0.07Ha)",
    lat: -3.501693503231535,
    lng: 38.3792648089544,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Chawia/Wusi/Kaya, Voi"
  },

  // Kwale Mbuguni Phase 1 Scheme (AGRICULTURAL_LAND) - 4 properties
  {
    name: "Kwale Mbuguni Phase 1/470 (1.6Ha)",
    lat: -4.126751777518665,
    lng: 39.563322567563894,
    property_type: "AGRICULTURAL_LAND",
    physical_address: "Mbuguni Phase 1, Kwale"
  },
  {
    name: "Kwale Mbuguni Phase 1/475 (1.6Ha)",
    lat: -4.128097873851513,
    lng: 39.56551268105572,
    property_type: "AGRICULTURAL_LAND",
    physical_address: "Mbuguni Phase 1, Kwale"
  },
  {
    name: "Kwale Mbuguni Phase 1/483 (1.6Ha)",
    lat: -4.127563775703985,
    lng: 39.55668815407185,
    property_type: "AGRICULTURAL_LAND",
    physical_address: "Mbuguni Phase 1, Kwale"
  },
  {
    name: "Kwale Mbuguni Phase 1/512 (1.6Ha)",
    lat: -4.13114277379516,
    lng: 39.5563459810559,
    property_type: "AGRICULTURAL_LAND",
    physical_address: "Mbuguni Phase 1, Kwale"
  },

  // Kwale Tsunza S.S. (RESIDENTIAL_LAND) - 11 properties with exact coordinates
  {
    name: "Tsunza S.S/447 (0.572Ha)",
    lat: -4.075074463405202,
    lng: 39.56054486756335,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza S.S/229 (0.38Ha)",
    lat: -4.06816206706754,
    lng: 39.565822567563316,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza S.S/478 (0.5612Ha)",
    lat: -4.079294572731523,
    lng: 39.56638889639933,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza S.S/114 (0.4Ha)",
    lat: -4.065352260959748,
    lng: 39.559967809891376,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza S.S/475 (0.39Ha)",
    lat: -4.078097859163015,
    lng: 39.56693366756338,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza/335 (0.55Ha)",
    lat: -4.061997456353159,
    lng: 39.56604672338316,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza, Kwale"
  },
  {
    name: "Tsunza S.S/28 (0.40Ha)",
    lat: -4.0581513630188235,
    lng: 39.56721146756313,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza/1680 (0.27Ha)",
    lat: -4.059460941055819,
    lng: 39.55854300323617,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza, Kwale"
  },
  {
    name: "Tsunza S.S/175 (0.40Ha)",
    lat: -4.0667410613087185,
    lng: 39.55998926756339,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza S.S/144 (0.41Ha)",
    lat: -4.0659719720945535,
    lng: 39.568290381055135,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },
  {
    name: "Tsunza S.S/76 (0.29Ha)",
    lat: -4.0620723695437135,
    lng: 39.56221146756334,
    property_type: "RESIDENTIAL_LAND",
    physical_address: "Tsunza S.S., Kwale"
  },

  // Kwale Ng'ombeni (COMMERCIAL_LAND) - 3 properties
  {
    name: "Kwale Ng'ombeni/3046 (0.1Ha)",
    lat: -4.0965540211870355,
    lng: 39.611758460649355,
    property_type: "COMMERCIAL_LAND",
    physical_address: "Ng'ombeni, Kwale"
  },
  {
    name: "Kwale Ng'ombeni/3047 (0.05Ha)",
    lat: -4.0965540211870355,
    lng: 39.611758460649355,
    property_type: "COMMERCIAL_LAND",
    physical_address: "Ng'ombeni, Kwale"
  },
  {
    name: "Kwale Ng'ombeni/3048 (0.05Ha)",
    lat: -4.0965540211870355,
    lng: 39.611758460649355,
    property_type: "COMMERCIAL_LAND",
    physical_address: "Ng'ombeni, Kwale"
  },

  // Rong'e/Nyika (MIXED_USE_LAND) - 1 property
  {
    name: "Rong'e Nyika 3588 (0.045Ha)",
    lat: -3.417053081471783,
    lng: 38.4984110186349,
    property_type: "MIXED_USE_LAND",
    physical_address: "Rong'e/Nyika, Voi"
  }
]

export default function BulkLandPropertyCreator({ onSuccess, onCancel, isOpen }: BulkLandPropertyCreatorProps) {
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  })

  const createProperties = async () => {
    if (!user) {
      console.error('No authenticated user found')
      setResults({ success: 0, failed: 0, errors: ['Authentication required'] })
      return
    }
    console.log('Starting bulk property creation...')
    setIsCreating(true)
    setProgress({ current: 0, total: sampleLandProperties.length })
    setResults({ success: 0, failed: 0, errors: [] })

    let successCount = 0
    let failedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // First, check for existing properties to avoid duplicates
    console.log('Checking for existing properties...')
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('name')
      .is('disabled_at', null) // Only active properties

    const existingNames = new Set(existingProperties?.map(p => p.name) || [])

    for (let i = 0; i < sampleLandProperties.length; i++) {
      const property = sampleLandProperties[i]
      console.log(`Processing property ${i + 1}/${sampleLandProperties.length}: ${property.name}`)
      setProgress({ current: i + 1, total: sampleLandProperties.length })

      // Skip if property already exists
      if (existingNames.has(property.name)) {
        console.log(`Skipping ${property.name} - already exists`)
        skippedCount++
        continue
      }

      try {
        // Use the same stored procedure as the regular property form
        const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
          property_name: property.name,
          property_address: property.physical_address,
          property_type: property.property_type,
          owner_user_id: user.id
        })

        if (createError) {
          console.error(`Failed to create ${property.name}:`, createError)
          failedCount++
          errors.push(`${property.name}: ${createError.message}`)
        } else {
          console.log(`Successfully created property with ID ${propertyId}: ${property.name}`)

          // Update with coordinates and notes if provided
          if (property.lat !== undefined || property.lng !== undefined || property.notes) {
            const extra: any = {}
            if (property.lat !== undefined) extra.lat = property.lat
            if (property.lng !== undefined) extra.lng = property.lng
            if (property.notes) extra.notes = property.notes

            const { error: extraErr } = await supabase
              .from('properties')
              .update(extra)
              .eq('id', propertyId)

            if (extraErr) {
              console.warn(`Failed to update coordinates for ${property.name}:`, extraErr.message)
              // Don't count this as a failure since the property was created
            }
          }

          successCount++
        }
      } catch (err) {
        console.error(`Exception creating ${property.name}:`, err)
        failedCount++
        errors.push(`${property.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`Bulk creation completed. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`)
    setResults({
      success: successCount,
      failed: failedCount,
      errors: [
        ...errors,
        ...(skippedCount > 0 ? [`${skippedCount} properties were skipped because they already exist`] : [])
      ]
    })
    setIsCreating(false)

    if (successCount > 0 && onSuccess) {
      onSuccess()
    }
  }

  if (!isOpen) return null

  if (!user) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Required</h3>
            <p className="text-sm text-gray-600 mb-4">Please log in to create properties.</p>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Bulk Create Land Properties
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This will create {sampleLandProperties.length} land properties across different locations:
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• 67 Vindo Block 1 residential plots (1796, 1795, 1780, 1781, 1798, 1799, 1791, 3620-3627, 17, 213, 2322-2329, 329, 818/3279-3286, 715-716, 883/3076-3077, 3128-3138, 1144, 1984, 1996, 1980, 1988, 1990, 797, 3468-3474, 3412-3413, 2205-2206, 2508, 453, 3629-3630, 3634)</li>
              <li>• 6 Voi Ndara 'A' residential plots (3573, 3574, 3806, 3646, 3647, 121)</li>
              <li>• 1 Mbololo/Mraru residential plot (1950)</li>
              <li>• 1 Chawia/Wusi/Kaya residential plot (3761)</li>
              <li>• 4 Kwale Mbuguni Phase 1 agricultural plots (470, 475, 483, 512)</li>
              <li>• 11 Tsunza/Tsunza S.S. residential plots (447, 229, 478, 114, 475, 335, 28, 1680, 175, 144, 76)</li>
              <li>• 3 Kwale Ng'ombeni commercial plots (3046, 3047, 3048)</li>
              <li>• 1 Rong'e/Nyika mixed-use plot (3588)</li>
            </ul>
            <div className="mt-2 text-xs text-gray-400">
              <strong>Total: {sampleLandProperties.length} properties</strong> - 86 Residential, 4 Agricultural, 3 Commercial, 1 Mixed-Use
            </div>
          </div>

          {isCreating && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Creating properties...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {results.success > 0 || results.failed > 0 ? (
            <div className="mb-4 p-3 border rounded-md">
              <div className="text-sm">
                <div className="text-green-600">✓ Successfully created: {results.success} properties</div>
                {results.failed > 0 && (
                  <div className="text-red-600">✗ Failed: {results.failed} properties</div>
                )}
              </div>
              {results.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">View errors</summary>
                  <div className="mt-1 text-xs text-red-600 space-y-1">
                    {results.errors.map((error, i) => (
                      <div key={i}>{error}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : null}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {results.success > 0 ? 'Close' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={createProperties}
              disabled={isCreating || results.success > 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : results.success > 0 ? 'Completed' : 'Create Properties'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
