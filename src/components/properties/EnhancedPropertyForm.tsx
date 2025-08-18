'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase, { handleSupabaseError } from '../../lib/supabase-client'
import AddressAutocomplete from '../location/AddressAutocomplete'
import { PropertyTypeEnum, getPropertyTypeLabel, isLandProperty } from '../../lib/validation/property'
import { Button, TextField, FormField } from '../ui'
import Modal from '../ui/Modal'

// Enhanced property schema with lifecycle tracking
const enhancedPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(120),
  physicalAddress: z.string().min(1, 'Physical address is required').max(250),
  propertyType: PropertyTypeEnum.default('HOME'),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
  notes: z.string().max(1000).optional().or(z.literal('')),
  // Enhanced fields for property lifecycle
  acquisitionNotes: z.string().max(500).optional(),
  expectedRentalIncome: z.number().positive().optional(),
  purchasePrice: z.number().positive().optional(),
  estimatedValue: z.number().positive().optional(),
  // Land-specific fields
  totalAreaSqm: z.number().positive().optional(),
  totalAreaAcres: z.number().positive().optional(),
  zoningClassification: z.string().max(100).optional(),
  titleDeedNumber: z.string().max(100).optional(),
  roadAccessType: z.string().max(100).optional(),
  topography: z.string().max(100).optional(),
  soilType: z.string().max(100).optional(),
  drainageStatus: z.string().max(100).optional(),
  electricityAvailable: z.boolean().default(false),
  waterAvailable: z.boolean().default(false),
  sewerAvailable: z.boolean().default(false),
  internetAvailable: z.boolean().default(false),
}).refine((val) => {
  // If one coordinate provided, require the other
  if ((val.lat !== undefined && val.lng === undefined) || (val.lng !== undefined && val.lat === undefined)) return false
  return true
}, { message: 'Please provide both latitude and longitude, or leave both empty', path: ['lat'] })

type EnhancedPropertyFormValues = z.infer<typeof enhancedPropertySchema>

interface EnhancedPropertyFormProps {
  onSuccess?: (propertyId: string) => void
  onCancel?: () => void
  isOpen: boolean
  property?: any
  sourceType?: 'DIRECT_ADDITION' | 'PURCHASE_PIPELINE' | 'SUBDIVISION_PROCESS'
  sourceReferenceId?: string
  parentPropertyId?: string
}

export default function EnhancedPropertyForm({ 
  onSuccess, 
  onCancel, 
  isOpen, 
  property,
  sourceType = 'DIRECT_ADDITION',
  sourceReferenceId,
  parentPropertyId
}: EnhancedPropertyFormProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'details' | 'financial'>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<EnhancedPropertyFormValues>({
    resolver: zodResolver(enhancedPropertySchema),
    defaultValues: {
      name: property?.name || '',
      physicalAddress: property?.physical_address || '',
      propertyType: (property?.property_type as any) || 'HOME',
      lat: property?.lat ?? undefined,
      lng: property?.lng ?? undefined,
      notes: property?.notes || '',
      acquisitionNotes: property?.acquisition_notes || '',
      expectedRentalIncome: property?.expected_rental_income_kes || undefined,
      purchasePrice: property?.sale_price_kes || undefined,
      estimatedValue: property?.estimated_value_kes || undefined,
      totalAreaSqm: property?.total_area_sqm || undefined,
      totalAreaAcres: property?.total_area_acres || undefined,
      zoningClassification: property?.zoning_classification || '',
      titleDeedNumber: property?.title_deed_number || '',
      roadAccessType: property?.road_access_type || '',
      topography: property?.topography || '',
      soilType: property?.soil_type || '',
      drainageStatus: property?.drainage_status || '',
      electricityAvailable: property?.electricity_available || false,
      waterAvailable: property?.water_available || false,
      sewerAvailable: property?.sewer_available || false,
      internetAvailable: property?.internet_available || false,
    }
  })

  const selectedPropertyType = watch('propertyType')
  const watchedAreaSqm = watch('totalAreaSqm')
  const watchedAreaAcres = watch('totalAreaAcres')

  useEffect(() => {
    if (property) {
      reset({
        name: property.name || '',
        physicalAddress: property.physical_address || '',
        propertyType: (property.property_type as any) || 'HOME',
        lat: property.lat ?? undefined,
        lng: property.lng ?? undefined,
        notes: property.notes || '',
        acquisitionNotes: property.acquisition_notes || '',
        expectedRentalIncome: property.expected_rental_income_kes || undefined,
        purchasePrice: property.sale_price_kes || undefined,
        estimatedValue: property.estimated_value_kes || undefined,
        totalAreaSqm: property.total_area_sqm || undefined,
        totalAreaAcres: property.total_area_acres || undefined,
        zoningClassification: property.zoning_classification || '',
        titleDeedNumber: property.title_deed_number || '',
        roadAccessType: property.road_access_type || '',
        topography: property.topography || '',
        soilType: property.soil_type || '',
        drainageStatus: property.drainage_status || '',
        electricityAvailable: property.electricity_available || false,
        waterAvailable: property.water_available || false,
        sewerAvailable: property.sewer_available || false,
        internetAvailable: property.internet_available || false,
      })
    }
  }, [property, reset])

  // Auto-convert between sqm and acres
  const handleAreaSqmChange = (value: string) => {
    const sqm = parseFloat(value)
    if (!isNaN(sqm) && sqm > 0) {
      const acres = sqm / 4047 // 1 acre = 4047 sqm
      setValue('totalAreaAcres', parseFloat(acres.toFixed(4)))
    }
  }

  const handleAreaAcresChange = (value: string) => {
    const acres = parseFloat(value)
    if (!isNaN(acres) && acres > 0) {
      const sqm = acres * 4047
      setValue('totalAreaSqm', parseFloat(sqm.toFixed(2)))
    }
  }

  const onSubmit = async (values: EnhancedPropertyFormValues) => {
    try {
      setIsSubmitting(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to create a property')
        return
      }

      if (property) {
        // Update existing property
        const updateData: any = {
          name: values.name.trim(),
          physical_address: values.physicalAddress.trim(),
          property_type: values.propertyType,
          notes: values.notes?.trim() || null,
          acquisition_notes: values.acquisitionNotes?.trim() || null,
          expected_rental_income_kes: values.expectedRentalIncome || null,
          sale_price_kes: values.purchasePrice || null,
          estimated_value_kes: values.estimatedValue || null,
          total_area_sqm: values.totalAreaSqm || null,
          total_area_acres: values.totalAreaAcres || null,
          zoning_classification: values.zoningClassification?.trim() || null,
          title_deed_number: values.titleDeedNumber?.trim() || null,
          road_access_type: values.roadAccessType?.trim() || null,
          topography: values.topography?.trim() || null,
          soil_type: values.soilType?.trim() || null,
          drainage_status: values.drainageStatus?.trim() || null,
          electricity_available: values.electricityAvailable,
          water_available: values.waterAvailable,
          sewer_available: values.sewerAvailable,
          internet_available: values.internetAvailable,
        }

        if (values.lat !== undefined) updateData.lat = values.lat
        if (values.lng !== undefined) updateData.lng = values.lng

        const { error: updateError } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', property.id)

        if (updateError) {
          alert(`Failed to update property: ${updateError.message}`)
          return
        }

        onSuccess?.(property.id)
      } else {
        // Create new property
        const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
          property_name: values.name.trim(),
          property_address: values.physicalAddress.trim(),
          property_type: values.propertyType,
          owner_user_id: user.id
        })

        if (createError) {
          alert(`Failed to create property: ${createError.message}`)
          return
        }

        // Update with additional fields including lifecycle tracking
        const updateData: any = {
          notes: values.notes?.trim() || null,
          acquisition_notes: values.acquisitionNotes?.trim() || null,
          expected_rental_income_kes: values.expectedRentalIncome || null,
          sale_price_kes: values.purchasePrice || null,
          estimated_value_kes: values.estimatedValue || null,
          total_area_sqm: values.totalAreaSqm || null,
          total_area_acres: values.totalAreaAcres || null,
          zoning_classification: values.zoningClassification?.trim() || null,
          title_deed_number: values.titleDeedNumber?.trim() || null,
          road_access_type: values.roadAccessType?.trim() || null,
          topography: values.topography?.trim() || null,
          soil_type: values.soilType?.trim() || null,
          drainage_status: values.drainageStatus?.trim() || null,
          electricity_available: values.electricityAvailable,
          water_available: values.waterAvailable,
          sewer_available: values.sewerAvailable,
          internet_available: values.internetAvailable,
          // Lifecycle tracking
          property_source: sourceType,
          source_reference_id: sourceReferenceId || null,
          parent_property_id: parentPropertyId || null,
          lifecycle_status: sourceType === 'PURCHASE_PIPELINE' ? 'PURCHASED' : 'ACTIVE',
          purchase_completion_date: sourceType === 'PURCHASE_PIPELINE' ? new Date().toISOString().split('T')[0] : null,
          subdivision_date: sourceType === 'SUBDIVISION_PROCESS' ? new Date().toISOString().split('T')[0] : null,
        }

        if (values.lat !== undefined) updateData.lat = values.lat
        if (values.lng !== undefined) updateData.lng = values.lng

        const { error: extraErr } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', propertyId)

        if (extraErr) {
          console.warn('Failed to update property details:', extraErr.message)
        }

        reset()
        onSuccess?.(propertyId)
      }
    } catch (err) {
      console.error(property ? 'Property update error:' : 'Property creation error:', err)
      alert('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '🏠' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'details', label: 'Details', icon: '📋' },
    { id: 'financial', label: 'Financial', icon: '💰' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={property ? 'Edit Property' : 'Add New Property'} size="large">
      <div className="space-y-6">
        {/* Source Type Indicator */}
        {sourceType !== 'DIRECT_ADDITION' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {sourceType === 'PURCHASE_PIPELINE' && <span className="text-2xl">🏢</span>}
                {sourceType === 'SUBDIVISION_PROCESS' && <span className="text-2xl">🏗️</span>}
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {sourceType === 'PURCHASE_PIPELINE' && 'Property from Purchase Pipeline'}
                  {sourceType === 'SUBDIVISION_PROCESS' && 'Property from Subdivision'}
                </h3>
                <p className="text-sm text-blue-600">
                  {sourceType === 'PURCHASE_PIPELINE' && 'This property is being added from a completed purchase.'}
                  {sourceType === 'SUBDIVISION_PROCESS' && 'This property is being created from a subdivision plot.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <FormField name="name" label="Property Name" error={errors.name?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('name')}
                    placeholder="e.g., Sunset Apartments, Green Valley Estate"
                  />
                )}
              </FormField>

              <FormField name="physicalAddress" label="Physical Address" error={errors.physicalAddress?.message}>
                {({ id }) => (
                  <AddressAutocomplete
                    id={id}
                    value={watch('physicalAddress')}
                    onChange={(address, lat, lng) => {
                      setValue('physicalAddress', address)
                      if (lat !== undefined && lng !== undefined) {
                        setValue('lat', lat)
                        setValue('lng', lng)
                      }
                    }}
                    placeholder="Enter the property address"
                  />
                )}
              </FormField>

              <FormField name="propertyType" label="Property Type" error={errors.propertyType?.message}>
                {({ id }) => (
                  <select id={id} {...register('propertyType')} className="form-select">
                    {PropertyTypeEnum.options.map((type) => (
                      <option key={type} value={type}>
                        {getPropertyTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>

              <FormField name="notes" label="Notes" error={errors.notes?.message}>
                {({ id }) => (
                  <textarea
                    id={id}
                    {...register('notes')}
                    rows={3}
                    className="form-textarea"
                    placeholder="Additional notes about this property..."
                  />
                )}
              </FormField>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="lat" label="Latitude" error={errors.lat?.message}>
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('lat', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      placeholder="e.g., -1.2921"
                    />
                  )}
                </FormField>

                <FormField name="lng" label="Longitude" error={errors.lng?.message}>
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('lng', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      placeholder="e.g., 36.8219"
                    />
                  )}
                </FormField>
              </div>

              {isLandProperty(selectedPropertyType) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="totalAreaSqm" label="Total Area (Square Meters)" error={errors.totalAreaSqm?.message}>
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('totalAreaSqm', { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          placeholder="e.g., 4047"
                          onChange={(e) => {
                            register('totalAreaSqm').onChange(e)
                            handleAreaSqmChange(e.target.value)
                          }}
                        />
                      )}
                    </FormField>

                    <FormField name="totalAreaAcres" label="Total Area (Acres)" error={errors.totalAreaAcres?.message}>
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('totalAreaAcres', { valueAsNumber: true })}
                          type="number"
                          step="0.0001"
                          placeholder="e.g., 1.0"
                          onChange={(e) => {
                            register('totalAreaAcres').onChange(e)
                            handleAreaAcresChange(e.target.value)
                          }}
                        />
                      )}
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="roadAccessType" label="Road Access Type">
                      {({ id }) => (
                        <select id={id} {...register('roadAccessType')} className="form-select">
                          <option value="">Select access type</option>
                          <option value="Tarmac Road">Tarmac Road</option>
                          <option value="Murram Road">Murram Road</option>
                          <option value="Gravel Road">Gravel Road</option>
                          <option value="Earth Road">Earth Road</option>
                          <option value="Footpath Only">Footpath Only</option>
                        </select>
                      )}
                    </FormField>

                    <FormField name="topography" label="Topography">
                      {({ id }) => (
                        <select id={id} {...register('topography')} className="form-select">
                          <option value="">Select topography</option>
                          <option value="Flat">Flat</option>
                          <option value="Gently Sloping">Gently Sloping</option>
                          <option value="Moderately Sloping">Moderately Sloping</option>
                          <option value="Steep">Steep</option>
                          <option value="Hilly">Hilly</option>
                          <option value="Valley">Valley</option>
                        </select>
                      )}
                    </FormField>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {isLandProperty(selectedPropertyType) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="zoningClassification" label="Zoning Classification">
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('zoningClassification')}
                          placeholder="e.g., Residential, Commercial"
                        />
                      )}
                    </FormField>

                    <FormField name="titleDeedNumber" label="Title Deed Number">
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('titleDeedNumber')}
                          placeholder="e.g., LR No. 123/456"
                        />
                      )}
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="soilType" label="Soil Type">
                      {({ id }) => (
                        <select id={id} {...register('soilType')} className="form-select">
                          <option value="">Select soil type</option>
                          <option value="Clay">Clay</option>
                          <option value="Sandy">Sandy</option>
                          <option value="Loam">Loam</option>
                          <option value="Rocky">Rocky</option>
                          <option value="Black Cotton">Black Cotton</option>
                          <option value="Red Soil">Red Soil</option>
                        </select>
                      )}
                    </FormField>

                    <FormField name="drainageStatus" label="Drainage Status">
                      {({ id }) => (
                        <select id={id} {...register('drainageStatus')} className="form-select">
                          <option value="">Select drainage status</option>
                          <option value="Well Drained">Well Drained</option>
                          <option value="Moderately Drained">Moderately Drained</option>
                          <option value="Poor Drainage">Poor Drainage</option>
                          <option value="Seasonal Flooding">Seasonal Flooding</option>
                          <option value="Swampy">Swampy</option>
                        </select>
                      )}
                    </FormField>
                  </div>

                  {/* Utilities */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Available Utilities</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('electricityAvailable')}
                          className="form-checkbox"
                        />
                        <span className="ml-2 text-sm">Electricity</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('waterAvailable')}
                          className="form-checkbox"
                        />
                        <span className="ml-2 text-sm">Water</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('sewerAvailable')}
                          className="form-checkbox"
                        />
                        <span className="ml-2 text-sm">Sewer</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('internetAvailable')}
                          className="form-checkbox"
                        />
                        <span className="ml-2 text-sm">Internet</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <FormField name="acquisitionNotes" label="Acquisition Notes">
                {({ id }) => (
                  <textarea
                    id={id}
                    {...register('acquisitionNotes')}
                    rows={3}
                    className="form-textarea"
                    placeholder="Notes about how this property was acquired..."
                  />
                )}
              </FormField>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="purchasePrice" label="Purchase Price (KES)" error={errors.purchasePrice?.message}>
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('purchasePrice', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="e.g., 5000000"
                    />
                  )}
                </FormField>

                <FormField name="estimatedValue" label="Estimated Current Value (KES)" error={errors.estimatedValue?.message}>
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('estimatedValue', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="e.g., 6000000"
                    />
                  )}
                </FormField>
              </div>

              <FormField name="expectedRentalIncome" label="Expected Monthly Rental Income (KES)" error={errors.expectedRentalIncome?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('expectedRentalIncome', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="e.g., 50000"
                  />
                )}
              </FormField>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (property ? 'Update Property' : 'Create Property')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
