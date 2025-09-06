'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Button, TextField, FormField } from '../../ui'
import Modal from '../../ui/Modal'
import AddressAutocomplete from '../../location/AddressAutocomplete'
import { PropertyTypeEnum } from '../../../lib/validation/property'
import { FieldSecurityService, ChangeRequest } from '../../../lib/security/field-security.service'
import {
  PurchasePipelineFormValues,
  purchasePipelineSchema,
} from '../types/purchase-pipeline.types'
import { PropertyManagementService } from '../services/property-management.service'

interface SecurePurchaseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: PurchasePipelineFormValues, changeRequests: ChangeRequest[]) => Promise<void>
  editingPurchase?: any
  userRole: string
}

export default function SecurePurchaseForm({
  isOpen,
  onClose,
  onSubmit,
  editingPurchase,
  userRole,
}: SecurePurchaseFormProps) {
  const [fieldSecurity, setFieldSecurity] = useState<Record<string, any>>({})
  const [originalValues, setOriginalValues] = useState<any>({})
  const [changeReasons, setChangeReasons] = useState<Record<string, string>>({})
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<ChangeRequest[]>([])
  const [availableProperties, setAvailableProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<any>(null)
  const [useExistingProperty, setUseExistingProperty] = useState(false)
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'with_succession' | 'without_succession'>('all')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PurchasePipelineFormValues>({
    resolver: zodResolver(purchasePipelineSchema),
  })

  const watchedValues = watch()

  // Load available properties with succession status
  useEffect(() => {
    const loadProperties = async () => {
      if (isOpen) {
        try {
          const properties = await PropertyManagementService.loadPropertiesWithSuccession()
          setAvailableProperties(properties)
        } catch (error) {
          console.error('Error loading properties:', error)
          // Fallback to regular property loading
          try {
            const fallbackProperties = await PropertyManagementService.loadProperties()
            setAvailableProperties(fallbackProperties.map(p => ({ ...p, succession_status: 'NOT_STARTED' })))
          } catch (fallbackError) {
            console.error('Error loading fallback properties:', fallbackError)
          }
        }
      }
    }
    loadProperties()
  }, [isOpen])

  // Load field security configuration
  useEffect(() => {
    const loadFieldSecurity = async () => {
      if (isOpen) {
        try {
          const fieldNames = Object.keys(purchasePipelineSchema.shape)
          const security = await FieldSecurityService.getFieldSecuritySummary(
            fieldNames,
            userRole,
            editingPurchase?.current_stage
          )
          setFieldSecurity(security)
        } catch (error) {
          console.error('Error loading field security:', error)
          // Set safe defaults if field security loading fails
          const fieldNames = Object.keys(purchasePipelineSchema.shape)
          const defaultSecurity = fieldNames.reduce((acc, fieldName) => {
            acc[fieldName] = {
              canModify: true,
              requiresReason: false,
              requiresApproval: false,
              isLocked: false,
            }
            return acc
          }, {} as Record<string, any>)
          setFieldSecurity(defaultSecurity)
        }
      }
    }
    loadFieldSecurity()
  }, [isOpen, userRole, editingPurchase])

  // Reset form and track original values
  useEffect(() => {
    if (isOpen) {
      if (editingPurchase) {
        const formValues = {
          propertyId: editingPurchase.property_id || '',
          propertyName: editingPurchase.property_name,
          propertyAddress: editingPurchase.property_address,
          propertyType: editingPurchase.property_type,
          sellerName: editingPurchase.seller_name || '',
          sellerPhone: editingPurchase.seller_contact || '',
          brokerName: editingPurchase.broker_name || '',
          brokerContact: editingPurchase.broker_contact || '',
          askingPrice: editingPurchase.asking_price_kes || undefined,
          negotiatedPrice: editingPurchase.negotiated_price_kes || undefined,
          depositPaid: editingPurchase.deposit_paid_kes || undefined,
          targetCompletionDate: editingPurchase.target_completion_date || '',
          legalRepresentative: editingPurchase.legal_representative || '',
          financingSource: editingPurchase.financing_source || '',
          contractReference: editingPurchase.contract_reference || '',
          titleDeedStatus: editingPurchase.title_deed_status || '',
          surveyStatus: editingPurchase.survey_status || '',
          expectedRentalIncome: editingPurchase.expected_rental_income_kes || undefined,
          expectedRoi: editingPurchase.expected_roi_percentage || undefined,
          riskAssessment: editingPurchase.risk_assessment || '',
          propertyConditionNotes: editingPurchase.property_condition_notes || '',
        }
        reset(formValues)
        setOriginalValues(formValues)

        // Set property selection state
        if (editingPurchase.property_id) {
          setUseExistingProperty(true)
          const property = availableProperties.find((p) => p.id === editingPurchase.property_id)
          if (property) {
            setSelectedProperty(property)
          }
        } else {
          setUseExistingProperty(false)
          setSelectedProperty(null)
        }
      } else {
        const emptyValues = {
          propertyId: '',
          propertyName: '',
          propertyAddress: '',
          propertyType: 'HOME' as any,
          sellerName: '',
          sellerPhone: '',
          sellerEmail: '',
          askingPrice: undefined,
          negotiatedPrice: undefined,
          depositPaid: undefined,
          targetCompletionDate: '',
          legalRepresentative: '',
          financingSource: '',
          contractReference: '',
          titleDeedStatus: '',
          surveyStatus: '',
          expectedRentalIncome: undefined,
          expectedRoi: undefined,
          riskAssessment: '',
          propertyConditionNotes: '',
        }
        reset(emptyValues)
        setOriginalValues(emptyValues)

        // Reset property selection state
        setUseExistingProperty(false)
        setSelectedProperty(null)
      }
      setChangeReasons({})
    }
  }, [isOpen, editingPurchase, reset, availableProperties])

  // Handle property selection
  const handlePropertySelection = (propertyId: string) => {
    const property = availableProperties.find((p) => p.id === propertyId)
    if (property) {
      setSelectedProperty(property)
      setValue('propertyId', propertyId)
      setValue('propertyName', property.name)
      setValue('propertyAddress', property.physical_address || '')
      setValue('propertyType', property.property_type || 'HOME')
    }
  }

  const handleUseExistingPropertyToggle = (use: boolean) => {
    setUseExistingProperty(use)
    if (!use) {
      setSelectedProperty(null)
      setValue('propertyId', '')
      // Don't clear other fields to allow manual entry
    }
  }

  // Filter properties based on succession status (with fallback for missing column)
  const filteredProperties = availableProperties.filter(property => {
    // If succession_status doesn't exist in database, treat all properties as 'NOT_STARTED'
    const successionStatus = property.succession_status || 'NOT_STARTED'

    switch (propertyFilter) {
      case 'with_succession':
        return successionStatus && successionStatus !== 'NOT_STARTED'
      case 'without_succession':
        return !successionStatus || successionStatus === 'NOT_STARTED'
      default:
        return true
    }
  })

  // Detect changes and build change requests
  const detectChanges = (): ChangeRequest[] => {
    const changes: ChangeRequest[] = []

    Object.keys(watchedValues).forEach((fieldName) => {
      const oldValue = originalValues[fieldName]
      const newValue = watchedValues[fieldName as keyof PurchasePipelineFormValues]

      if (oldValue !== newValue) {
        changes.push({
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          reason: changeReasons[fieldName],
        })
      }
    })

    return changes
  }

  // Handle form submission with security validation
  const handleSecureSubmit = async (values: PurchasePipelineFormValues) => {
    const changes = detectChanges()

    if (changes.length === 0) {
      // No changes, proceed normally
      await onSubmit(values, [])
      return
    }

    // Validate changes
    const validation = await FieldSecurityService.validateChangeRequest(
      editingPurchase?.id,
      changes,
      userRole,
      editingPurchase?.current_stage
    )

    if (!validation.valid) {
      alert(`Cannot save changes:\n${validation.errors.join('\n')}`)
      return
    }

    if (validation.requiresApproval) {
      setPendingChanges(changes)
      setShowApprovalDialog(true)
      return
    }

    // Proceed with changes
    await onSubmit(values, changes)
  }

  // Handle approval request submission
  const handleApprovalRequest = async (businessJustification: string, riskAssessment?: string) => {
    try {
      const approvalId = await FieldSecurityService.createChangeApprovalRequest(
        editingPurchase.id,
        pendingChanges,
        businessJustification,
        riskAssessment
      )

      alert(
        `Change approval request submitted (ID: ${approvalId}). Changes will be applied once approved.`
      )
      setShowApprovalDialog(false)
      onClose()
    } catch (error) {
            alert('Failed to submit approval request')
    }
  }

  // Render field with security indicators
  const renderSecureField = (fieldName: string, component: React.ReactNode) => {
    const security = fieldSecurity[fieldName]
    if (!security) return component

    const isChanged =
      originalValues[fieldName] !== watchedValues[fieldName as keyof PurchasePipelineFormValues]

    return (
      <div className="relative">
        {component}

        {/* Security indicators */}
        <div className="flex items-center gap-2 mt-1 text-xs">
          {security.isLocked && (
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">🔒 Locked</span>
          )}
          {security.requiresApproval && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              ⚠️ Requires Approval
            </span>
          )}
          {security.requiresReason && isChanged && (
            <input
              type="text"
              placeholder="Reason for change (required)"
              className="border rounded px-2 py-1 text-xs flex-1"
              value={changeReasons[fieldName] || ''}
              onChange={(e) =>
                setChangeReasons((prev) => ({
                  ...prev,
                  [fieldName]: e.target.value,
                }))
              }
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingPurchase ? 'Edit Purchase (Secure)' : 'New Purchase'}
        size="lg"
      >
        <div className="p-8">
          <form onSubmit={handleSubmit(handleSecureSubmit)} className="space-y-8">
            {/* Property Information Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🏢</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Property Information</h3>
                    <p className="text-blue-100 text-sm">Basic details about the property you're considering for purchase</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">

            {/* Property Selection Toggle */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Property Source</h4>
                <div className="text-sm text-gray-500">Choose how to define the property</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors bg-white">
                  <input
                    type="radio"
                    name="propertySource"
                    checked={!useExistingProperty}
                    onChange={() => handleUseExistingPropertyToggle(false)}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Create New Property</span>
                    <p className="text-xs text-gray-500 mt-1">Define a completely new property</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors bg-white">
                  <input
                    type="radio"
                    name="propertySource"
                    checked={useExistingProperty}
                    onChange={() => handleUseExistingPropertyToggle(true)}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Link to Existing Property</span>
                    <p className="text-xs text-gray-500 mt-1">Connect to a property already in the system</p>
                  </div>
                </label>
              </div>

              {useExistingProperty && (
                <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">Property Selection</h5>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Filter by succession:</label>
                      <select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">All Properties</option>
                        <option value="with_succession">With Succession</option>
                        <option value="without_succession">Without Succession</option>
                      </select>
                    </div>
                  </div>

                  <FormField
                    name="propertyId"
                    label="Select Property"
                    error={errors.propertyId?.message}
                  >
                    {({ id }) => (
                      <select
                        id={id}
                        value={watchedValues.propertyId || ''}
                        onChange={(e) => handlePropertySelection(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a property...</option>
                        {filteredProperties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name} - {property.physical_address || 'No address'}
                            {property.succession_status && property.succession_status !== 'NOT_STARTED' &&
                              ` (Succession: ${property.succession_status})`
                            }
                          </option>
                        ))}
                      </select>
                    )}
                  </FormField>

                  {filteredProperties.length === 0 && (
                    <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                      No properties match the selected filter criteria.
                    </div>
                  )}

                  {selectedProperty && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Selected Property Details
                        </h4>
                        {selectedProperty.succession_status && selectedProperty.succession_status !== 'NOT_STARTED' && (
                          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            Succession: {selectedProperty.succession_status}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700">Name:</span>
                            <span className="ml-2 text-gray-900">{selectedProperty.name}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Type:</span>
                            <span className="ml-2 text-gray-900">{selectedProperty.property_type || 'Not specified'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700">Address:</span>
                            <span className="ml-2 text-gray-900">{selectedProperty.physical_address || 'Not specified'}</span>
                          </div>
                          {selectedProperty.lat && selectedProperty.lng && (
                            <div>
                              <span className="font-medium text-gray-700">Coordinates:</span>
                              <span className="ml-2 text-gray-900">{selectedProperty.lat}, {selectedProperty.lng}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {renderSecureField(
              'propertyName',
              <FormField
                name="propertyName"
                label="Property Name"
                error={errors.propertyName?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('propertyName')}
                    disabled={
                      fieldSecurity.propertyName?.isLocked || !fieldSecurity.propertyName?.canModify
                    }
                    placeholder="Enter property name"
                  />
                )}
              </FormField>
            )}

            {renderSecureField(
              'propertyAddress',
              <FormField
                name="propertyAddress"
                label="Property Address"
                error={errors.propertyAddress?.message}
              >
                {({ id }) => (
                  <AddressAutocomplete
                    id={id}
                    value={watchedValues.propertyAddress || ''}
                    onChange={(address) => setValue('propertyAddress', address)}
                    disabled={
                      fieldSecurity.propertyAddress?.isLocked ||
                      !fieldSecurity.propertyAddress?.canModify
                    }
                    placeholder="Enter property address"
                  />
                )}
              </FormField>
            )}

            {renderSecureField(
              'propertyType',
              <FormField
                name="propertyType"
                label="Property Type"
                error={errors.propertyType?.message}
              >
                {({ id }) => (
                  <select
                    id={id}
                    {...register('propertyType')}
                    disabled={
                      fieldSecurity.propertyType?.isLocked || !fieldSecurity.propertyType?.canModify
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select property type</option>
                    {PropertyTypeEnum.options.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            )}
              </div>
            </div>

            {/* Seller Information Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Seller & Broker Information</h3>
                    <p className="text-green-100 text-sm">Contact details for the property seller and broker/agent</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">

              {/* Seller Information Sub-section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Seller Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderSecureField(
                    'sellerName',
                    <FormField name="sellerName" label="Seller Name" error={errors.sellerName?.message}>
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('sellerName')}
                          disabled={
                            fieldSecurity.sellerName?.isLocked || !fieldSecurity.sellerName?.canModify
                          }
                          placeholder="Enter seller name"
                        />
                      )}
                    </FormField>
                  )}

                  {renderSecureField(
                    'sellerPhone',
                    <FormField
                      name="sellerPhone"
                      label="Seller Contact"
                      error={errors.sellerPhone?.message}
                    >
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('sellerPhone')}
                          disabled={
                            fieldSecurity.sellerPhone?.isLocked || !fieldSecurity.sellerPhone?.canModify
                          }
                          placeholder="+254712345678"
                        />
                      )}
                    </FormField>
                  )}
                </div>
              </div>

              {/* Broker Information Sub-section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Broker/Agent Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderSecureField(
                    'brokerName',
                    <FormField name="brokerName" label="Broker Name" error={errors.brokerName?.message}>
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('brokerName')}
                          disabled={
                            fieldSecurity.brokerName?.isLocked || !fieldSecurity.brokerName?.canModify
                          }
                          placeholder="Enter broker/agent name"
                        />
                      )}
                    </FormField>
                  )}

                  {renderSecureField(
                    'brokerContact',
                    <FormField
                      name="brokerContact"
                      label="Broker Contact"
                      error={errors.brokerContact?.message}
                    >
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('brokerContact')}
                          disabled={
                            fieldSecurity.brokerContact?.isLocked || !fieldSecurity.brokerContact?.canModify
                          }
                          placeholder="+254712345678"
                        />
                      )}
                    </FormField>
                  )}
                </div>
              </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Financial Information</h3>
                    <p className="text-yellow-100 text-sm">Pricing details and financial terms for the purchase</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">

              {/* Pricing Sub-section */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  Pricing Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderSecureField(
                    'askingPrice',
                    <FormField
                      name="askingPrice"
                      label="Asking Price (KES)"
                      error={errors.askingPrice?.message}
                    >
                      {({ id }) => (
                        <TextField
                          id={id}
                          type="number"
                          {...register('askingPrice', { valueAsNumber: true })}
                          disabled={
                            fieldSecurity.askingPrice?.isLocked || !fieldSecurity.askingPrice?.canModify
                          }
                          placeholder="0"
                        />
                      )}
                    </FormField>
                  )}

                  {renderSecureField(
                    'negotiatedPrice',
                    <FormField
                      name="negotiatedPrice"
                      label="Negotiated Price (KES)"
                      error={errors.negotiatedPrice?.message}
                    >
                      {({ id }) => (
                        <TextField
                          id={id}
                          type="number"
                          {...register('negotiatedPrice', { valueAsNumber: true })}
                          disabled={
                            fieldSecurity.negotiatedPrice?.isLocked ||
                            !fieldSecurity.negotiatedPrice?.canModify
                          }
                          placeholder="0"
                        />
                      )}
                    </FormField>
                  )}
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderSecureField(
                'depositPaid',
                <FormField
                  name="depositPaid"
                  label="Deposit Paid (KES)"
                  error={errors.depositPaid?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      type="number"
                      {...register('depositPaid', { valueAsNumber: true })}
                      disabled={
                        fieldSecurity.depositPaid?.isLocked || !fieldSecurity.depositPaid?.canModify
                      }
                      placeholder="0"
                    />
                  )}
                </FormField>
              )}

              {renderSecureField(
                'financingSource',
                <FormField
                  name="financingSource"
                  label="Financing Source"
                  error={errors.financingSource?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('financingSource')}
                      disabled={
                        fieldSecurity.financingSource?.isLocked ||
                        !fieldSecurity.financingSource?.canModify
                      }
                      placeholder="Bank loan, cash, etc."
                    />
                  )}
                </FormField>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderSecureField(
                'expectedRentalIncome',
                <FormField
                  name="expectedRentalIncome"
                  label="Expected Rental Income (KES/month)"
                  error={errors.expectedRentalIncome?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      type="number"
                      {...register('expectedRentalIncome', { valueAsNumber: true })}
                      disabled={
                        fieldSecurity.expectedRentalIncome?.isLocked ||
                        !fieldSecurity.expectedRentalIncome?.canModify
                      }
                      placeholder="0"
                    />
                  )}
                </FormField>
              )}

              {renderSecureField(
                'expectedRoi',
                <FormField
                  name="expectedRoi"
                  label="Expected ROI (%)"
                  error={errors.expectedRoi?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      type="number"
                      step="0.1"
                      {...register('expectedRoi', { valueAsNumber: true })}
                      disabled={
                        fieldSecurity.expectedRoi?.isLocked || !fieldSecurity.expectedRoi?.canModify
                      }
                      placeholder="0.0"
                    />
                  )}
                </FormField>
              )}
            </div>
          </div>

          {/* Legal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Legal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderSecureField(
                'legalRepresentative',
                <FormField
                  name="legalRepresentative"
                  label="Legal Representative"
                  error={errors.legalRepresentative?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('legalRepresentative')}
                      disabled={
                        fieldSecurity.legalRepresentative?.isLocked ||
                        !fieldSecurity.legalRepresentative?.canModify
                      }
                      placeholder="Lawyer or legal firm"
                    />
                  )}
                </FormField>
              )}

              {renderSecureField(
                'targetCompletionDate',
                <FormField
                  name="targetCompletionDate"
                  label="Target Completion Date"
                  error={errors.targetCompletionDate?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      type="date"
                      {...register('targetCompletionDate')}
                      disabled={
                        fieldSecurity.targetCompletionDate?.isLocked ||
                        !fieldSecurity.targetCompletionDate?.canModify
                      }
                    />
                  )}
                </FormField>
              )}
            </div>
          </div>

            {/* Legal & Administrative Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900">Legal & Administrative</h3>
                <p className="text-sm text-gray-600 mt-1">Legal representation, documentation status, and administrative details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSecureField(
                'contractReference',
                <FormField
                  name="contractReference"
                  label="Contract Reference"
                  error={errors.contractReference?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('contractReference')}
                      disabled={
                        fieldSecurity.contractReference?.isLocked ||
                        !fieldSecurity.contractReference?.canModify
                      }
                      placeholder="Contract/Agreement number"
                    />
                  )}
                </FormField>
              )}

              {renderSecureField(
                'titleDeedStatus',
                <FormField
                  name="titleDeedStatus"
                  label="Title Deed Status"
                  error={errors.titleDeedStatus?.message}
                >
                  {({ id }) => (
                    <select
                      id={id}
                      {...register('titleDeedStatus')}
                      disabled={
                        fieldSecurity.titleDeedStatus?.isLocked ||
                        !fieldSecurity.titleDeedStatus?.canModify
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select status</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="PENDING">Pending</option>
                      <option value="ISSUES">Issues Found</option>
                      <option value="NOT_AVAILABLE">Not Available</option>
                    </select>
                  )}
                </FormField>
              )}

              {renderSecureField(
                'surveyStatus',
                <FormField
                  name="surveyStatus"
                  label="Survey Status"
                  error={errors.surveyStatus?.message}
                >
                  {({ id }) => (
                    <select
                      id={id}
                      {...register('surveyStatus')}
                      disabled={
                        fieldSecurity.surveyStatus?.isLocked ||
                        !fieldSecurity.surveyStatus?.canModify
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select status</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="PENDING">Pending</option>
                      <option value="NOT_REQUIRED">Not Required</option>
                    </select>
                  )}
                </FormField>
              )}
            </div>

            {renderSecureField(
              'riskAssessment',
              <FormField
                name="riskAssessment"
                label="Risk Assessment"
                error={errors.riskAssessment?.message}
              >
                {({ id }) => (
                  <textarea
                    id={id}
                    {...register('riskAssessment')}
                    disabled={
                      fieldSecurity.riskAssessment?.isLocked ||
                      !fieldSecurity.riskAssessment?.canModify
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Identify potential risks and mitigation strategies"
                  />
                )}
              </FormField>
            )}

            {renderSecureField(
              'propertyConditionNotes',
              <FormField
                name="propertyConditionNotes"
                label="Property Condition Notes"
                error={errors.propertyConditionNotes?.message}
              >
                {({ id }) => (
                  <textarea
                    id={id}
                    {...register('propertyConditionNotes')}
                    disabled={
                      fieldSecurity.propertyConditionNotes?.isLocked ||
                      !fieldSecurity.propertyConditionNotes?.canModify
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Current condition and any required improvements"
                  />
                )}
              </FormField>
            )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Approval Request Dialog */}
      {showApprovalDialog && (
        <Modal
          isOpen={showApprovalDialog}
          onClose={() => setShowApprovalDialog(false)}
          title="Approval Required"
        >
          <div className="space-y-4">
            <p>The following changes require approval:</p>
            <ul className="list-disc pl-5">
              {pendingChanges.map((change, index) => (
                <li key={index}>
                  <strong>{change.field_name}:</strong> {change.old_value} → {change.new_value}
                </li>
              ))}
            </ul>

            <FormField label="Business Justification (Required)">
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Explain why this change is necessary..."
                id="businessJustification"
              />
            </FormField>

            <FormField label="Risk Assessment (Optional)">
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={2}
                placeholder="Assess any risks associated with this change..."
                id="riskAssessment"
              />
            </FormField>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const justification = (
                    document.getElementById('businessJustification') as HTMLTextAreaElement
                  ).value
                  const risk = (document.getElementById('riskAssessment') as HTMLTextAreaElement)
                    .value
                  handleApprovalRequest(justification, risk)
                }}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
