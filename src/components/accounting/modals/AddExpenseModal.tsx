'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { ExpenseManagementService } from '../../../lib/services/expense-management.service'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Property {
  id: string
  name: string
}

interface Vendor {
  id: string
  vendor_name: string
}

interface ExpenseCategory {
  id: string
  display_name: string
  category_name: string
  subcategory: string
  is_allocatable: boolean
  default_allocation_method: string
}

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  const [formData, setFormData] = useState({
    category_id: '',
    vendor_id: '',
    property_id: '',
    amount_kes: '',
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: '',
    reference_number: '',
    invoice_number: '',
    receipt_number: '',
    is_allocated: false,
    allocation_method: 'EQUAL_SPLIT',
    notes: '',
  })

  useEffect(() => {
    if (isOpen) {
      loadFormData()
    }
  }, [isOpen])

  const loadFormData = async () => {
    try {
      const [categoriesData, propertiesData, vendorsData] = await Promise.allSettled([
        ExpenseManagementService.getExpenseCategories(),
        ExpenseManagementService.getProperties(),
        ExpenseManagementService.getVendors(),
      ])

      if (categoriesData.status === 'fulfilled') {
        setCategories(categoriesData.value)
      }
      if (propertiesData.status === 'fulfilled') {
        setProperties(propertiesData.value)
      }
      if (vendorsData.status === 'fulfilled') {
        setVendors(vendorsData.value)
      }
    } catch (error) {
      console.error('Error loading form data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const expenseData = {
        ...formData,
        amount_kes: parseFloat(formData.amount_kes),
        vendor_id: formData.vendor_id || null,
        property_id: formData.property_id || null,
        due_date: formData.due_date || null,
      }

      await ExpenseManagementService.createExpenseTransaction(expenseData)

      // Reset form
      setFormData({
        category_id: '',
        vendor_id: '',
        property_id: '',
        amount_kes: '',
        transaction_date: new Date().toISOString().split('T')[0],
        due_date: '',
        description: '',
        reference_number: '',
        invoice_number: '',
        receipt_number: '',
        is_allocated: false,
        allocation_method: 'EQUAL_SPLIT',
        notes: '',
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating expense transaction:', error)
      alert('Failed to create expense transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    setFormData((prev) => ({
      ...prev,
      category_id: categoryId,
      is_allocated: category?.is_allocatable || false,
      allocation_method: category?.default_allocation_method || 'EQUAL_SPLIT',
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <CreditCardIcon className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Add Expense Transaction</h2>
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
              Expense Category *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter expense description"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Vendor and Property */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, vendor_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, property_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reference_number: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="REF-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, invoice_number: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="INV-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
              <input
                type="text"
                value={formData.receipt_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receipt_number: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="RCP-001"
              />
            </div>
          </div>

          {/* Allocation Settings */}
          {formData.is_allocated && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allocation Method
              </label>
              <select
                value={formData.allocation_method}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, allocation_method: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="EQUAL_SPLIT">Equal Split</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="SQUARE_FOOTAGE">Square Footage</option>
                <option value="RENTAL_VALUE">Rental Value</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
