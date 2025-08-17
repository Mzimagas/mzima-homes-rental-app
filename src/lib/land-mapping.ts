export type LandDb = Partial<{
  total_area_sqm: number
  total_area_acres: number
  frontage_meters: number
  zoning_classification: string
  title_deed_number: string
  survey_plan_number: string
  development_permit_status: string
  electricity_available: boolean
  water_available: boolean
  sewer_available: boolean
  road_access_type: string
  internet_available: boolean
  topography: string
  soil_type: string
  drainage_status: string
  sale_price_kes: number
  lease_price_per_sqm_kes: number
  lease_duration_years: number
  price_negotiable: boolean
  development_potential: string
  nearby_landmarks: string[]
  environmental_restrictions: string[]
  building_restrictions: string[]
  easements: string[]
}>

export type LandForm = Partial<{
  totalAreaSqm: number
  totalAreaAcres: number
  frontageMeters: number
  zoningClassification: string
  titleDeedNumber: string
  surveyPlanNumber: string
  developmentPermitStatus: string
  electricityAvailable: boolean
  waterAvailable: boolean
  sewerAvailable: boolean
  roadAccessType: string
  internetAvailable: boolean
  topography: string
  soilType: string
  drainageStatus: string
  salePriceKes: number
  leasePricePerSqmKes: number
  leaseDurationYears: number
  priceNegotiable: boolean
  developmentPotential: string
  nearbyLandmarks: string[]
  environmentalRestrictions: string[]
  buildingRestrictions: string[]
  easements: string[]
}>

export function toFormFromDb(db: LandDb): LandForm {
  return {
    totalAreaSqm: db.total_area_sqm,
    totalAreaAcres: db.total_area_acres,
    frontageMeters: db.frontage_meters,
    zoningClassification: db.zoning_classification,
    titleDeedNumber: db.title_deed_number,
    surveyPlanNumber: db.survey_plan_number,
    developmentPermitStatus: db.development_permit_status,
    electricityAvailable: db.electricity_available,
    waterAvailable: db.water_available,
    sewerAvailable: db.sewer_available,
    roadAccessType: db.road_access_type,
    internetAvailable: db.internet_available,
    topography: db.topography,
    soilType: db.soil_type,
    drainageStatus: db.drainage_status,
    salePriceKes: db.sale_price_kes,
    leasePricePerSqmKes: db.lease_price_per_sqm_kes,
    leaseDurationYears: db.lease_duration_years,
    priceNegotiable: db.price_negotiable,
    developmentPotential: db.development_potential,
    nearbyLandmarks: db.nearby_landmarks,
    environmentalRestrictions: db.environmental_restrictions,
    buildingRestrictions: db.building_restrictions,
    easements: db.easements,
  }
}

export function toDbFromForm(form: LandForm): LandDb {
  return {
    total_area_sqm: form.totalAreaSqm,
    total_area_acres: form.totalAreaAcres,
    frontage_meters: form.frontageMeters,
    zoning_classification: form.zoningClassification,
    title_deed_number: form.titleDeedNumber,
    survey_plan_number: form.surveyPlanNumber,
    development_permit_status: form.developmentPermitStatus,
    electricity_available: form.electricityAvailable,
    water_available: form.waterAvailable,
    sewer_available: form.sewerAvailable,
    road_access_type: form.roadAccessType,
    internet_available: form.internetAvailable,
    topography: form.topography,
    soil_type: form.soilType,
    drainage_status: form.drainageStatus,
    sale_price_kes: form.salePriceKes,
    lease_price_per_sqm_kes: form.leasePricePerSqmKes,
    lease_duration_years: form.leaseDurationYears,
    price_negotiable: form.priceNegotiable,
    development_potential: form.developmentPotential,
    nearby_landmarks: form.nearbyLandmarks,
    environmental_restrictions: form.environmentalRestrictions,
    building_restrictions: form.buildingRestrictions,
    easements: form.easements,
  }
}

