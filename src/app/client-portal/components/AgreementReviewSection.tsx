'use client'

import { useState, useEffect } from 'react'

interface ClientProperty {
  id: string
  name: string
  location: string
  asking_price_kes: number
  property_type: string
  description?: string
}

interface AgreementReviewSectionProps {
  property: ClientProperty
  onAgreementSigned: () => void
}

export default function AgreementReviewSection({ property, onAgreementSigned }: AgreementReviewSectionProps) {
  const [agreementGenerated, setAgreementGenerated] = useState(false)
  const [agreementReviewed, setAgreementReviewed] = useState(false)
  const [agreementSigned, setAgreementSigned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAgreement, setShowAgreement] = useState(false)
  const [signature, setSignature] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)

  // Check agreement state on component mount
  useEffect(() => {
    const checkAgreementState = async () => {
      try {
        const response = await fetch(`/api/clients/agreement-status?propertyId=${property.id}`)
        if (response.ok) {
          const data = await response.json()

          // Set state based on database values
          if (data.agreementGenerated) {
            setAgreementGenerated(true)
            setAgreementReviewed(true) // If generated, assume it can be reviewed
          }

          if (data.agreementSigned) {
            setAgreementGenerated(true)
            setAgreementReviewed(true)
            setAgreementSigned(true)
            if (data.signature) {
              setSignature(data.signature)
            }
            // Notify parent component that agreement is already signed
            onAgreementSigned()
          }
        }
      } catch (error) {
        console.error('Error checking agreement state:', error)
        // Continue with default state if check fails
      } finally {
        setInitialLoading(false)
      }
    }

    checkAgreementState()
  }, [property.id])

  const handleGenerateAgreement = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/clients/generate-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate agreement')
      }

      const data = await response.json()
      setAgreementGenerated(true)
      alert('Agreement generated successfully!')
    } catch (error) {
      console.error('Error generating agreement:', error)
      alert(`Failed to generate agreement: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAgreement = () => {
    setShowAgreement(true)
    setAgreementReviewed(true)
  }

  const handleSignAgreement = async () => {
    if (!signature.trim()) {
      alert('Please provide your digital signature')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/clients/sign-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property.id,
          signature: signature.trim(),
          agreementAccepted: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sign agreement')
      }

      const data = await response.json()
      setAgreementSigned(true)
      onAgreementSigned()
      alert('Agreement signed successfully! You can now proceed with deposit payment.')
    } catch (error) {
      console.error('Error signing agreement:', error)
      alert(`Failed to sign agreement: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking initial agreement status
  if (initialLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-blue-800">Purchase Agreement</h3>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800"></div>
        </div>
        <p className="text-xs text-blue-700">Checking agreement status...</p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-800">Purchase Agreement</h3>
        <div className="flex items-center space-x-2">
          {agreementGenerated && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Generated
            </span>
          )}
          {agreementReviewed && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              ✓ Reviewed
            </span>
          )}
          {agreementSigned && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              ✓ Signed
            </span>
          )}
        </div>
      </div>

      {!agreementGenerated ? (
        <div className="space-y-3">
          <p className="text-xs text-blue-700">
            Generate your purchase agreement to review the terms and conditions for this property.
          </p>
          <button
            onClick={handleGenerateAgreement}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating Agreement...</span>
              </div>
            ) : (
              'Generate Purchase Agreement'
            )}
          </button>
        </div>
      ) : !agreementSigned ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-700">
              Your purchase agreement is ready for review and signing.
            </p>
            <button
              onClick={handleReviewAgreement}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded border border-blue-300 transition-colors"
            >
              📄 Review Agreement
            </button>
          </div>

          {showAgreement && (
            <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <h4 className="font-semibold text-gray-800">Purchase Agreement Preview</h4>
                <p className="text-xs text-gray-600 mt-1">Property: {property.name}</p>
              </div>

              <div className="space-y-3 text-sm text-gray-700 max-h-40 overflow-y-auto">
                <div>
                  <strong>Property Details:</strong>
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• Name: {property.name}</li>
                    <li>• Location: {property.location}</li>
                    <li>• Type: {property.property_type}</li>
                    <li>• Purchase Price: KES {property.asking_price_kes.toLocaleString()}</li>
                  </ul>
                </div>

                <div>
                  <strong>Terms & Conditions:</strong>
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• Deposit required: 10% of purchase price</li>
                    <li>• Balance payment due within 30 days</li>
                    <li>• Property transfer upon full payment</li>
                    <li>• All legal fees to be shared equally</li>
                    <li>• Property sold as-is, where-is</li>
                  </ul>
                </div>

                <div>
                  <strong>Payment Schedule:</strong>
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• Deposit: KES {(property.asking_price_kes * 0.1).toLocaleString()}</li>
                    <li>• Balance: KES {(property.asking_price_kes * 0.9).toLocaleString()}</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Digital Signature (Type your full name)
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Enter your full name as digital signature"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="agree-terms" className="text-xs text-gray-700">
                    I have read, understood, and agree to the terms and conditions of this purchase agreement.
                  </label>
                </div>

                <button
                  onClick={handleSignAgreement}
                  disabled={loading || !signature.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Signing Agreement...</span>
                    </div>
                  ) : (
                    '✍️ Sign Agreement'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800">Agreement Signed Successfully</span>
          </div>
          <p className="text-xs text-green-700">
            Your purchase agreement has been signed and recorded. You can now proceed with the deposit payment.
          </p>
          <button
            onClick={() => setShowAgreement(!showAgreement)}
            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded border border-green-300 transition-colors"
          >
            {showAgreement ? 'Hide' : 'View'} Signed Agreement
          </button>
          
          {showAgreement && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <p className="text-xs text-green-700">
                <strong>Signed by:</strong> {signature}<br/>
                <strong>Date:</strong> {new Date().toLocaleDateString()}<br/>
                <strong>Status:</strong> Legally Binding Agreement
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
