'use client'

import { useEffect, useMemo, useState } from 'react'
import supabase, { clientBusinessFunctions } from '../../lib/supabase-client'
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormValues } from '../../lib/validation/payment'
import { Button, TextField, Select, Combobox } from '../ui'

interface PaymentFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  isOpen: boolean
  preselectedTenantId?: string
}

interface TenantOption {
  id: string
  full_name: string
  units: { unit_label: string; properties: { name: string }[] }[]
  balance?: number
}

export default function PaymentForm({ onSuccess, onCancel, isOpen, preselectedTenantId }: PaymentFormProps) {
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(false)
  const { register, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as unknown as Resolver<PaymentFormValues>,
    defaultValues: {
      tenantId: preselectedTenantId || '',
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'MPESA',
      txRef: '',
      notes: ''
    }
  })

  useEffect(() => {
    if (isOpen) {
      loadTenants()
      if (preselectedTenantId) setValue('tenantId', preselectedTenantId)
    }
  }, [isOpen, preselectedTenantId, setValue])

  const loadTenants = async () => {
    try {
      setLoadingTenants(true)
      
      // Get all active tenants with their units and properties
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id,
          full_name,
          status,
          units (
            unit_label,
            properties (
              name
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .order('full_name')

      if (tenantsError) {
        console.error('Error loading tenants:', tenantsError)
        return
      }

      // Load balances for each tenant
      const tenantsWithBalances = await Promise.all(
        (tenantsData || []).map(async (tenant: any) => {
          const { data: balance } = await clientBusinessFunctions.getTenantBalance(tenant.id)
          return {
            ...tenant,
            balance: balance || 0
          }
        })
      )

      setTenants(tenantsWithBalances)
    } catch (err) {
      console.error('Error loading tenants:', err)
    } finally {
      setLoadingTenants(false)
    }
  }

  const tenantOptions = useMemo(() => tenants.map(t => ({ value: t.id, label: `${t.full_name} - ${t.units?.[0]?.properties?.[0]?.name || ''} ${t.units?.[0]?.unit_label || ''}${t.balance !== undefined ? ` (Balance: ${formatCurrency(t.balance)})` : ''}` })), [tenants])


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount)
  }

  const onSubmit: SubmitHandler<PaymentFormValues> = async (values) => {
    try {
      const { data, error } = await clientBusinessFunctions.applyPayment(
        values.tenantId,
        Number(values.amount),
        values.paymentDate,
        values.method,
        values.txRef || undefined
      )
      if (error) { alert(error); return }
      reset({ tenantId: preselectedTenantId || '', amount: '' as unknown as number, paymentDate: new Date().toISOString().split('T')[0], method: 'MPESA', txRef: '', notes: '' })
      onSuccess?.()
    } catch (err) {
      console.error('Payment recording error:', err)
      alert('Failed to record payment. Please try again.')
    }
  }

  const selectedTenant = tenants.find(t => t.id === watch('tenantId'))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Top-level form errors can be displayed via toast or summary if needed */}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tenant *</label>
              <Combobox
                options={tenantOptions}
                value={tenantOptions.find(o => o.value === watch('tenantId')) || null}
                onChange={(opt) => setValue('tenantId', opt?.value || '')}
                placeholder={loadingTenants ? 'Loading tenants…' : 'Select a tenant…'}
              />
              {errors.tenantId?.message && <p className="mt-1 text-xs text-red-600">{errors.tenantId.message}</p>}
              {loadingTenants && (
                <p className="mt-1 text-sm text-gray-500">Loading tenants...</p>
              )}
            </div>

            {selectedTenant && selectedTenant.balance !== undefined && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Current balance: <span className={`font-medium ${selectedTenant.balance > 0 ? 'text-red-600' : selectedTenant.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatCurrency(selectedTenant.balance)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <TextField label="Amount (KES) *" type="number" step="any" placeholder="25000" error={errors.amount?.message} {...register('amount', { valueAsNumber: true })} />
            </div>

            <div>
              <TextField label="Payment Date *" type="date" error={errors.paymentDate?.message} {...register('paymentDate')} />
            </div>

            <div>
              <Select label="Payment Method *" error={errors.method?.message} {...register('method')} options={[
                { value: 'MPESA', label: 'M-Pesa' },
                { value: 'CASH', label: 'Cash' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'OTHER', label: 'Other' },
              ]} />
            </div>

            <div>
              <TextField label="Transaction Reference" placeholder="QA12345678" error={errors.txRef?.message} {...register('txRef')} />
            </div>

            <div>
              <TextField label="Notes" placeholder="Additional notes about this payment..." error={errors.notes?.message} {...register('notes')} />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Recording…' : 'Record Payment'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
