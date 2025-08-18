"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { landDetailsSchema, type LandDetailsFormValues } from '../../lib/validation/property'

interface LandDetailsFormProps {
  propertyId: string
  initialData?: Partial<LandDetailsFormValues>
  onSave: (data: LandDetailsFormValues) => Promise<void>
  onCancel: () => void
}

const ZONING_OPTIONS = [
  'Residential',
  'Commercial', 
  'Industrial',
  'Agricultural',
  'Mixed-Use',
  'Recreational',
  'Institutional'
]

const ROAD_ACCESS_OPTIONS = [
  'Tarmac Road',
  'Murram Road', 
  'Gravel Road',
  'Earth Road',
  'Footpath Only'
]

const TOPOGRAPHY_OPTIONS = [
  'Flat',
  'Gently Sloping',
  'Moderately Sloping', 
  'Steep',
  'Hilly',
  'Valley'
]

const SOIL_TYPE_OPTIONS = [
  'Clay',
  'Sandy',
  'Loam',
  'Rocky',
  'Black Cotton',
  'Red Soil'
]

const DRAINAGE_OPTIONS = [
  'Well Drained',
  'Moderately Drained',
  'Poor Drainage',
  'Seasonal Flooding',
  'Swampy'
]

export default function LandDetailsForm({ 
  propertyId, 
  initialData, 
  onSave, 
  onCancel 
}: LandDetailsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'legal' | 'utilities' | 'pricing'>('basic')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<LandDetailsFormValues>({
    resolver: zodResolver(landDetailsSchema),
    defaultValues: initialData
  })

  const watchedAreaSqm = watch('totalAreaSqm')
  const watchedAreaAcres = watch('totalAreaAcres')

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

  const onSubmit = async (data: LandDetailsFormValues) => {
    setIsSubmitting(true)
    try {
      await onSave(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📏' },
    { id: 'legal', label: 'Legal & Permits', icon: '📋' },
    { id: 'utilities', label: 'Utilities & Access', icon: '🔌' },
    { id: 'pricing', label: 'Pricing', icon: '💰' }
  ]

  return (
    <div className="bg-elevated rounded-xl shadow-md border border-light p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary mb-2">Land Details</h2>
        <p className="text-secondary">Provide detailed information about this land property</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-secondary p-1 rounded-lg mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-elevated text-primary shadow-sm'
                : 'text-tertiary hover:text-secondary'
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="totalAreaSqm" className="block text-sm font-medium text-secondary mb-2">
                  Total Area (Square Meters)
                </label>
                <input
                  id="totalAreaSqm"
                  type="number"
                  step="0.01"
                  {...register('totalAreaSqm', { valueAsNumber: true })}
                  onChange={(e) => {
                    register('totalAreaSqm').onChange(e)
                    handleAreaSqmChange(e.target.value)
                  }}
                  className="form-input"
                  placeholder="e.g., 4047"
                />
                {errors.totalAreaSqm && (
                  <p className="text-red-600 text-sm mt-1">{errors.totalAreaSqm.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="totalAreaAcres" className="block text-sm font-medium text-secondary mb-2">
                  Total Area (Acres)
                </label>
                <input
                  id="totalAreaAcres"
                  type="number"
                  step="0.0001"
                  {...register('totalAreaAcres', { valueAsNumber: true })}
                  onChange={(e) => {
                    register('totalAreaAcres').onChange(e)
                    handleAreaAcresChange(e.target.value)
                  }}
                  className="form-input"
                  placeholder="e.g., 1.0"
                />
                {errors.totalAreaAcres && (
                  <p className="text-red-600 text-sm mt-1">{errors.totalAreaAcres.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="frontageMeters" className="block text-sm font-medium text-secondary mb-2">
                Road Frontage (Meters)
              </label>
              <input
                id="frontageMeters"
                type="number"
                step="0.1"
                {...register('frontageMeters', { valueAsNumber: true })}
                className="form-input"
                placeholder="e.g., 50"
              />
              {errors.frontageMeters && (
                <p className="text-red-600 text-sm mt-1">{errors.frontageMeters.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="zoningClassification" className="block text-sm font-medium text-secondary mb-2">
                  Zoning Classification
                </label>
                <select id="zoningClassification" {...register('zoningClassification')} className="form-input">
                  <option value="">Select zoning...</option>
                  {ZONING_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="topography" className="block text-sm font-medium text-secondary mb-2">
                  Topography
                </label>
                <select id="topography" {...register('topography')} className="form-input">
                  <option value="">Select topography...</option>
                  {TOPOGRAPHY_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="soilType" className="block text-sm font-medium text-secondary mb-2">
                  Soil Type
                </label>
                <select id="soilType" {...register('soilType')} className="form-input">
                  <option value="">Select soil type...</option>
                  {SOIL_TYPE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="drainageStatus" className="block text-sm font-medium text-secondary mb-2">
                  Drainage Status
                </label>
                <select id="drainageStatus" {...register('drainageStatus')} className="form-input">
                  <option value="">Select drainage...</option>
                  {DRAINAGE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Legal & Permits Tab */}
        {activeTab === 'legal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Title Deed Number
                </label>
                <input
                  type="text"
                  {...register('titleDeedNumber')}
                  className="form-input"
                  placeholder="e.g., NAIROBI/BLOCK/123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Survey Plan Number
                </label>
                <input
                  type="text"
                  {...register('surveyPlanNumber')}
                  className="form-input"
                  placeholder="e.g., SP/123/2023"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Development Permit Status
              </label>
              <select {...register('developmentPermitStatus')} className="form-input">
                <option value="">Select status...</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="NOT_REQUIRED">Not Required</option>
                <option value="DENIED">Denied</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Development Potential
              </label>
              <textarea
                {...register('developmentPotential')}
                rows={3}
                className="form-input"
                placeholder="Describe the development potential of this land..."
              />
            </div>
          </div>
        )}

        {/* Utilities & Access Tab */}
        {activeTab === 'utilities' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-3">
                Available Utilities
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('electricityAvailable')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-secondary">Electricity Available</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('waterAvailable')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-secondary">Water Available</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('sewerAvailable')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-secondary">Sewer Connection</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('internetAvailable')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-secondary">Internet Available</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Road Access Type
              </label>
              <select {...register('roadAccessType')} className="form-input">
                <option value="">Select road access...</option>
                {ROAD_ACCESS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Sale Price (KES)
              </label>
              <input
                type="number"
                {...register('salePriceKes', { valueAsNumber: true })}
                className="form-input"
                placeholder="e.g., 5000000"
              />
              {errors.salePriceKes && (
                <p className="text-red-600 text-sm mt-1">{errors.salePriceKes.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Lease Price per Sqm (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('leasePricePerSqmKes', { valueAsNumber: true })}
                  className="form-input"
                  placeholder="e.g., 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Lease Duration (Years)
                </label>
                <input
                  type="number"
                  {...register('leaseDurationYears', { valueAsNumber: true })}
                  className="form-input"
                  placeholder="e.g., 99"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('priceNegotiable')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-secondary">Price is negotiable</span>
              </label>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-light">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Land Details'}
          </button>
        </div>
      </form>
    </div>
  )
}
