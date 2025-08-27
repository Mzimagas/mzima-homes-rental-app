'use client'

import { useState } from 'react'

interface NotificationTemplate {
  id: string
  name: string
  type: 'rent_due' | 'payment_overdue' | 'lease_expiring' | 'maintenance_due' | 'custom'
  channel: 'email' | 'sms' | 'in_app'
  subject: string
  message: string
  variables: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: '1',
      name: 'Rent Due Reminder - Email',
      type: 'rent_due',
      channel: 'email',
      subject: 'Rent Payment Reminder - {{property_name}} {{unit_label}}',
      message: `Dear {{tenant_name}},

This is a friendly reminder that your rent payment for {{property_name}} - {{unit_label}} is due on {{due_date}}.

Amount Due: KES {{amount_due}}
Payment Methods: M-Pesa, Bank Transfer, or Cash

Please ensure your payment is made on time to avoid any late fees.

If you have any questions, please contact us.

Best regards,
{{landlord_name}}`,
      variables: [
        'tenant_name',
        'property_name',
        'unit_label',
        'due_date',
        'amount_due',
        'landlord_name',
      ],
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Rent Due Reminder - SMS',
      type: 'rent_due',
      channel: 'sms',
      subject: '',
      message:
        'Hi {{tenant_name}}, your rent for {{property_name}} {{unit_label}} (KES {{amount_due}}) is due on {{due_date}}. Please pay on time. - {{landlord_name}}',
      variables: [
        'tenant_name',
        'property_name',
        'unit_label',
        'amount_due',
        'due_date',
        'landlord_name',
      ],
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Payment Overdue - Email',
      type: 'payment_overdue',
      channel: 'email',
      subject: 'URGENT: Overdue Rent Payment - {{property_name}} {{unit_label}}',
      message: `Dear {{tenant_name}},

Your rent payment for {{property_name}} - {{unit_label}} is now {{days_overdue}} days overdue.

Original Due Date: {{due_date}}
Amount Due: KES {{amount_due}}
Late Fee: KES {{late_fee}}
Total Amount: KES {{total_amount}}

Please make your payment immediately to avoid further action.

Contact us if you need to discuss payment arrangements.

Regards,
{{landlord_name}}`,
      variables: [
        'tenant_name',
        'property_name',
        'unit_label',
        'days_overdue',
        'due_date',
        'amount_due',
        'late_fee',
        'total_amount',
        'landlord_name',
      ],
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])

  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'rent_due':
        return 'Rent Due'
      case 'payment_overdue':
        return 'Payment Overdue'
      case 'lease_expiring':
        return 'Lease Expiring'
      case 'maintenance_due':
        return 'Maintenance Due'
      case 'custom':
        return 'Custom'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return (
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )
      case 'sms':
        return (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )
      case 'in_app':
        return (
          <svg
            className="w-4 h-4 text-purple-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-5 5v-5zM4 19h6v2H4v-2zM20 4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
            />
          </svg>
        )
      default:
        return null
    }
  }

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template)
  }

  const handleDeleteTemplate = (template: NotificationTemplate) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return
    }

    setTemplates(templates.filter((t) => t.id !== template.id))
  }

  const handlePreviewTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Notification Templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage templates for automated notifications
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getChannelIcon(template.channel)}
                  <h3 className="text-sm font-medium text-gray-900 truncate">{template.name}</h3>
                </div>
                {template.is_default && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Default
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-900">{getTypeDisplayName(template.type)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Channel:</span>
                  <span className="text-gray-900 capitalize">{template.channel}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Variables:</span>
                  <span className="text-gray-900">{template.variables.length}</span>
                </div>
              </div>

              {template.subject && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Subject:</p>
                  <p className="text-sm text-gray-900 line-clamp-1">{template.subject}</p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Message Preview:</p>
                <p className="text-sm text-gray-900 line-clamp-3">{template.message}</p>
              </div>

              <div className="flex justify-between space-x-2">
                <button
                  onClick={() => handlePreviewTemplate(template)}
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Preview
                </button>

                <button
                  onClick={() => handleEditTemplate(template)}
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>

                {!template.is_default && (
                  <button
                    onClick={() => handleDeleteTemplate(template)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Available Variables Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-blue-900 mb-3">Available Template Variables</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Tenant Variables</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                <code>{'{{tenant_name}}'}</code> - Tenant's full name
              </li>
              <li>
                <code>{'{{tenant_phone}}'}</code> - Tenant's phone number
              </li>
              <li>
                <code>{'{{tenant_email}}'}</code> - Tenant's email address
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Property Variables</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                <code>{'{{property_name}}'}</code> - Property name
              </li>
              <li>
                <code>{'{{unit_label}}'}</code> - Unit label/number
              </li>
              <li>
                <code>{'{{monthly_rent}}'}</code> - Monthly rent amount
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Payment Variables</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                <code>{'{{amount_due}}'}</code> - Amount due
              </li>
              <li>
                <code>{'{{due_date}}'}</code> - Payment due date
              </li>
              <li>
                <code>{'{{days_overdue}}'}</code> - Days overdue
              </li>
              <li>
                <code>{'{{late_fee}}'}</code> - Late fee amount
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Template Preview</h3>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
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

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTemplate.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {getTypeDisplayName(selectedTemplate.type)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Channel</label>
                    <div className="mt-1 flex items-center space-x-2">
                      {getChannelIcon(selectedTemplate.channel)}
                      <span className="text-sm text-gray-900 capitalize">
                        {selectedTemplate.channel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Variables</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTemplate.variables.length} variables
                    </p>
                  </div>
                </div>

                {selectedTemplate.subject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <div className="mt-1 p-3 bg-gray-50 border rounded-md">
                      <p className="text-sm text-gray-900">{selectedTemplate.subject}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <div className="mt-1 p-3 bg-gray-50 border rounded-md">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedTemplate.message}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Variables Used</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleEditTemplate(selectedTemplate)
                    setSelectedTemplate(null)
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
