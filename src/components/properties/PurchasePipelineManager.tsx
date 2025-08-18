'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase from '../../lib/supabase-client'
import { PropertyTypeEnum } from '../../lib/validation/property'
import { Button, TextField, FormField } from '../ui'
import Modal from '../ui/Modal'

// Purchase pipeline schema
const purchasePipelineSchema = z.object({
  propertyName: z.string().min(1, 'Property name is required'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  propertyType: PropertyTypeEnum.default('HOME'),
  sellerName: z.string().optional(),
  sellerContact: z.string().optional(),
  askingPrice: z.number().positive().optional(),
  negotiatedPrice: z.number().positive().optional(),
  depositPaid: z.number().min(0).optional(),
  targetCompletionDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  financingSource: z.string().optional(),
  inspectionNotes: z.string().optional(),
  dueDiligenceNotes: z.string().optional(),
  contractReference: z.string().optional(),
  valuationAmount: z.number().positive().optional(),
  loanAmount: z.number().min(0).optional(),
  cashAmount: z.number().min(0).optional(),
  closingCosts: z.number().min(0).optional(),
  expectedRentalIncome: z.number().positive().optional(),
  expectedRoi: z.number().min(0).max(100).optional(),
  riskAssessment: z.string().optional(),
  propertyConditionNotes: z.string().optional(),
  requiredImprovements: z.string().optional(),
  improvementCostEstimate: z.number().min(0).optional(),
})

type PurchasePipelineFormValues = z.infer<typeof purchasePipelineSchema>

interface PurchaseItem {
  id: string
  property_name: string
  property_address: string
  property_type: string
  seller_name?: string
  asking_price_kes?: number
  negotiated_price_kes?: number
  purchase_status: string
  target_completion_date?: string
  expected_rental_income_kes?: number
  expected_roi_percentage?: number
  created_at: string
  updated_at: string
}

interface PurchasePipelineManagerProps {
  onPropertyTransferred?: (propertyId: string) => void
}

export default function PurchasePipelineManager({ onPropertyTransferred }: PurchasePipelineManagerProps) {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null)
  const [transferringId, setTransferringId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PurchasePipelineFormValues>({
    resolver: zodResolver(purchasePipelineSchema)
  })

  useEffect(() => {
    loadPurchases()
  }, [])

  const loadPurchases = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('purchase_pipeline')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Error loading purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: PurchasePipelineFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to manage purchases')
        return
      }

      const purchaseData = {
        property_name: values.propertyName,
        property_address: values.propertyAddress,
        property_type: values.propertyType,
        seller_name: values.sellerName || null,
        seller_contact: values.sellerContact || null,
        asking_price_kes: values.askingPrice || null,
        negotiated_price_kes: values.negotiatedPrice || null,
        deposit_paid_kes: values.depositPaid || null,
        target_completion_date: values.targetCompletionDate || null,
        legal_representative: values.legalRepresentative || null,
        financing_source: values.financingSource || null,
        inspection_notes: values.inspectionNotes || null,
        due_diligence_notes: values.dueDiligenceNotes || null,
        contract_reference: values.contractReference || null,
        valuation_amount_kes: values.valuationAmount || null,
        loan_amount_kes: values.loanAmount || null,
        cash_amount_kes: values.cashAmount || null,
        closing_costs_kes: values.closingCosts || null,
        expected_rental_income_kes: values.expectedRentalIncome || null,
        expected_roi_percentage: values.expectedRoi || null,
        risk_assessment: values.riskAssessment || null,
        property_condition_notes: values.propertyConditionNotes || null,
        required_improvements: values.requiredImprovements || null,
        improvement_cost_estimate_kes: values.improvementCostEstimate || null,
        created_by: user.id,
        assigned_to: user.id,
      }

      if (editingPurchase) {
        const { error } = await supabase
          .from('purchase_pipeline')
          .update(purchaseData)
          .eq('id', editingPurchase.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('purchase_pipeline')
          .insert([purchaseData])

        if (error) throw error
      }

      reset()
      setShowForm(false)
      setEditingPurchase(null)
      loadPurchases()
    } catch (error) {
      console.error('Error saving purchase:', error)
      alert('Failed to save purchase')
    }
  }

  const updatePurchaseStatus = async (purchaseId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('purchase_pipeline')
        .update({ 
          purchase_status: status,
          actual_completion_date: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', purchaseId)

      if (error) throw error
      loadPurchases()
    } catch (error) {
      console.error('Error updating purchase status:', error)
      alert('Failed to update purchase status')
    }
  }

  const transferToProperties = async (purchase: PurchaseItem) => {
    try {
      setTransferringId(purchase.id)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to transfer properties')
        return
      }

      // Create property from purchase
      const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
        property_name: purchase.property_name,
        property_address: purchase.property_address,
        property_type: purchase.property_type,
        owner_user_id: user.id
      })

      if (createError) throw createError

      // Update property with purchase details and lifecycle tracking
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          property_source: 'PURCHASE_PIPELINE',
          source_reference_id: purchase.id,
          lifecycle_status: 'PURCHASED',
          purchase_completion_date: new Date().toISOString().split('T')[0],
          sale_price_kes: purchase.negotiated_price_kes || purchase.asking_price_kes,
          expected_rental_income_kes: purchase.expected_rental_income_kes,
          acquisition_notes: `Transferred from purchase pipeline. Original asking price: ${purchase.asking_price_kes ? `KES ${purchase.asking_price_kes.toLocaleString()}` : 'N/A'}`
        })
        .eq('id', propertyId)

      if (updateError) throw updateError

      // Update purchase pipeline record
      const { error: pipelineError } = await supabase
        .from('purchase_pipeline')
        .update({
          purchase_status: 'COMPLETED',
          actual_completion_date: new Date().toISOString().split('T')[0],
          completed_property_id: propertyId
        })
        .eq('id', purchase.id)

      if (pipelineError) throw pipelineError

      alert('Property successfully transferred to properties management!')
      loadPurchases()
      onPropertyTransferred?.(propertyId)
    } catch (error) {
      console.error('Error transferring property:', error)
      alert('Failed to transfer property')
    } finally {
      setTransferringId(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'IDENTIFIED': 'bg-gray-100 text-gray-800',
      'NEGOTIATING': 'bg-yellow-100 text-yellow-800',
      'UNDER_CONTRACT': 'bg-blue-100 text-blue-800',
      'DUE_DILIGENCE': 'bg-purple-100 text-purple-800',
      'FINANCING': 'bg-orange-100 text-orange-800',
      'CLOSING': 'bg-indigo-100 text-indigo-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const statusOptions = [
    'IDENTIFIED', 'NEGOTIATING', 'UNDER_CONTRACT', 'DUE_DILIGENCE', 
    'FINANCING', 'CLOSING', 'COMPLETED', 'CANCELLED'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Pipeline</h2>
          <p className="text-gray-600">Track properties being acquired through purchase process</p>
        </div>
        <Button
          onClick={() => {
            setEditingPurchase(null)
            reset()
            setShowForm(true)
          }}
          variant="primary"
        >
          Add Purchase Opportunity
        </Button>
      </div>

      {/* Purchase List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading purchases...</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Opportunities</h3>
          <p className="text-gray-600 mb-4">Start tracking properties you're considering for purchase.</p>
          <Button
            onClick={() => {
              setEditingPurchase(null)
              reset()
              setShowForm(true)
            }}
            variant="primary"
          >
            Add First Purchase
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{purchase.property_name}</h3>
                  <p className="text-gray-600">{purchase.property_address}</p>
                  {purchase.seller_name && (
                    <p className="text-sm text-gray-500">Seller: {purchase.seller_name}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(purchase.purchase_status)}`}>
                    {purchase.purchase_status.replace('_', ' ')}
                  </span>
                  <select
                    value={purchase.purchase_status}
                    onChange={(e) => updatePurchaseStatus(purchase.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {purchase.asking_price_kes && (
                  <div>
                    <p className="text-sm text-gray-500">Asking Price</p>
                    <p className="font-semibold">KES {purchase.asking_price_kes.toLocaleString()}</p>
                  </div>
                )}
                {purchase.negotiated_price_kes && (
                  <div>
                    <p className="text-sm text-gray-500">Negotiated Price</p>
                    <p className="font-semibold text-green-600">KES {purchase.negotiated_price_kes.toLocaleString()}</p>
                  </div>
                )}
                {purchase.expected_rental_income_kes && (
                  <div>
                    <p className="text-sm text-gray-500">Expected Monthly Rent</p>
                    <p className="font-semibold">KES {purchase.expected_rental_income_kes.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {purchase.target_completion_date && (
                    <span>Target: {new Date(purchase.target_completion_date).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingPurchase(purchase)
                      // Populate form with purchase data
                      reset({
                        propertyName: purchase.property_name,
                        propertyAddress: purchase.property_address,
                        propertyType: purchase.property_type as any,
                        sellerName: purchase.seller_name || '',
                        askingPrice: purchase.asking_price_kes || undefined,
                        negotiatedPrice: purchase.negotiated_price_kes || undefined,
                        targetCompletionDate: purchase.target_completion_date || '',
                        expectedRentalIncome: purchase.expected_rental_income_kes || undefined,
                        expectedRoi: purchase.expected_roi_percentage || undefined,
                      })
                      setShowForm(true)
                    }}
                  >
                    Edit
                  </Button>
                  {purchase.purchase_status === 'COMPLETED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => transferToProperties(purchase)}
                      disabled={transferringId === purchase.id}
                    >
                      {transferringId === purchase.id ? 'Transferring...' : 'Transfer to Properties'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingPurchase(null)
          reset()
        }}
        title={editingPurchase ? 'Edit Purchase' : 'Add Purchase Opportunity'}
        size="large"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Property Name" error={errors.propertyName?.message} required>
              <TextField
                {...register('propertyName')}
                placeholder="e.g., Riverside Apartments"
              />
            </FormField>

            <FormField label="Property Address" error={errors.propertyAddress?.message} required>
              <TextField
                {...register('propertyAddress')}
                placeholder="e.g., 123 Main Street, Nairobi"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Property Type" required>
              <select {...register('propertyType')} className="form-select">
                {PropertyTypeEnum.options.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Seller Name">
              <TextField
                {...register('sellerName')}
                placeholder="e.g., John Doe"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Asking Price (KES)" error={errors.askingPrice?.message}>
              <TextField
                {...register('askingPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="e.g., 5000000"
              />
            </FormField>

            <FormField label="Negotiated Price (KES)" error={errors.negotiatedPrice?.message}>
              <TextField
                {...register('negotiatedPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="e.g., 4500000"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Expected Monthly Rent (KES)" error={errors.expectedRentalIncome?.message}>
              <TextField
                {...register('expectedRentalIncome', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="e.g., 50000"
              />
            </FormField>

            <FormField label="Expected ROI (%)" error={errors.expectedRoi?.message}>
              <TextField
                {...register('expectedRoi', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g., 12.5"
              />
            </FormField>
          </div>

          <FormField label="Target Completion Date">
            <TextField
              {...register('targetCompletionDate')}
              type="date"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Legal Representative">
              <TextField
                {...register('legalRepresentative')}
                placeholder="e.g., ABC Law Firm"
              />
            </FormField>

            <FormField label="Financing Source">
              <TextField
                {...register('financingSource')}
                placeholder="e.g., Bank loan, Cash, Mixed"
              />
            </FormField>
          </div>

          <FormField label="Risk Assessment">
            <textarea
              {...register('riskAssessment')}
              rows={3}
              className="form-textarea"
              placeholder="Assess potential risks and mitigation strategies..."
            />
          </FormField>

          <FormField label="Property Condition Notes">
            <textarea
              {...register('propertyConditionNotes')}
              rows={2}
              className="form-textarea"
              placeholder="Current condition of the property..."
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false)
                setEditingPurchase(null)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingPurchase ? 'Update Purchase' : 'Add Purchase')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
