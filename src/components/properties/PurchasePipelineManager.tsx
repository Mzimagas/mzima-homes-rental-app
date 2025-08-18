'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase from '../../lib/supabase-client'
import { PropertyTypeEnum } from '../../lib/validation/property'
import { Button, TextField, FormField } from '../ui'
import Modal from '../ui/Modal'
import AddressAutocomplete from '../location/AddressAutocomplete'

import GoogleMapEmbed from '../location/GoogleMapEmbed'

// Phone number validation regex (consistent with tenant validation)
const phoneRegex = /^\+?[0-9\s\-()]+$/

// Pipeline Stage Definitions
export interface PipelineStage {
  id: number
  name: string
  description: string
  statusOptions: string[]
  requiredFields?: string[]
  estimatedDays?: number
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 1,
    name: "Initial Search & Evaluation",
    description: "Property identification and initial assessment",
    statusOptions: ["Not Started", "In Progress", "Completed", "On Hold"],
    requiredFields: ["propertyName", "propertyAddress", "propertyType"],
    estimatedDays: 7
  },
  {
    id: 2,
    name: "Survey & Mapping",
    description: "Beacons placement and site visit documentation",
    statusOptions: ["Not Started", "Scheduled", "In Progress", "Completed", "Issues Found"],
    estimatedDays: 14
  },
  {
    id: 3,
    name: "Legal Verification",
    description: "Witness verification and stakeholder meetings",
    statusOptions: ["Not Started", "Documents Requested", "Under Review", "Verified", "Issues Found"],
    estimatedDays: 21
  },
  {
    id: 4,
    name: "Agreement & Documentation",
    description: "Contract preparation and legal documentation",
    statusOptions: ["Not Started", "Drafting", "Under Review", "Finalized", "Amendments Needed"],
    estimatedDays: 10
  },
  {
    id: 5,
    name: "Financial Processing (Down Payment)",
    description: "Initial payment processing and confirmation",
    statusOptions: ["Not Started", "Pending", "Processed", "Failed", "Partial"],
    estimatedDays: 5
  },
  {
    id: 6,
    name: "Financial Processing (Subsequent Payments)",
    description: "Remaining payment installments processing",
    statusOptions: ["Not Started", "Pending", "In Progress", "Completed", "Overdue"],
    estimatedDays: 30
  },
  {
    id: 7,
    name: "LCB Meeting & Seller Transfer Forms",
    description: "Land Control Board meeting and seller signed transfer forms (same day)",
    statusOptions: ["Not Started", "LCB Application Submitted", "Meeting Scheduled", "LCB Approved & Forms Signed", "LCB Rejected", "Forms Pending"],
    estimatedDays: 1
  },
  {
    id: 8,
    name: "Title Registration (Transfer)",
    description: "Final title transfer and registration completion",
    statusOptions: ["Not Started", "Application Submitted", "Under Processing", "Registered", "Rejected"],
    estimatedDays: 22
  }
]

// Stage Status Colors
export const getStageStatusColor = (status: string): string => {
  switch (status) {
    case "Not Started": return "bg-gray-100 text-gray-600"
    case "In Progress": case "Scheduled": case "Under Review": case "Drafting": case "Pending":
    case "LCB Application Submitted": case "Meeting Scheduled": case "Application Submitted": case "Under Processing":
      return "bg-blue-100 text-blue-700"
    case "Completed": case "Verified": case "Finalized": case "Processed": case "Approved":
    case "Fully Signed": case "Registered": case "LCB Approved & Forms Signed":
      return "bg-green-100 text-green-700"
    case "On Hold": case "Issues Found": case "Failed": case "Rejected": case "Overdue":
    case "Corrections Needed": case "LCB Rejected":
      return "bg-red-100 text-red-700"
    case "Amendments Needed": case "Partial": case "Partially Signed": case "Pending Documents":
    case "Forms Pending":
      return "bg-yellow-100 text-yellow-700"
    default: return "bg-gray-100 text-gray-600"
  }
}

// Purchase pipeline schema
const purchasePipelineSchema = z.object({
  propertyName: z.string().min(1, 'Property name is required'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
  propertyType: z.union([PropertyTypeEnum, z.literal('')]).refine((val) => val !== '', {
    message: 'Please select a property type'
  }),

  sellerName: z.string().optional(),
  sellerPhone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  brokerName: z.string().optional(),
  brokerPhone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  askingPrice: z.number().positive().optional(),
  negotiatedPrice: z.number().positive().optional(),
  depositPaid: z.number().min(0).optional(),
  targetCompletionDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  financingSource: z.string().optional(),
  inspectionNotes: z.string().optional(),
  dueDiligenceNotes: z.string().optional(),
  contractReference: z.string().optional(),
  valuationAmount: z.number().positive().optional(),
  loanAmount: z.number().min(0).optional(),
  cashAmount: z.number().min(0).optional(),
  closingCosts: z.number().min(0).optional(),
  expectedRentalIncome: z.number().positive().optional(),
  expectedRoi: z.number().min(0).max(100).optional(),
  riskAssessment: z.string().optional(),
  propertyConditionNotes: z.string().optional(),
  requiredImprovements: z.string().optional(),
  improvementCostEstimate: z.number().min(0).optional(),
})

type PurchasePipelineFormValues = z.infer<typeof purchasePipelineSchema>

// Progress Tracker Component
interface ProgressTrackerProps {
  currentStage: number
  stageData: PipelineStageData[]
  onStageClick: (stageId: number) => void
  overallProgress: number
  purchaseId: string
  onStageUpdate: (purchaseId: string, stageId: number, newStatus: string, notes?: string, stageData?: any) => Promise<void>
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStage,
  stageData,
  onStageClick,
  overallProgress,
  purchaseId,
  onStageUpdate
}) => {
  const getStageStatus = (stageId: number): string => {
    const stage = stageData.find(s => s.stage_id === stageId)
    return stage?.status || "Not Started"
  }

  const isStageCompleted = (stageId: number): boolean => {
    const status = getStageStatus(stageId)
    return ["Completed", "Verified", "Finalized", "Processed", "Approved", "Fully Signed", "Registered", "LCB Approved & Forms Signed"].includes(status)
  }

  const isStageActive = (stageId: number): boolean => {
    return stageId === currentStage
  }

  // Map pipeline stages to purchase status labels
  const getStagePurchaseStatus = (stageId: number): string => {
    const stageStatusMap = {
      1: "IDENTIFIED",      // Initial Search & Evaluation
      2: "NEGOTIATING",     // Survey & Mapping
      3: "DUE DILIGENCE",   // Legal Verification
      4: "UNDER CONTRACT",  // Agreement & Documentation
      5: "FINANCING",       // Down Payment
      6: "FINANCING",       // Subsequent Payments
      7: "CLOSING",         // LCB Meeting & Forms
      8: "CLOSING"          // Title Registration
    }
    return stageStatusMap[stageId as keyof typeof stageStatusMap] || "IDENTIFIED"
  }

  // Get status color for purchase status labels
  const getPurchaseStatusColor = (status: string): string => {
    const colors = {
      'IDENTIFIED': 'bg-gray-100 text-gray-800',
      'NEGOTIATING': 'bg-yellow-100 text-yellow-800',
      'UNDER_CONTRACT': 'bg-blue-100 text-blue-800',
      'DUE_DILIGENCE': 'bg-purple-100 text-purple-800',
      'FINANCING': 'bg-indigo-100 text-indigo-800',
      'CLOSING': 'bg-orange-100 text-orange-800',
      'COMPLETED': 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const canAccessStage = (stageId: number): boolean => {
    // Can access current stage, completed stages, or next stage if current is completed
    return stageId <= currentStage || isStageCompleted(stageId) ||
           (stageId === currentStage + 1 && isStageCompleted(currentStage))
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pipeline Progress</h3>
        <div className="text-sm text-gray-600">
          {overallProgress}% Complete
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        ></div>
      </div>

      {/* Stage Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const status = getStageStatus(stage.id)
          const isCompleted = isStageCompleted(stage.id)
          const isActive = isStageActive(stage.id)
          const canAccess = canAccessStage(stage.id)
          const purchaseStatus = getStagePurchaseStatus(stage.id)

          return (
            <div
              key={stage.id}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : isCompleted
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : canAccess
                      ? 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
              onClick={() => canAccess && onStageClick(stage.id)}
            >
              {/* Stage Number */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? '✓' : stage.id}
              </div>

              {/* Stage Name */}
              <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {stage.name}
              </h4>

              {/* Purchase Status Label */}
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-1 ${getPurchaseStatusColor(purchaseStatus)}`}>
                {purchaseStatus}
              </div>

              {/* Current Stage Status */}
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStageStatusColor(status)}`}>
                {status}
              </div>

              {/* Estimated Days */}
              <div className="text-xs text-gray-500 mt-1">
                ~{stage.estimatedDays} days
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface PipelineStageData {
  stage_id: number
  status: string
  started_date?: string
  completed_date?: string
  notes?: string
  assigned_to?: string
  estimated_completion?: string
  documents?: string[]
}

interface PurchaseItem {
  id: string
  property_name: string
  property_address: string
  property_type: string
  seller_name?: string
  seller_contact?: string
  asking_price_kes?: number
  negotiated_price_kes?: number
  deposit_paid_kes?: number
  purchase_status: string
  target_completion_date?: string
  legal_representative?: string
  financing_source?: string
  expected_rental_income_kes?: number
  expected_roi_percentage?: number
  risk_assessment?: string
  property_condition_notes?: string
  current_stage?: number
  pipeline_stages?: PipelineStageData[]
  overall_progress?: number
  created_at: string
  updated_at: string
}

// Stage Modal Component
interface StageModalProps {
  isOpen: boolean
  onClose: () => void
  stageId: number
  purchaseId: string
  stageData: PipelineStageData | undefined
  onStageUpdate: (purchaseId: string, stageId: number, newStatus: string, notes?: string, stageData?: any) => Promise<void>
}

const StageModal: React.FC<StageModalProps> = ({
  isOpen,
  onClose,
  stageId,
  purchaseId,
  stageData,
  onStageUpdate
}) => {
  const [status, setStatus] = useState(stageData?.status || "Not Started")
  const [notes, setNotes] = useState(stageData?.notes || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stage = PIPELINE_STAGES.find(s => s.id === stageId)
  if (!stage) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onStageUpdate(purchaseId, stageId, status, notes)
      onClose()
    } catch (error) {
      console.error('Error updating stage:', error)
      alert('Failed to update stage. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Stage {stageId}: {stage.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-6">
        {/* Stage Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">{stage.description}</p>
          <p className="text-sm text-blue-600 mt-1">Estimated duration: ~{stage.estimatedDays} days</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Stage Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            >
              {stage.statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Add any relevant notes for this stage..."
            />
          </div>

          {/* Stage-Specific Fields */}
          {stageId === 1 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Initial Search & Evaluation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Property Condition</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white">
                    <option value="">Select condition</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Market Value Assessment (KES)</label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="5000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Initial Assessment Notes</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Property details, initial observations, potential issues..."
                />
              </div>
            </div>
          )}

          {stageId === 2 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Survey & Mapping</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Survey Appointment Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Surveyor Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Licensed surveyor name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Beacon Placement Notes</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Beacon locations, boundary markers, survey findings..."
                />
              </div>
            </div>
          )}

          {stageId === 3 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Legal Verification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Legal Representative</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Lawyer/advocate name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title Deed Verification</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white">
                    <option value="">Select status</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="issues_found">Issues Found</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Legal Documentation Status</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Document verification results, legal clearances, any issues..."
                />
              </div>
            </div>
          )}

          {stageId === 4 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Agreement & Documentation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agreement Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contract Type</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white">
                    <option value="">Select type</option>
                    <option value="sale_agreement">Sale Agreement</option>
                    <option value="mou">Memorandum of Understanding</option>
                    <option value="conditional_sale">Conditional Sale</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract Details & Amendments</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Contract terms, special conditions, amendments..."
                />
              </div>
            </div>
          )}

          {stageId === 5 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Financial Processing - Down Payment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Amount (KES)</label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="1000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white">
                    <option value="">Select method</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction Reference</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Transaction ID or reference number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {stageId === 6 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Financial Processing - Subsequent Payments</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remaining Balance (KES)</label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="4000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Schedule</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white">
                    <option value="">Select schedule</option>
                    <option value="lump_sum">Lump Sum</option>
                    <option value="monthly">Monthly Installments</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="custom">Custom Schedule</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Tracking Notes</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Payment confirmations, installment details, pending amounts..."
                />
              </div>
            </div>
          )}

          {stageId === 7 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">LCB Meeting & Seller Transfer Forms</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">LCB Meeting Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meeting Status</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white">
                    <option value="">Select status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="approved">Approved</option>
                    <option value="pending_documents">Pending Documents</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">LRA 33 Forms & Consent Documentation</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Form submission status, consent documentation, meeting attendees..."
                />
              </div>
            </div>
          )}

          {stageId === 8 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Title Registration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Application Reference</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Registration application number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Processing Status</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white">
                    <option value="">Select status</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="registered">Registered</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Completion Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Title Deed Number</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="New title deed reference"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Document Upload Section */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-lg font-medium text-gray-900">Documents</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  id={`file-upload-${stageId}`}
                />
                <label
                  htmlFor={`file-upload-${stageId}`}
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, DOC, JPG, PNG up to 10MB each
                  </span>
                </label>
              </div>
            </div>

            {/* Existing Documents List */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Uploaded Documents</h5>
              <div className="text-sm text-gray-500">
                No documents uploaded yet
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Stage'}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}

interface PurchasePipelineManagerProps {
  onPropertyTransferred?: (propertyId: string) => void
}

export default function PurchasePipelineManager({ onPropertyTransferred }: PurchasePipelineManagerProps) {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null)
  const [transferringId, setTransferringId] = useState<string | null>(null)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [showStageModal, setShowStageModal] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PurchasePipelineFormValues>({
    resolver: zodResolver(purchasePipelineSchema)
  })

  useEffect(() => {
    loadPurchases()
  }, [])

  // Pipeline Management Functions
  const initializePipelineStages = (): PipelineStageData[] => {
    return PIPELINE_STAGES.map(stage => ({
      stage_id: stage.id,
      status: stage.id === 1 ? "In Progress" : "Not Started",
      started_date: stage.id === 1 ? new Date().toISOString() : undefined,
      notes: "",
      documents: []
    }))
  }

  const calculateOverallProgress = (stageData: PipelineStageData[]): number => {
    const completedStages = stageData.filter(stage =>
      ["Completed", "Verified", "Finalized", "Processed", "Approved", "Fully Signed", "Registered", "LCB Approved & Forms Signed"].includes(stage.status)
    ).length
    return Math.round((completedStages / PIPELINE_STAGES.length) * 100)
  }

  const getCurrentStage = (stageData: PipelineStageData[]): number => {
    // Find the first non-completed stage
    for (let i = 0; i < stageData.length; i++) {
      const stage = stageData[i]
      if (!["Completed", "Verified", "Finalized", "Processed", "Approved", "Fully Signed", "Registered", "LCB Approved & Forms Signed"].includes(stage.status)) {
        return stage.stage_id
      }
    }
    return PIPELINE_STAGES.length // All stages completed
  }

  const handleStageClick = (stageId: number, purchaseId: string) => {
    setSelectedStageId(stageId)
    setSelectedPurchaseId(purchaseId)
    setShowStageModal(true)
  }

  /**
   * Auto-update purchase status based on current active pipeline stage
   *
   * The purchase status now reflects the current stage being worked on:
   * - IDENTIFIED: Stage 1 (Initial Search & Evaluation)
   * - NEGOTIATING: Stage 2 (Survey & Mapping)
   * - DUE DILIGENCE: Stage 3 (Legal Verification)
   * - UNDER CONTRACT: Stage 4 (Agreement & Documentation)
   * - FINANCING: Stage 5-6 (Down Payment & Subsequent Payments)
   * - CLOSING: Stage 7-8 (LCB Meeting & Title Registration)
   * - COMPLETED: All stages completed
   */
  const determinePurchaseStatus = (stages: PipelineStageData[]): string => {
    const completionStatuses = [
      "Completed", "Verified", "Finalized", "Processed", "Approved",
      "Fully Signed", "Registered", "LCB Approved & Forms Signed"
    ]

    // Check if all stages are completed
    const allCompleted = stages.every(stage => completionStatuses.includes(stage.status))
    if (allCompleted) return 'COMPLETED'

    // Find the current active stage (first non-completed stage)
    const currentStage = getCurrentStage(stages)

    // Map current stage to purchase status
    const stageStatusMap = {
      1: "IDENTIFIED",      // Initial Search & Evaluation
      2: "NEGOTIATING",     // Survey & Mapping
      3: "DUE_DILIGENCE",   // Legal Verification
      4: "UNDER_CONTRACT",  // Agreement & Documentation
      5: "FINANCING",       // Down Payment
      6: "FINANCING",       // Subsequent Payments
      7: "CLOSING",         // LCB Meeting & Forms
      8: "CLOSING"          // Title Registration
    }

    return stageStatusMap[currentStage as keyof typeof stageStatusMap] || 'IDENTIFIED'
  }

  const updateStageStatus = async (purchaseId: string, stageId: number, newStatus: string, notes?: string) => {
    try {
      const purchase = purchases.find(p => p.id === purchaseId)
      if (!purchase) return

      const updatedStages = [...(purchase.pipeline_stages || initializePipelineStages())]
      const stageIndex = updatedStages.findIndex(s => s.stage_id === stageId)

      if (stageIndex !== -1) {
        // Define completion statuses for each stage
        const completionStatuses = [
          "Completed", "Verified", "Finalized", "Processed", "Approved",
          "Fully Signed", "Registered", "LCB Approved & Forms Signed"
        ]

        const isCompleted = completionStatuses.includes(newStatus)

        updatedStages[stageIndex] = {
          ...updatedStages[stageIndex],
          status: newStatus,
          notes: notes || updatedStages[stageIndex].notes,
          completed_date: isCompleted ? new Date().toISOString() : undefined
        }

        // Auto-advance to next stage if current stage is completed
        if (isCompleted && stageId < 8) {
          const nextStageIndex = updatedStages.findIndex(s => s.stage_id === stageId + 1)
          if (nextStageIndex !== -1 && updatedStages[nextStageIndex].status === "Not Started") {
            updatedStages[nextStageIndex] = {
              ...updatedStages[nextStageIndex],
              status: "In Progress",
              started_date: new Date().toISOString()
            }
          }
        }

        const overallProgress = calculateOverallProgress(updatedStages)
        const currentStage = getCurrentStage(updatedStages)

        // Auto-update purchase status based on pipeline stages
        const newPurchaseStatus = determinePurchaseStatus(updatedStages)

        const { error } = await supabase
          .from('purchase_pipeline')
          .update({
            pipeline_stages: updatedStages,
            current_stage: currentStage,
            overall_progress: overallProgress,
            purchase_status: newPurchaseStatus,
            updated_at: new Date().toISOString(),
            // Set completion date if status is COMPLETED
            actual_completion_date: newPurchaseStatus === 'COMPLETED' ? new Date().toISOString().split('T')[0] : undefined
          })
          .eq('id', purchaseId)

        if (error) {
          console.error('Supabase error details:', error)
          throw error
        }

        // Update local state
        setPurchases(prev => prev.map(p =>
          p.id === purchaseId
            ? {
                ...p,
                pipeline_stages: updatedStages,
                current_stage: currentStage,
                overall_progress: overallProgress,
                purchase_status: newPurchaseStatus
              }
            : p
        ))

        const statusMessage = purchase.purchase_status !== newPurchaseStatus
          ? ` Purchase status updated to ${newPurchaseStatus.replace('_', ' ')}.`
          : ''

        alert(`Stage updated successfully!${isCompleted && stageId < 8 ? ' Next stage has been activated.' : ''}${statusMessage}`)
      }
    } catch (error) {
      console.error('Error updating stage status:', error)
      alert('Failed to update stage. Please try again.')
    }
  }

  const loadPurchases = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('purchase_pipeline')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Error loading purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: PurchasePipelineFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to manage purchases')
        return
      }

      // Initialize pipeline stages for new purchases
      const initialStages = editingPurchase?.pipeline_stages || initializePipelineStages()
      const overallProgress = editingPurchase?.overall_progress || calculateOverallProgress(initialStages)
      const currentStageNum = editingPurchase?.current_stage || getCurrentStage(initialStages)

      const purchaseData = {
        property_name: values.propertyName,
        property_address: values.propertyAddress,
        property_type: values.propertyType,
        seller_name: values.sellerName || null,
        seller_contact: values.sellerPhone || null,
        pipeline_stages: initialStages,
        current_stage: currentStageNum,
        overall_progress: overallProgress,
        asking_price_kes: values.askingPrice || null,
        negotiated_price_kes: values.negotiatedPrice || null,
        deposit_paid_kes: values.depositPaid || null,
        target_completion_date: values.targetCompletionDate || null,
        legal_representative: values.legalRepresentative || null,
        financing_source: values.financingSource || null,
        inspection_notes: values.inspectionNotes || null,
        due_diligence_notes: values.dueDiligenceNotes || null,
        contract_reference: values.contractReference || null,
        valuation_amount_kes: values.valuationAmount || null,
        loan_amount_kes: values.loanAmount || null,
        cash_amount_kes: values.cashAmount || null,
        closing_costs_kes: values.closingCosts || null,
        expected_rental_income_kes: values.expectedRentalIncome || null,
        expected_roi_percentage: values.expectedRoi || null,
        risk_assessment: values.riskAssessment || null,
        property_condition_notes: values.propertyConditionNotes || null,
        required_improvements: values.requiredImprovements || null,
        improvement_cost_estimate_kes: values.improvementCostEstimate || null,
        created_by: user.id,
        assigned_to: user.id,
      }

      if (editingPurchase) {
        const { error } = await supabase
          .from('purchase_pipeline')
          .update(purchaseData)
          .eq('id', editingPurchase.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('purchase_pipeline')
          .insert([purchaseData])

        if (error) throw error
      }

      reset()
      setShowForm(false)
      setEditingPurchase(null)
      loadPurchases()
    } catch (error) {
      console.error('Error saving purchase:', error)
      alert('Failed to save purchase')
    }
  }

  const updatePurchaseStatus = async (purchaseId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('purchase_pipeline')
        .update({
          purchase_status: status,
          actual_completion_date: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', purchaseId)

      if (error) throw error
      loadPurchases()
    } catch (error) {
      console.error('Error updating purchase status:', error)
      alert('Failed to update purchase status')
    }
  }

  const transferToProperties = async (purchase: PurchaseItem) => {
    try {
      setTransferringId(purchase.id)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to transfer properties')
        return
      }

      // Create property from purchase
      const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
        property_name: purchase.property_name,
        property_address: purchase.property_address,
        property_type: purchase.property_type,
        owner_user_id: user.id
      })

      if (createError) throw createError

      // Update property with purchase details and lifecycle tracking
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          property_source: 'PURCHASE_PIPELINE',
          source_reference_id: purchase.id,
          lifecycle_status: 'PURCHASED',
          purchase_completion_date: new Date().toISOString().split('T')[0],
          sale_price_kes: purchase.negotiated_price_kes || purchase.asking_price_kes,
          expected_rental_income_kes: purchase.expected_rental_income_kes,
          acquisition_notes: `Transferred from purchase pipeline. Original asking price: ${purchase.asking_price_kes ? `KES ${purchase.asking_price_kes.toLocaleString()}` : 'N/A'}`
        })
        .eq('id', propertyId)

      if (updateError) throw updateError

      // Update purchase pipeline record
      const { error: pipelineError } = await supabase
        .from('purchase_pipeline')
        .update({
          purchase_status: 'COMPLETED',
          actual_completion_date: new Date().toISOString().split('T')[0],
          completed_property_id: propertyId
        })
        .eq('id', purchase.id)

      if (pipelineError) throw pipelineError

      alert('Property successfully transferred to properties management!')
      loadPurchases()
      onPropertyTransferred?.(propertyId)
    } catch (error) {
      console.error('Error transferring property:', error)
      alert('Failed to transfer property')
    } finally {
      setTransferringId(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'IDENTIFIED': 'bg-gray-100 text-gray-800',
      'NEGOTIATING': 'bg-yellow-100 text-yellow-800',
      'UNDER_CONTRACT': 'bg-blue-100 text-blue-800',
      'DUE_DILIGENCE': 'bg-purple-100 text-purple-800',
      'FINANCING': 'bg-orange-100 text-orange-800',
      'CLOSING': 'bg-indigo-100 text-indigo-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const statusOptions = [
    'IDENTIFIED', 'NEGOTIATING', 'UNDER_CONTRACT', 'DUE_DILIGENCE',
    'FINANCING', 'CLOSING', 'COMPLETED', 'CANCELLED'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Pipeline</h2>
          <p className="text-gray-600">Track properties being acquired through purchase process</p>
        </div>
        <Button
          onClick={() => {
            setEditingPurchase(null)
            reset()
            setShowForm(true)
          }}
          variant="primary"
        >
          Add Purchase Opportunity
        </Button>
      </div>

      {/* Purchase List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading purchases...</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Opportunities</h3>
          <p className="text-gray-600 mb-4">Start tracking properties you're considering for purchase.</p>
          <Button
            onClick={() => {
              setEditingPurchase(null)
              reset()
              setShowForm(true)
            }}
            variant="primary"
          >
            Add First Purchase
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="space-y-4">
              {/* Progress Tracker for each purchase */}
              <ProgressTracker
                currentStage={purchase.current_stage || 1}
                stageData={purchase.pipeline_stages || initializePipelineStages()}
                onStageClick={(stageId) => {
                  handleStageClick(stageId, purchase.id)
                }}
                overallProgress={purchase.overall_progress || 0}
                purchaseId={purchase.id}
                onStageUpdate={updateStageStatus}
              />

              {/* Auto-Update Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center text-sm text-blue-800">
                  <span className="mr-2">🔄</span>
                  <span>Pipeline cards show purchase status labels that sync with your current stage progress</span>
                </div>
              </div>

              {/* Purchase Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900">{purchase.property_name}</h3>
                  <p className="text-gray-600">{purchase.property_address}</p>
                  {purchase.seller_name && (
                    <p className="text-sm text-gray-500">Seller: {purchase.seller_name}</p>
                  )}
                </div>
                <div className="h-40">
                  <GoogleMapEmbed
                    address={purchase.property_address || purchase.property_name}
                    title={`Map of ${purchase.property_name}`}
                    className="h-40"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(purchase.purchase_status)}`}>
                      {purchase.purchase_status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-blue-600" title="Status syncs with current pipeline stage">
                      🔄
                    </span>
                  </div>
                  <select
                    value={purchase.purchase_status}
                    onChange={(e) => updatePurchaseStatus(purchase.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                    title="Manual status override (will sync with current pipeline stage when stages are updated)"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {purchase.asking_price_kes && (
                  <div>
                    <p className="text-sm text-gray-500">Asking Price</p>
                    <p className="font-semibold">KES {purchase.asking_price_kes.toLocaleString()}</p>
                  </div>
                )}
                {purchase.negotiated_price_kes && (
                  <div>
                    <p className="text-sm text-gray-500">
                      {purchase.property_type === 'RESIDENTIAL_LAND' ||
                       purchase.property_type === 'COMMERCIAL_LAND' ||
                       purchase.property_type === 'AGRICULTURAL_LAND' ||
                       purchase.property_type === 'MIXED_USE_LAND'
                        ? "Negotiated Price Request"
                        : "Negotiated Price"}
                    </p>
                    <p className="font-semibold text-green-600">KES {purchase.negotiated_price_kes.toLocaleString()}</p>
                  </div>
                )}
                {/* Only show rental income for HOME and HOSTEL */}
                {purchase.expected_rental_income_kes &&
                 (purchase.property_type === 'HOME' || purchase.property_type === 'HOSTEL') && (
                  <div>
                    <p className="text-sm text-gray-500">Expected Monthly Rent</p>
                    <p className="font-semibold">KES {purchase.expected_rental_income_kes.toLocaleString()}</p>
                  </div>
                )}

              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {purchase.target_completion_date && (
                    <span>Target: {new Date(purchase.target_completion_date).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingPurchase(purchase)
                      // Populate form with purchase data
                      reset({
                        propertyName: purchase.property_name,
                        propertyAddress: purchase.property_address,
                        propertyType: purchase.property_type as any,
                        sellerName: purchase.seller_name || '',
                        sellerPhone: purchase.seller_contact || '',
                        askingPrice: purchase.asking_price_kes || undefined,
                        negotiatedPrice: purchase.negotiated_price_kes || undefined,
                        targetCompletionDate: purchase.target_completion_date || '',
                        expectedRentalIncome: purchase.expected_rental_income_kes || undefined,
                        expectedRoi: purchase.expected_roi_percentage || undefined,
                      })
                      setShowForm(true)
                    }}
                  >
                    Edit
                  </Button>
                  {purchase.purchase_status === 'COMPLETED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => transferToProperties(purchase)}
                      disabled={transferringId === purchase.id}
                    >
                      {transferringId === purchase.id ? 'Transferring...' : 'Transfer to Properties'}
                    </Button>
                  )}
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingPurchase(null)
          reset()
        }}
        title={editingPurchase ? 'Edit Purchase Opportunity' : 'Add Purchase Opportunity'}
      >
        <div className="max-w-none w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Property Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">1</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Basic Property Information</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField name="propertyName" label="Property Name *" error={errors.propertyName?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('propertyName')}
                    placeholder="e.g., Riverside Apartments"
                    className="bg-white"
                  />
                )}
              </FormField>

              <FormField name="propertyType" label="Property Type *" error={errors.propertyType?.message}>
                {({ id }) => (
                  <select
                    id={id}
                    {...register('propertyType')}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select property type...
                    </option>
                    {PropertyTypeEnum.options.map((type) => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>


            </div>

            <div className="mt-6">
              <FormField name="propertyAddress" label="Property Address *" error={errors.propertyAddress?.message}>
                {() => (
                  <div className="bg-white rounded-md p-1">
                    <AddressAutocomplete
                      value={watch('propertyAddress') || ''}
                      onChange={(address: string) => setValue('propertyAddress', address)}
                      onSelect={({ address, lat, lng }) => {
                        setValue('propertyAddress', address)
                        if (lat !== undefined) setValue('lat', lat)
                        if (lng !== undefined) setValue('lng', lng)
                      }}
                      error={errors.propertyAddress?.message || null}
                    />
                  </div>
                )}
              </FormField>
            </div>
          </div>

          {/* Seller Information */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Seller Information</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField name="sellerName" label="Seller Name">
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerName')}
                    placeholder="e.g., John Doe"
                    className="bg-white"
                  />
                )}
              </FormField>

              <FormField name="sellerPhone" label="Seller Phone Number" error={errors.sellerPhone?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerPhone')}
                    type="tel"
                    placeholder="e.g., +254 700 000 000"
                    className="bg-white"
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* Broker Information */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">3</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Primary Broker Details</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField name="brokerName" label="Broker Name">
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('brokerName')}
                    placeholder="e.g., ABC Real Estate Agency"
                    className="bg-white"
                  />
                )}
              </FormField>

              <FormField name="brokerPhone" label="Broker Phone Number" error={errors.brokerPhone?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('brokerPhone')}
                    type="tel"
                    placeholder="e.g., +254 700 000 000"
                    className="bg-white"
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">4</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Financial Information</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField name="askingPrice" label="Asking Price (KES)" error={errors.askingPrice?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('askingPrice', {
                      setValueAs: (value) => {
                        if (typeof value === 'string') {
                          const numericValue = value.replace(/[\s,]/g, '')
                          return numericValue ? parseFloat(numericValue) : undefined
                        }
                        return value
                      }
                    })}
                    type="text"
                    placeholder="e.g., 5,000,000"
                    className="bg-white"
                  />
                )}
              </FormField>

              {/* Conditional label for Negotiated Price based on property type */}
              <FormField
                name="negotiatedPrice"
                label={
                  watch('propertyType') === 'RESIDENTIAL_LAND' ||
                  watch('propertyType') === 'COMMERCIAL_LAND' ||
                  watch('propertyType') === 'AGRICULTURAL_LAND' ||
                  watch('propertyType') === 'MIXED_USE_LAND'
                    ? "Negotiated Price Request (KES)"
                    : "Negotiated Price (KES)"
                }
                error={errors.negotiatedPrice?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('negotiatedPrice', {
                      setValueAs: (value) => {
                        if (typeof value === 'string') {
                          const numericValue = value.replace(/[\s,]/g, '')
                          return numericValue ? parseFloat(numericValue) : undefined
                        }
                        return value
                      }
                    })}
                    type="text"
                    placeholder="e.g., 4,500,000"
                    className="bg-white"
                  />
                )}
              </FormField>

              {/* Conditional fields - only show for HOME and HOSTEL */}
              {(watch('propertyType') === 'HOME' || watch('propertyType') === 'HOSTEL') && (
                <>
                  <FormField name="expectedRentalIncome" label="Expected Monthly Rent (KES)" error={errors.expectedRentalIncome?.message}>
                    {({ id }) => (
                      <TextField
                        id={id}
                        {...register('expectedRentalIncome', {
                          setValueAs: (value) => {
                            if (typeof value === 'string') {
                              const numericValue = value.replace(/[\s,]/g, '')
                              return numericValue ? parseFloat(numericValue) : undefined
                            }
                            return value
                          }
                        })}
                        type="text"
                        placeholder="e.g., 50,000"
                        className="bg-white"
                      />
                    )}
                  </FormField>

                  <FormField name="expectedRoi" label="Expected ROI (%)" error={errors.expectedRoi?.message}>
                    {({ id }) => (
                      <TextField
                        id={id}
                        {...register('expectedRoi', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g., 12.5"
                        className="bg-white"
                      />
                    )}
                  </FormField>
                </>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-6 border border-slate-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">5</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Additional Details</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FormField name="targetCompletionDate" label="Target Completion Date">
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('targetCompletionDate')}
                      type="date"
                      className="bg-white"
                    />
                  )}
                </FormField>

                <FormField name="legalRepresentative" label="Legal Representative">
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('legalRepresentative')}
                      placeholder="e.g., ABC Law Firm"
                      className="bg-white"
                    />
                  )}
                </FormField>

                <FormField name="financingSource" label="Financing Source">
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('financingSource')}
                      placeholder="e.g., Bank loan, Cash, Mixed"
                      className="bg-white"
                    />
                  )}
                </FormField>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField name="riskAssessment" label="Risk Assessment">
                  {({ id }) => (
                    <textarea
                      id={id}
                      {...register('riskAssessment')}
                      rows={4}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white resize-none"
                      placeholder="Assess potential risks and mitigation strategies..."
                    />
                  )}
                </FormField>

                <FormField name="propertyConditionNotes" label="Property Condition Notes">
                  {({ id }) => (
                    <textarea
                      id={id}
                      {...register('propertyConditionNotes')}
                      rows={4}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white resize-none"
                      placeholder="Current condition of the property..."
                    />
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white rounded-lg p-6 border-t-4 border-blue-500 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false)
                  setEditingPurchase(null)
                  reset()
                }}
                className="px-6 py-2.5 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  editingPurchase ? 'Update Purchase Opportunity' : 'Add Purchase Opportunity'
                )}
              </Button>
            </div>
          </div>
        </form>
        </div>
      </Modal>

      {/* Stage Modal */}
      {selectedStageId && selectedPurchaseId && (
        <StageModal
          isOpen={showStageModal}
          onClose={() => {
            setShowStageModal(false)
            setSelectedStageId(null)
            setSelectedPurchaseId(null)
          }}
          stageId={selectedStageId}
          purchaseId={selectedPurchaseId}
          stageData={purchases.find(p => p.id === selectedPurchaseId)?.pipeline_stages?.find(s => s.stage_id === selectedStageId)}
          onStageUpdate={updateStageStatus}
        />
      )}
    </div>
  )
}
