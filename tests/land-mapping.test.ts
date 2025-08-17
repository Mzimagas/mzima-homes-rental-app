// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { toFormFromDb, toDbFromForm } from '../src/lib/land-mapping'

describe('land-mapping', () => {
  it('maps DB -> Form correctly', () => {
    const db = {
      total_area_sqm: 4047,
      total_area_acres: 1,
      frontage_meters: 50,
      zoning_classification: 'Residential',
      title_deed_number: 'NAIROBI/BLOCK/123',
      survey_plan_number: 'SP/123/2023',
      development_permit_status: 'APPROVED',
      electricity_available: true,
      water_available: false,
      sewer_available: true,
      road_access_type: 'Tarmac Road',
      internet_available: true,
      topography: 'Flat',
      soil_type: 'Loam',
      drainage_status: 'Well Drained',
      sale_price_kes: 5000000,
      lease_price_per_sqm_kes: 100,
      lease_duration_years: 99,
      price_negotiable: true,
      development_potential: 'High density',
      nearby_landmarks: ['School', 'Market'],
    }
    const form = toFormFromDb(db)
    expect(form.totalAreaSqm).toBe(4047)
    expect(form.totalAreaAcres).toBe(1)
    expect(form.zoningClassification).toBe('Residential')
    expect(form.titleDeedNumber).toBe('NAIROBI/BLOCK/123')
    expect(form.developmentPermitStatus).toBe('APPROVED')
    expect(form.electricityAvailable).toBe(true)
    expect(form.waterAvailable).toBe(false)
    expect(form.leaseDurationYears).toBe(99)
  })

  it('maps Form -> DB correctly', () => {
    const form = {
      totalAreaSqm: 8094,
      totalAreaAcres: 2,
      frontageMeters: 100,
      zoningClassification: 'Commercial',
      titleDeedNumber: 'NAKURU/BLOCK/55',
      developmentPermitStatus: 'PENDING',
      electricityAvailable: false,
      waterAvailable: true,
      sewerAvailable: false,
      roadAccessType: 'Murram Road',
      internetAvailable: false,
      salePriceKes: 7500000,
      leasePricePerSqmKes: 110,
      leaseDurationYears: 50,
      priceNegotiable: false,
    }
    const db = toDbFromForm(form)
    expect(db.total_area_sqm).toBe(8094)
    expect(db.total_area_acres).toBe(2)
    expect(db.frontage_meters).toBe(100)
    expect(db.zoning_classification).toBe('Commercial')
    expect(db.development_permit_status).toBe('PENDING')
    expect(db.water_available).toBe(true)
    expect(db.price_negotiable).toBe(false)
  })
})

