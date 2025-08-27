'use client'
import { useState } from 'react'

interface AdvancedReservationFlowProps {
  unitId: string
  onComplete?: () => void
}

type Step = 'personal' | 'preferences' | 'documents' | 'review' | 'complete'

export default function AdvancedReservationFlow({
  unitId,
  onComplete,
}: AdvancedReservationFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    // Personal Information
    full_name: '',
    phone: '',
    email: '',
    id_number: '',
    occupation: '',
    employer: '',
    monthly_income: '',

    // Preferences
    preferred_move_in: '',
    lease_duration: '12',
    special_requests: '',

    // Emergency Contact
    emergency_name: '',
    emergency_phone: '',
    emergency_relationship: '',

    // Documents
    documents: {
      id_copy: null as File | null,
      income_proof: null as File | null,
      bank_statement: null as File | null,
      reference_letter: null as File | null,
    },
  })

  const steps: Array<{ id: Step; title: string; description: string }> = [
    {
      id: 'personal',
      title: 'Personal Info',
      description: 'Basic information and employment details',
    },
    { id: 'preferences', title: 'Preferences', description: 'Move-in date and lease preferences' },
    { id: 'documents', title: 'Documents', description: 'Upload required documents' },
    { id: 'review', title: 'Review', description: 'Review and submit application' },
    { id: 'complete', title: 'Complete', description: 'Application submitted' },
  ]

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep)

  const updateFormData = (field: string, value: any) => {
    if (field.startsWith('documents.')) {
      const docField = field.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        documents: { ...prev.documents, [docField]: value },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id)
    }
  }

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
    }
  }

  const submitApplication = async () => {
    setIsSubmitting(true)
    try {
      // In a real app, this would upload documents and submit the application
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setCurrentStep('complete')
      onComplete?.()
    } catch (error) {
      console.error('Failed to submit application:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => updateFormData('full_name', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ID Number *</label>
                  <input
                    type="text"
                    value={formData.id_number}
                    onChange={(e) => updateFormData('id_number', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Employment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Occupation *</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => updateFormData('occupation', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employer</label>
                  <input
                    type="text"
                    value={formData.employer}
                    onChange={(e) => updateFormData('employer', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Monthly Income (KES) *</label>
                  <input
                    type="number"
                    value={formData.monthly_income}
                    onChange={(e) => updateFormData('monthly_income', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.emergency_name}
                    onChange={(e) => updateFormData('emergency_name', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.emergency_phone}
                    onChange={(e) => updateFormData('emergency_phone', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Relationship *</label>
                  <select
                    value={formData.emergency_relationship}
                    onChange={(e) => updateFormData('emergency_relationship', e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="spouse">Spouse</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Lease Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preferred Move-in Date *</label>
                  <input
                    type="date"
                    value={formData.preferred_move_in}
                    onChange={(e) => updateFormData('preferred_move_in', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Lease Duration (months) *
                  </label>
                  <select
                    value={formData.lease_duration}
                    onChange={(e) => updateFormData('lease_duration', e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Special Requests or Requirements
              </label>
              <textarea
                value={formData.special_requests}
                onChange={(e) => updateFormData('special_requests', e.target.value)}
                rows={4}
                className="form-input"
                placeholder="Any special requirements, accessibility needs, or requests..."
              />
            </div>
          </div>
        )

      case 'documents':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Required Documents</h3>
              <p className="text-gray-600 mb-6">
                Please upload the following documents to complete your application:
              </p>

              <div className="space-y-4">
                {[
                  { key: 'id_copy', label: 'Copy of ID/Passport', required: true },
                  {
                    key: 'income_proof',
                    label: 'Proof of Income (Payslip/Contract)',
                    required: true,
                  },
                  {
                    key: 'bank_statement',
                    label: 'Bank Statement (Last 3 months)',
                    required: false,
                  },
                  { key: 'reference_letter', label: 'Reference Letter', required: false },
                ].map((doc) => (
                  <div key={doc.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium">
                        {doc.label} {doc.required && <span className="text-red-500">*</span>}
                      </label>
                      {formData.documents[doc.key as keyof typeof formData.documents] && (
                        <span className="text-green-600 text-sm">✓ Uploaded</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        updateFormData(`documents.${doc.key}`, file)
                      }}
                      className="form-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Accepted formats: PDF, JPG, PNG (Max 5MB)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Your Application</h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Personal Information</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Name:</strong> {formData.full_name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {formData.phone}
                    </p>
                    <p>
                      <strong>Email:</strong> {formData.email}
                    </p>
                    <p>
                      <strong>Occupation:</strong> {formData.occupation}
                    </p>
                    <p>
                      <strong>Monthly Income:</strong> KES {formData.monthly_income}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Lease Preferences</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Move-in Date:</strong> {formData.preferred_move_in}
                    </p>
                    <p>
                      <strong>Lease Duration:</strong> {formData.lease_duration} months
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Documents</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {Object.entries(formData.documents).map(([key, file]) => (
                      <p key={key}>
                        <strong>{key.replace('_', ' ').toUpperCase()}:</strong>{' '}
                        {file ? '✓ Uploaded' : '✗ Not uploaded'}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your application will be reviewed within 24-48 hours</li>
                  <li>• We may contact you for additional information</li>
                  <li>• You'll receive an email confirmation once approved</li>
                  <li>• A lease agreement will be prepared for signing</li>
                </ul>
              </div>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted!</h3>
            <p className="text-gray-600 mb-6">
              Thank you for your application. We'll review it and get back to you within 24-48
              hours.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Application ID:</strong> APP-{Date.now()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Submitted:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => (window.location.href = '/rent')} className="btn btn-primary">
              Browse More Units
            </button>
          </div>
        )

      default:
        return null
    }
  }

  if (currentStep === 'complete') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {renderStepContent()}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.slice(0, -1).map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStepIndex
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 2 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    index < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">{steps[currentStepIndex].title}</h2>
          <p className="text-gray-600">{steps[currentStepIndex].description}</p>
        </div>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentStepIndex === steps.length - 2 ? (
          <button
            onClick={submitApplication}
            disabled={isSubmitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        ) : (
          <button onClick={nextStep} className="btn btn-primary">
            Next
          </button>
        )}
      </div>
    </div>
  )
}
