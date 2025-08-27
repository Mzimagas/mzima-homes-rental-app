'use client'

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase-client'
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormValues } from '../../lib/validation/payment'
import { PaymentService, PaymentResult } from '../../lib/services/payment-service'
import { getPaymentMethodOptions } from '../../lib/config/payment-methods'
import { Button, TextField, Select } from '../ui'
import { ErrorMessage } from '../ui/error'

interface PaymentFormProps {
  onSuccess?: (paymentId?: string) => void
  onCancel?: () => void
  isOpen: boolean
  preselectedTenantId?: string
}

export default function PaymentForm({
  onSuccess,
  onCancel,
  isOpen,
  preselectedTenantId,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as unknown as Resolver<PaymentFormValues>,
    defaultValues: {
      tenantId: preselectedTenantId || '',
      unitId: undefined as any,
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'MPESA',
      txRef: '',
      notes: '',
    },
  })

  const watchedMethod = watch('method')
  const watchedAmount = watch('amount')
  const methodInfo = PaymentService.getPaymentMethodInfo(watchedMethod)
  const processingFee = methodInfo
    ? PaymentService.calculateProcessingFee(watchedMethod, watchedAmount || 0)
    : 0
  const totalAmount = (watchedAmount || 0) + processingFee

  useEffect(() => {
    if (isOpen) {
      // Load properties and units when modal opens
      loadProperties()
      loadUnits()
    }
  }, [isOpen])

  const loadProperties = async () => {
    try {
      // Load accessible properties via RPC (supports simple and extended variants)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_properties_simple')
      if (rpcError) {
        console.error('Error loading properties (RPC):', rpcError)
      }

      const items: any[] = Array.isArray(rpcData) ? (rpcData as any[]) : []
      const ids: string[] = []
      const nameMap = new Map<string, string>()

      // Normalize IDs and pick up names when available in the RPC result
      for (const it of items) {
        const id: string | undefined = typeof it === 'string' ? it : it?.property_id || it?.id
        if (!id) continue
        ids.push(id)
        const nm = (it?.property_name || it?.name || '').toString().trim()
        if (nm) nameMap.set(id, nm)
      }

      // Deduplicate IDs while preserving order
      const uniqueIds = Array.from(new Set(ids))

      // If some IDs don't yet have names, fetch from properties table
      if (uniqueIds.length > 0 && nameMap.size < uniqueIds.length) {
        const { data: propsRows, error: propsErr2 } = await supabase
          .from('properties')
          .select('id, name')
          .in('id', uniqueIds)
        if (propsErr2) {
          console.warn('Could not fetch property names from table:', propsErr2)
        } else if (Array.isArray(propsRows)) {
          propsRows.forEach((row: any) => {
            if (row?.id && row?.name && !nameMap.has(row.id)) {
              nameMap.set(row.id, String(row.name))
            }
          })
        }
      }

      const mapped = uniqueIds.map((id) => ({
        id,
        name: nameMap.get(id) || (id ? `Property ${String(id).slice(0, 8)}` : 'Unnamed Property'),
      }))

      setProperties(mapped)
      if (mapped.length === 1) setSelectedPropertyId(mapped[0].id)
    } catch (e) {
      console.error('Failed to load properties', e)
      setProperties([])
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Units for dual selection: load all units with occupancy info
  const [units, setUnits] = useState<
    Array<{
      id: string
      label: string
      propertyId: string
      currentTenantId?: string
      currentTenantName?: string
    }>
  >([])
  const loadUnits = async (propertyScope?: string) => {
    try {
      let propIdList: string[] = []
      if (propertyScope) {
        propIdList = [propertyScope]
      } else {
        // Scope by accessible properties via RPC (to satisfy RLS)
        const { data: propertyIds, error: propsErr } = await supabase.rpc(
          'get_user_properties_simple'
        )
        if (propsErr) {
          console.error('Error loading properties for units:', propsErr?.message || propsErr)
        }
        propIdList = Array.isArray(propertyIds)
          ? (propertyIds as any[])
              .map((p: any) => (typeof p === 'string' ? p : p?.property_id))
              .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
          : []
      }

      if ((propIdList || []).length === 0) {
        setUnits([])
        return
      }

      // Fetch units within selected or accessible properties
      const { data: unitRows, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_label, property_id')
        .in('property_id', propIdList)
        .eq('is_active', true)
        .order('unit_label')

      if (unitsError) {
        console.error('Error loading units:', unitsError?.message || unitsError)
        setUnits([])
        return
      }

      const unitIds = (unitRows || []).map((u: any) => u.id)
      if (unitIds.length === 0) {
        setUnits([])
        return
      }

      // Fetch current tenant assignments for these units
      const { data: occupantRows, error: occupantsError } = await supabase
        .from('tenants')
        .select('id, full_name, current_unit_id')
        .in('current_unit_id', unitIds)

      if (occupantsError) {
        console.error('Error loading unit occupants:', occupantsError?.message || occupantsError)
      }

      const occupantMap = new Map<string, { id: string; full_name: string }>()
      ;(occupantRows || []).forEach((t: any) => {
        if (t.current_unit_id)
          occupantMap.set(t.current_unit_id, { id: t.id, full_name: t.full_name })
      })

      const mapped = (unitRows || []).map((u: any) => {
        const occ = occupantMap.get(u.id)
        return {
          id: u.id,
          label: `${u.unit_label}`,
          propertyId: u.property_id,
          currentTenantId: occ?.id,
          currentTenantName: occ?.full_name,
        }
      })

      setUnits(mapped)
    } catch (e) {
      console.error('Failed to load units', e)
      setUnits([])
    }
  }

  useEffect(() => {
    if (isOpen) {
      // Clear unit and tenant when property filter changes
      setValue('unitId', '' as any)
      setValue('tenantId', '' as any)
      if (selectedPropertyId) {
        loadUnits(selectedPropertyId)
      } else {
        loadUnits()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedPropertyId])

  const onSubmit: SubmitHandler<PaymentFormValues> = async (values) => {
    setLoading(true)
    setPaymentResult(null)

    try {
      const result = await PaymentService.processPayment(values)
      setPaymentResult(result)

      if (result.success) {
        setShowConfirmation(true)
        reset({
          tenantId: '',
          unitId: undefined as any,
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          method: 'MPESA',
          txRef: '',
          notes: '',
        })
        // Call onSuccess with payment ID for potential confirmation display
        onSuccess?.(result.paymentId)
      }
    } catch (err) {
      console.error('Payment processing error:', err)
      setPaymentResult({
        success: false,
        error: 'An unexpected error occurred while processing the payment',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseConfirmation = () => {
    setShowConfirmation(false)
    setPaymentResult(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Top-level form errors can be displayed via toast or summary if needed */}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4">
              {/* Property filter and unit selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Property</label>
                <Select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  options={[
                    { value: '', label: 'All accessible properties' },
                    ...properties.map((p) => {
                      const label =
                        p.name && p.name.trim().length > 0
                          ? p.name
                          : p.id
                            ? `Property ${String(p.id).slice(0, 8)}`
                            : 'Unnamed Property'
                      return { value: p.id, label }
                    }),
                  ]}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Unit *</label>
                </div>
                <Select
                  value={(watch('unitId') as string) || ''}
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value
                    setValue('unitId', (val || '') as any)
                    const u = units.find((uu) => uu.id === val)
                    if (u?.currentTenantId) {
                      setValue('tenantId', u.currentTenantId)
                    } else {
                      setValue('tenantId', '' as any)
                    }
                  }}
                  required
                  options={[
                    { value: '', label: 'Select a unit…' },
                    ...units
                      .filter((u) => !!u.currentTenantId)
                      .map((u) => ({
                        value: u.id,
                        label:
                          u.label +
                          (u.currentTenantName ? ` (Tenant: ${u.currentTenantName})` : ''),
                      })),
                  ]}
                />
                {errors.unitId?.message && (
                  <p className="mt-1 text-xs text-red-600">{(errors as any).unitId?.message}</p>
                )}
              </div>
            </div>

            {/* Payment Result Display */}
            {paymentResult && !paymentResult.success && (
              <div className="mb-4">
                <ErrorMessage
                  title="Payment Failed"
                  message={paymentResult.error || 'Unknown error occurred'}
                />
                {paymentResult.validationErrors && paymentResult.validationErrors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    <ul className="list-disc list-inside">
                      {paymentResult.validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div>
              <TextField
                label="Amount (KES)"
                type="number"
                step="0.01"
                placeholder="25000"
                error={errors.amount?.message}
                required
                {...register('amount', { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter amount between 1 and 10,000,000 KES
              </p>
            </div>

            <div>
              <TextField
                label="Payment Date"
                type="date"
                error={errors.paymentDate?.message}
                required
                {...register('paymentDate')}
              />
              <p className="mt-1 text-xs text-gray-500">
                Date must be within the last year and not more than a week in the future
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Payment Method"
                  error={errors.method?.message}
                  required
                  {...register('method')}
                  options={getPaymentMethodOptions()}
                />
                {methodInfo?.instructions && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                      Payment Instructions
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <ol className="text-xs text-gray-700 space-y-1">
                        {methodInfo.instructions.map((instruction, index) => (
                          <li key={index} className="flex">
                            <span className="font-medium mr-2">{index + 1}.</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </details>
                )}
              </div>
              <div>
                <TextField
                  label={`${methodInfo?.txRefLabel || 'Transaction Reference'}${methodInfo?.requiresTxRef ? ' *' : ''}`}
                  placeholder={methodInfo?.txRefPlaceholder || 'Optional reference'}
                  error={errors.txRef?.message}
                  {...register('txRef')}
                />
                {methodInfo?.requiresTxRef && (
                  <p className="mt-1 text-xs text-red-500">Code required</p>
                )}
              </div>
            </div>

            <div>
              <TextField
                label="Notes"
                placeholder="Additional notes about this payment..."
                error={errors.notes?.message}
                {...register('notes')}
              />
            </div>

            {/* Payment Summary */}
            {watchedAmount > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Amount:</span>
                    <span className="font-medium">{watchedAmount.toLocaleString()} KES</span>
                  </div>
                  {processingFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Processing Fee:</span>
                      <span className="font-medium">{processingFee.toLocaleString()} KES</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-gray-900">Total Amount:</span>
                    <span className="text-green-600">{totalAmount.toLocaleString()} KES</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || isSubmitting}>
                {loading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  'Record Payment'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Payment Success Confirmation Modal */}
      {showConfirmation && paymentResult?.success && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Payment Recorded Successfully!
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Payment has been processed and allocated to outstanding invoices.
                </p>
                {paymentResult.paymentId && (
                  <p className="text-xs text-gray-400 mt-2">
                    Payment ID: {paymentResult.paymentId}
                  </p>
                )}
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleCloseConfirmation}
                  className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
