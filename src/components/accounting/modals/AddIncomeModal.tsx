'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { IncomeManagementService } from '../../../lib/services/income-management.service'

interface AddIncomeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Property {
  id: string
  name: string
}

interface Member {
  id: string
  full_name: string
  member_number: string
}

interface Tenant {
  id: string
  full_name: string
}

interface IncomeCategory {
  id: string
  display_name: string
  category_name: string
  subcategory: string
  is_recurring: boolean
  default_frequency: string
}

export default function AddIncomeModal({ isOpen, onClose, onSuccess }: AddIncomeModalProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])

  const [formData, setFormData] = useState({
    category_id: '',
    property_id: '',
    member_id: '',
    tenant_id: '',
    amount_kes: '',
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: '',
    reference_number: '',
    is_recurring: false,
    recurring_frequency: 'ONE_TIME',
    notes: '',
  })

  useEffect(() => {
    if (isOpen) {
      loadFormData()
    }
  }, [isOpen])

  const loadFormData = async () => {
    try {
      const [categoriesData, propertiesData, membersData, tenantsData] = await Promise.allSettled([
        IncomeManagementService.getIncomeCategories(),
        IncomeManagementService.getProperties(),
        IncomeManagementService.getMembers(),
        IncomeManagementService.getTenants(),
      ])

      if (categoriesData.status === 'fulfilled') {
        setCategories(categoriesData.value)
      }
      if (propertiesData.status === 'fulfilled') {
        setProperties(propertiesData.value)
      }
      if (membersData.status === 'fulfilled') {
        setMembers(membersData.value)
      }
      if (tenantsData.status === 'fulfilled') {
        setTenants(tenantsData.value)
      }
    } catch (error) {
      console.error('Error loading form data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const incomeData = {
        ...formData,
        amount_kes: parseFloat(formData.amount_kes),
        property_id: formData.property_id || null,
        member_id: formData.member_id || null,
        tenant_id: formData.tenant_id || null,
        due_date: formData.due_date || null,
      }

      await IncomeManagementService.createIncomeTransaction(incomeData)

      // Reset form
      setFormData({
        category_id: '',
        property_id: '',
        member_id: '',
        tenant_id: '',
        amount_kes: '',
        transaction_date: new Date().toISOString().split('T')[0],
        due_date: '',
        description: '',
        reference_number: '',
        is_recurring: false,
        recurring_frequency: 'ONE_TIME',
        notes: '',
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating income transaction:', error)
      alert('Failed to create income transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    setFormData((prev) => ({
      ...prev,
      category_id: categoryId,
      is_recurring: category?.is_recurring || false,
      recurring_frequency: category?.default_frequency || 'ONE_TIME',
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Add Income Transaction</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Income Category *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (KES) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount_kes}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount_kes: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0.00"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter transaction description"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Date *
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Related Entities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, property_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Member</label>
              <select
                value={formData.member_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, member_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.member_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
              <select
                value={formData.tenant_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, tenant_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reference_number: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter reference number"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
