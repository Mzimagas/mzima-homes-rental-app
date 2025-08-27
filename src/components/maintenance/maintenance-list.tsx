'use client'

import { useState } from 'react'

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

interface MaintenanceListProps {
  tickets: MaintenanceTicket[]
  onTicketSelect: (ticket: MaintenanceTicket) => void
  onTicketUpdate: () => void
}

export default function MaintenanceList({
  tickets,
  onTicketSelect,
  onTicketUpdate,
}: MaintenanceListProps) {
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800'
      case 'HIGH':
        return 'bg-yellow-100 text-yellow-800'
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800'
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return (
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )
      case 'MEDIUM':
        return (
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        )
      case 'HIGH':
        return (
          <svg
            className="w-4 h-4 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        )
      case 'URGENT':
        return (
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        )
      default:
        return null
    }
  }

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  const toggleExpanded = (ticketId: string) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId)
  }

  return (
    <div className="divide-y divide-gray-200">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="flex items-center space-x-2">
                  {getPriorityIcon(ticket.priority)}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                >
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center space-x-4 mb-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {ticket.units.properties.name} - {ticket.units.unit_label}
                </h3>
                <span className="text-sm text-gray-500">{getDaysAgo(ticket.created_at)}</span>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                  <span>Est: {formatCurrency(ticket.est_cost_kes)}</span>
                </div>
                {ticket.actual_cost_kes && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Actual: {formatCurrency(ticket.actual_cost_kes)}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Created: {formatDate(ticket.created_at)}</span>
                </div>
              </div>

              {expandedTicket === ticket.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                      <div className="space-y-1 text-gray-600">
                        <div>Ticket ID: {ticket.id.slice(0, 8)}...</div>
                        <div>Unit ID: {ticket.unit_id.slice(0, 8)}...</div>
                        <div>Last Updated: {formatDate(ticket.updated_at)}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Cost Analysis</h4>
                      <div className="space-y-1 text-gray-600">
                        <div>Estimated: {formatCurrency(ticket.est_cost_kes)}</div>
                        <div>Actual: {formatCurrency(ticket.actual_cost_kes)}</div>
                        {ticket.est_cost_kes && ticket.actual_cost_kes && (
                          <div
                            className={`font-medium ${
                              ticket.actual_cost_kes <= ticket.est_cost_kes
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            Variance: {ticket.actual_cost_kes <= ticket.est_cost_kes ? '-' : '+'}
                            {formatCurrency(Math.abs(ticket.actual_cost_kes - ticket.est_cost_kes))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Full Description</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => toggleExpanded(ticket.id)}
                className="text-gray-400 hover:text-gray-600"
                title={expandedTicket === ticket.id ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={`w-5 h-5 transform transition-transform ${
                    expandedTicket === ticket.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <button
                onClick={() => onTicketSelect(ticket)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
