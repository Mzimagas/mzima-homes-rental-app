'use client'

import { useState, useEffect } from 'react'

interface DueDiligenceStep {
  id: string
  title: string
  description: string
  completed: boolean
  date?: string
  notes?: string
  required: boolean
}

interface DueDiligenceInlineProps {
  propertyId: string
  propertyName: string
  onComplete: (completed: boolean) => void
  onMoveToMyProperties: () => void
}

const INITIAL_STEPS: Omit<DueDiligenceStep, 'completed' | 'date' | 'notes'>[] = [
  {
    id: 'land_registry_search',
    title: 'Conduct Official Search at Land Registry',
    description:
      "Verify ownership and check for encumbrances (mortgages, caveats, disputes). Visit area Land Registry with title deed copy.",
    required: true,
  },
  {
    id: 'physical_inspection',
    title: 'Conduct Physical Property Inspection',
    description:
      'Inspect property condition, boundaries, and structures. Engage licensed surveyor to confirm boundaries match official land maps. Take photos - recommended',
    required: true,
  },
  {
    id: 'seller_identity_verification',
    title: "Verify Seller's Identity and Legal Standing",
    description:
      'Confirm seller is legitimate owner with legal capacity to sell. Check identification documents and legal standing. Check for online reviews, ask friends etc.',
    required: true,
  },
]

export default function DueDiligenceInline({
  propertyId,
  propertyName,
  onComplete,
  onMoveToMyProperties,
}: DueDiligenceInlineProps) {
  const [steps, setSteps] = useState<DueDiligenceStep[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved due diligence data from localStorage
    const savedData = localStorage.getItem(`due_diligence_${propertyId}`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setSteps(parsed)
      } catch (error) {
        // Error parsing saved due diligence data
        initializeSteps()
      }
    } else {
      initializeSteps()
    }
  }, [propertyId])

  const initializeSteps = () => {
    const initializedSteps = INITIAL_STEPS.map((step) => ({
      ...step,
      completed: false,
      date: '',
      notes: '',
    }))
    setSteps(initializedSteps)
  }

  const updateStep = (stepId: string, updates: Partial<DueDiligenceStep>) => {
    const updatedSteps = steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    setSteps(updatedSteps)

    // Save to localStorage
    localStorage.setItem(`due_diligence_${propertyId}`, JSON.stringify(updatedSteps))

    // Check if all required steps are completed
    const requiredSteps = updatedSteps.filter((step) => step.required)
    const completedRequiredSteps = requiredSteps.filter((step) => step.completed)
    const allRequiredCompleted = completedRequiredSteps.length === requiredSteps.length

    onComplete(allRequiredCompleted)
  }

  const handleMoveToMyProperties = async () => {
    const requiredSteps = steps.filter((step) => step.required)
    const completedRequiredSteps = requiredSteps.filter((step) => step.completed)

    if (completedRequiredSteps.length < requiredSteps.length) {
      alert('Please complete all required due diligence steps before proceeding.')
      return
    }

    const proceed = confirm(
      `You have completed due diligence for ${propertyName}. ` +
        'Are you ready to reserve this property and move it to "Reserved"?'
    )

    if (proceed) {
      onMoveToMyProperties()
    }
  }

  const requiredSteps = steps.filter((step) => step.required)
  const completedRequiredSteps = requiredSteps.filter((step) => step.completed)
  const progressPercentage =
    requiredSteps.length > 0
      ? Math.round((completedRequiredSteps.length / requiredSteps.length) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Due Diligence Checklist</h3>
          <p className="text-sm text-gray-600">
            Complete these essential steps before committing to the property
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> While not mandatory, save documents and photos from each step, this will help you maintain organized records for your property acquisition process.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {completedRequiredSteps.length} of {requiredSteps.length} required steps
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`border rounded-lg p-4 transition-all duration-200 ${
              step.completed
                ? 'border-green-200 bg-green-50'
                : step.required
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={step.completed}
                  onChange={(e) =>
                    updateStep(step.id, {
                      completed: e.target.checked,
                      date: e.target.checked ? new Date().toISOString().split('T')[0] : '',
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                  {step.required && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>

                {step.completed && (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-green-600 font-medium">
                      ✓ Completed on{' '}
                      {step.date ? new Date(step.date).toLocaleDateString() : 'Unknown date'}
                    </div>
                    <textarea
                      placeholder="Add notes about this step..."
                      value={step.notes || ''}
                      onChange={(e) => updateStep(step.id, { notes: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Move to Reserved Button (appears when all required steps are done) */}
      {completedRequiredSteps.length === requiredSteps.length && (
        <div className="border-t pt-4">
          <button
            onClick={handleMoveToMyProperties}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Due Diligence Complete - Move to Reserved</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
