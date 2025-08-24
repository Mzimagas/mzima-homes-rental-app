'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import supabase from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../ui/loading'
import { ErrorCard, EmptyState } from '../../ui/error'
import MaintenanceForm from '../../maintenance/maintenance-form'
import MaintenanceList from '../../maintenance/maintenance-list'
import MaintenanceStats from '../../maintenance/maintenance-stats'

interface MaintenanceManagementProps {
  onDataChange?: () => void
  propertyId?: string // Optional property ID for filtering
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
  units: {
    unit_label: string
    properties: {
      name: string
    }
  }
}

interface MaintenanceStatsData {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  completedTickets: number
  totalEstimatedCost: number
  totalActualCost: number
  averageResolutionTime: number
}

export default function MaintenanceManagement({ onDataChange, propertyId }: MaintenanceManagementProps) {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [stats, setStats] = useState<MaintenanceStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  useEffect(() => {
    loadMaintenanceData()
  }, [propertyId])

  const loadMaintenanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      // Get maintenance tickets
      let query = supabase
        .from('maintenance_tickets')
        .select(`
          *,
          units!inner (
            unit_label,
            properties!inner (
              name,
              landlord_id
            )
          )
        `)
        .eq('units.properties.landlord_id', mockLandlordId as any)

      // Filter by property if propertyId is provided
      if (propertyId) {
        query = query.eq('units.properties.id', propertyId)
      }

      const { data: ticketsData, error: ticketsError } = await query
        .order('created_at', { ascending: false })

      if (ticketsError) {
        setError('Failed to load maintenance tickets')
        return
      }

      setTickets((ticketsData as unknown as MaintenanceTicket[]) || [])

      // Calculate stats
      const ticketsArray = (ticketsData as unknown as MaintenanceTicket[]) || []
      const totalTickets = ticketsArray.length || 0
      const openTickets = ticketsArray.filter(t => t.status === 'OPEN').length || 0
      const inProgressTickets = ticketsArray.filter(t => t.status === 'IN_PROGRESS').length || 0
      const completedTickets = ticketsArray.filter(t => t.status === 'COMPLETED').length || 0
      
      const totalEstimatedCost = ticketsArray.reduce((sum, t) => sum + (t.est_cost_kes || 0), 0) || 0
      const totalActualCost = ticketsArray.reduce((sum, t) => sum + (t.actual_cost_kes || 0), 0) || 0

      // Calculate average resolution time (simplified)
      const completedWithDates = ticketsArray.filter(t =>
        t.status === 'COMPLETED' && t.created_at && t.updated_at
      ) || []
      
      let averageResolutionTime = 0
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, t) => {
          const created = new Date(t.created_at)
          const completed = new Date(t.updated_at)
          const days = Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0)
        averageResolutionTime = Math.floor(totalDays / completedWithDates.length)
      }

      setStats({
        totalTickets,
        openTickets,
        inProgressTickets,
        completedTickets,
        totalEstimatedCost,
        totalActualCost,
        averageResolutionTime
      })

      // Call onDataChange if provided
      if (onDataChange) {
        onDataChange()
      }

    } catch (err) {
      setError('Failed to load maintenance data')
      console.error('Maintenance data loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTicketCreated = () => {
    setShowForm(false)
    loadMaintenanceData() // Reload data
  }

  const handleTicketUpdated = () => {
    setSelectedTicket(null)
    loadMaintenanceData() // Reload data
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority
    return matchesStatus && matchesPriority
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Maintenance Management</h2>
            <p className="text-sm text-gray-500">Track and manage maintenance requests and work orders</p>
          </div>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading maintenance data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Maintenance Management</h2>
            <p className="text-sm text-gray-500">Track and manage maintenance requests and work orders</p>
          </div>
        </div>
        <ErrorCard 
          title="Failed to load maintenance data" 
          message={error} 
          onRetry={loadMaintenanceData}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Maintenance Management</h2>
          <p className="text-sm text-gray-500">
            Track and manage maintenance requests and work orders
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Ticket
        </button>
      </div>

      {/* Stats */}
      {stats && <MaintenanceStats stats={stats} />}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Tickets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Maintenance Tickets ({filteredTickets.length})
          </h3>
        </div>

        {filteredTickets.length === 0 ? (
          <EmptyState
            title="No maintenance tickets found"
            description="No tickets match your current filters."
            actionLabel="Create Ticket"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <MaintenanceList 
            tickets={filteredTickets}
            onTicketSelect={setSelectedTicket}
            onTicketUpdate={handleTicketUpdated}
          />
        )}
      </div>

      {/* Maintenance Form Modal */}
      <MaintenanceForm
        isOpen={showForm}
        ticket={selectedTicket}
        onSuccess={handleTicketCreated}
        onCancel={() => {
          setShowForm(false)
          setSelectedTicket(null)
        }}
      />
    </div>
  )
}
