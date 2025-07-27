'use client'

import { useState, useEffect } from 'react'
import { supabase, clientBusinessFunctions, handleSupabaseError } from '../../lib/supabase-client'

interface PaymentFormData {
  tenantId: string
  amount: string
  paymentDate: string
  method: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
  txRef: string
  notes: string
}

interface PaymentFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  isOpen: boolean
  preselectedTenantId?: string
}

interface TenantOption {
  id: string
  full_name: string
  units: {
    unit_label: string
    properties: {
      name: string
    }[]
  }[]
  balance?: number
}

export default function PaymentForm({ onSuccess, onCancel, isOpen, preselectedTenantId }: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    tenantId: preselectedTenantId || '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'MPESA',
    txRef: '',
    notes: ''
  })
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadTenants()
      if (preselectedTenantId) {
        setFormData(prev => ({ ...prev, tenantId: preselectedTenantId }))
      }
    }
  }, [isOpen, preselectedTenantId])

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
        (tenantsData || []).map(async (tenant) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.tenantId) {
      return 'Please select a tenant'
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid payment amount'
    }
    if (!formData.paymentDate) {
      return 'Please select a payment date'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await clientBusinessFunctions.applyPayment(
        formData.tenantId,
        parseFloat(formData.amount),
        formData.paymentDate,
        formData.method,
        formData.txRef || undefined
      )

      if (error) {
        setError(error)
        return
      }

      // Reset form
      setFormData({
        tenantId: preselectedTenantId || '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'MPESA',
        txRef: '',
        notes: ''
      })

      onSuccess?.()
    } catch (err) {
      setError('Failed to record payment. Please try again.')
      console.error('Payment recording error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const selectedTenant = tenants.find(t => t.id === formData.tenantId)

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

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
                Tenant *
              </label>
              <select
                id="tenantId"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleChange}
                required
                disabled={loadingTenants || !!preselectedTenantId}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select a tenant...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name} - {tenant.units?.[0]?.properties?.[0]?.name} {tenant.units?.[0]?.unit_label}
                    {tenant.balance !== undefined && ` (Balance: ${formatCurrency(tenant.balance)})`}
                  </option>
                ))}
              </select>
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
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (KES) *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="25000"
              />
            </div>

            <div>
              <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">
                Payment Date *
              </label>
              <input
                type="date"
                id="paymentDate"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="method" className="block text-sm font-medium text-gray-700">
                Payment Method *
              </label>
              <select
                id="method"
                name="method"
                value={formData.method}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MPESA">M-Pesa</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="txRef" className="block text-sm font-medium text-gray-700">
                Transaction Reference
              </label>
              <input
                type="text"
                id="txRef"
                name="txRef"
                value={formData.txRef}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="QA12345678"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about this payment..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
