'use client'

import { useState, useEffect } from 'react'
import supabase, { clientBusinessFunctions } from '../../lib/supabase-client'

interface MaintenanceFormData {
  unitId: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  estCost: string
  actualCost: string
}

interface MaintenanceTicket {
  id: string
  unit_id: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  est_cost_kes: number | null
  actual_cost_kes: number | null
  created_by_user_id: string | null
  assigned_to_user_id: string | null
  created_at: string
  updated_at: string
}

interface MaintenanceFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  isOpen: boolean
  ticket?: MaintenanceTicket | null
}

interface UnitOption {
  id: string
  unit_label: string
  properties: {
    name: string
  }
}

export default function MaintenanceForm({
  onSuccess,
  onCancel,
  isOpen,
  ticket,
}: MaintenanceFormProps) {
  const [formData, setFormData] = useState<MaintenanceFormData>({
    unitId: '',
    description: '',
    priority: 'MEDIUM',
    status: 'OPEN',
    estCost: '',
    actualCost: '',
  })
  const [units, setUnits] = useState<UnitOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadUnits()
      if (ticket) {
        // Editing existing ticket
        setFormData({
          unitId: ticket.unit_id,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status,
          estCost: ticket.est_cost_kes?.toString() || '',
          actualCost: ticket.actual_cost_kes?.toString() || '',
        })
      } else {
        // Creating new ticket
        setFormData({
          unitId: '',
          description: '',
          priority: 'MEDIUM',
          status: 'OPEN',
          estCost: '',
          actualCost: '',
        })
      }
    }
  }, [isOpen, ticket])

  const loadUnits = async () => {
    try {
      setLoadingUnits(true)
      setError(null)

      // 1) Get landlord IDs for the current authenticated user
      const { data: landlordIds, error: landlordError } =
        await clientBusinessFunctions.getUserLandlordIds()
      if (landlordError) {
        console.error('Error determining user access (landlord IDs):', landlordError)
        setUnits([])
        setError(
          typeof landlordError === 'string'
            ? landlordError
            : 'Unable to determine your property access. Please sign in again.'
        )
        return
      }

      if (!landlordIds || landlordIds.length === 0) {
        // No access means no properties/units to show
        setUnits([])
        setError(
          'You have no accessible properties. Please contact the administrator to gain access.'
        )
        return
      }

      // 2) Get properties owned by any of these landlord IDs
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name, landlord_id')
        .in('landlord_id', landlordIds)

      if (propertiesError) {
                setUnits([])
        setError('Failed to load properties. Please try again later.')
        return
      }

      if (!properties || properties.length === 0) {
        // No properties means no units to show
        setUnits([])
        setError('No properties found for your account.')
        return
      }

      const propertyIds = properties.map((p: any) => p.id)

      // 3) Get active units for those properties and include property name
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(
          `
          id,
          unit_label,
          property_id,
          properties (
            name
          )
        `
        )
        .in('property_id', propertyIds)
        .eq('is_active', true)
        .order('unit_label', { ascending: true })

      if (unitsError) {
                setUnits([])
        setError('Failed to load units. Please try again later.')
        return
      }

      // Transform and sort by property name then unit label
      const transformedUnits = (unitsData || [])
        .map((unit: any) => ({
          id: unit.id,
          unit_label: unit.unit_label,
          properties: {
            name: unit.properties?.name || 'Unknown Property',
          },
        }))
        .sort((a: UnitOption, b: UnitOption) => {
          const byProperty = a.properties.name.localeCompare(b.properties.name)
          return byProperty !== 0 ? byProperty : a.unit_label.localeCompare(b.unit_label)
        })

      setUnits(transformedUnits)
    } catch (err) {
            setUnits([])
      setError('An unexpected error occurred while loading units.')
    } finally {
      setLoadingUnits(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.unitId) {
      return 'Please select a unit'
    }
    if (!formData.description.trim()) {
      return 'Please enter a description'
    }
    if (formData.estCost && parseFloat(formData.estCost) < 0) {
      return 'Estimated cost cannot be negative'
    }
    if (formData.actualCost && parseFloat(formData.actualCost) < 0) {
      return 'Actual cost cannot be negative'
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
      const ticketData = {
        unit_id: formData.unitId,
        description: formData.description.trim(),
        priority: formData.priority,
        status: formData.status,
        est_cost_kes: formData.estCost ? parseFloat(formData.estCost) : null,
        actual_cost_kes: formData.actualCost ? parseFloat(formData.actualCost) : null,
        updated_at: new Date().toISOString(),
      }

      if (ticket) {
        // Update existing ticket
        const { error: updateError } = await supabase
          .from('maintenance_tickets')
          .update(ticketData)
          .eq('id', ticket.id)

        if (updateError) {
          setError('Failed to update maintenance ticket')
          return
        }
      } else {
        // Create new ticket
        const { error: insertError } = await supabase.from('maintenance_tickets').insert({
          ...ticketData,
          created_by_user_id: null, // TODO: Set to current user ID when auth is implemented
        })

        if (insertError) {
          setError('Failed to create maintenance ticket')
          return
        }
      }

      onSuccess?.()
    } catch (err) {
      setError('Failed to save maintenance ticket. Please try again.')
          } finally {
      setLoading(false)
    }
  }

  const selectedUnit = units.find((u) => u.id === formData.unitId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {ticket ? 'Update Maintenance Ticket' : 'Create Maintenance Ticket'}
            </h3>
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

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="unitId" className="block text-sm font-medium text-gray-700">
                Unit *
              </label>
              <select
                id="unitId"
                name="unitId"
                value={formData.unitId}
                onChange={handleChange}
                required
                disabled={loadingUnits}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select a unit...</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.properties.name} - {unit.unit_label}
                  </option>
                ))}
              </select>
              {loadingUnits && <p className="mt-1 text-sm text-gray-500">Loading units...</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the maintenance issue or request..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority *
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="estCost" className="block text-sm font-medium text-gray-700">
                  Estimated Cost (KES)
                </label>
                <input
                  type="number"
                  id="estCost"
                  name="estCost"
                  value={formData.estCost}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="5000"
                />
              </div>

              <div>
                <label htmlFor="actualCost" className="block text-sm font-medium text-gray-700">
                  Actual Cost (KES)
                </label>
                <input
                  type="number"
                  id="actualCost"
                  name="actualCost"
                  value={formData.actualCost}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="4500"
                />
              </div>
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : ticket ? 'Update Ticket' : 'Create Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
