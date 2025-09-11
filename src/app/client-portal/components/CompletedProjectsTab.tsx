'use client'

import { useState } from 'react'
import EnhancedClientPropertyCard from './EnhancedClientPropertyCard'

interface Property {
  id: string
  name: string
  location?: string
  physical_address?: string
  lat?: number | null
  lng?: number | null
  property_type?: string
  property_type_display?: string
  asking_price_kes?: number
  description?: string
  images?: string[]
  main_image?: string
  handover_status?: string
  handover_status_display?: string
  area_display?: string
  total_area_acres?: number
  total_area_sqm?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  is_available_for_sale?: boolean
  status?: string
  current_stage?: string
}

interface CompletedProjectsTabProps {
  properties: Property[]
}

export default function CompletedProjectsTab({ properties }: CompletedProjectsTabProps) {
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null)

  // Filter for completed properties
  const completedProperties = properties.filter(property => 
    property.handover_status === 'COMPLETED' || property.status === 'COMPLETED'
  )

  const handleViewDetails = (propertyId: string) => {
    // Navigate to property detail page
    window.location.href = `/client-portal/property/${propertyId}`
  }

  const handleDownloadReport = async (propertyId: string) => {
    try {
      setDownloadingReport(propertyId)
      
      const response = await fetch(`/api/clients/property/${propertyId}/report`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      // Get the blob and create download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      
      // Get property name for filename
      const property = properties.find(p => p.id === propertyId)
      const filename = `${property?.name || 'Property'}_Completion_Report.pdf`
      a.download = filename
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    } finally {
      setDownloadingReport(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Completed Projects</h2>
          <p className="text-gray-600 text-sm">Properties that have completed the handover process</p>
        </div>
        
        {completedProperties.length > 0 && (
          <div className="text-sm text-gray-600">
            {completedProperties.length} completed project{completedProperties.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {completedProperties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">✅</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Completed Projects Yet</h3>
          <p className="text-gray-600 mb-4">
            Your completed projects will appear here once the handover process is finished
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mt-6">
            <h4 className="font-medium text-blue-900 mb-2">What happens when a project is completed?</h4>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• All documents become available for download</li>
              <li>• Complete financial summary is generated</li>
              <li>• Comprehensive project report is created</li>
              <li>• Property ownership is officially transferred</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Completed Projects</p>
                  <p className="text-xl font-bold text-gray-900">{completedProperties.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Investment</p>
                  <p className="text-xl font-bold text-gray-900">
                    {completedProperties.reduce((total, property) => 
                      total + (property.asking_price_kes || 0), 0
                    ).toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Available Reports</p>
                  <p className="text-xl font-bold text-gray-900">{completedProperties.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Bulk Actions</h3>
                <p className="text-sm text-gray-600">Download reports for all completed projects</p>
              </div>
              <button
                onClick={() => {
                  // TODO: Implement bulk download
                  alert('Bulk download feature coming soon!')
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download All Reports
              </button>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedProperties.map((property) => (
              <div key={property.id} className="relative">
                <EnhancedClientPropertyCard
                  property={property}
                  isClient={true}
                  showCompleted={true}
                  onViewDetails={handleViewDetails}
                  onDownloadReport={handleDownloadReport}
                />
                
                {/* Download Loading Overlay */}
                {downloadingReport === property.id && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Generating report...</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-2">About Completion Reports</h3>
            <p className="text-sm text-blue-800 mb-3">
              Each completion report contains a comprehensive overview of your property acquisition journey, including:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <ul className="space-y-1">
                <li>• Property details and specifications</li>
                <li>• Complete payment history</li>
                <li>• All uploaded documents</li>
                <li>• Timeline of key milestones</li>
              </ul>
              <ul className="space-y-1">
                <li>• Legal documentation</li>
                <li>• Transfer certificates</li>
                <li>• Final handover documents</li>
                <li>• Contact information for future reference</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
