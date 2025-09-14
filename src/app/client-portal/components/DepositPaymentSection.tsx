'use client'

import { useState } from 'react'

interface ClientProperty {
  id: string
  name: string
  asking_price_kes: number | null
  // Payment tracking fields
  deposit_amount_kes?: number | null
  deposit_paid_at?: string | null
  payment_method?: string | null
  payment_reference?: string | null
  payment_verified_at?: string | null
}

interface DepositPaymentSectionProps {
  property: ClientProperty
  agreementSigned: boolean
  onDepositPaid: () => void
}

export default function DepositPaymentSection({ property, agreementSigned, onDepositPaid }: DepositPaymentSectionProps) {
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'bank' | ''>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Use actual payment status from database instead of local state
  const depositPaid = !!property.deposit_paid_at
  const paymentReference = property.payment_reference || ''
  const depositAmount = property.deposit_amount_kes || ((property.asking_price_kes || 0) * 0.1) // Use actual deposit or 10% of asking price

  const handleMakePayment = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method')
      return
    }

    if (paymentMethod === 'mpesa' && !phoneNumber.trim()) {
      alert('Please enter your M-Pesa phone number')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/clients/make-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property.id,
          paymentMethod,
          phoneNumber: paymentMethod === 'mpesa' ? phoneNumber : null,
          amount: depositAmount
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Payment failed')
      }

      const data = await response.json()
      // Payment successful - trigger refresh to get updated data from database
      onDepositPaid()
      alert(`${data.message}\n\nReference: ${data.payment.reference}`)
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!agreementSigned) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-600">Deposit Payment</h3>
        </div>
        <p className="text-xs text-gray-500">
          Complete the agreement signing process to unlock deposit payment.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-green-800">Deposit Payment</h3>
        {depositPaid && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Paid
          </span>
        )}
      </div>

      {!depositPaid ? (
        <div className="space-y-3">
          <div className="bg-white border border-green-200 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Deposit Amount:</span>
              <span className="text-lg font-bold text-green-700">
                KES {depositAmount.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              10% of purchase price (KES {(property.asking_price_kes || 0).toLocaleString()})
            </p>
          </div>

          {!showPaymentForm ? (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              💳 Make Deposit Payment
            </button>
          ) : (
            <div className="bg-white border border-green-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-800">Payment Details</h4>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Select Payment Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mpesa"
                      checked={paymentMethod === 'mpesa'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'mpesa')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">M-Pesa</span>
                    <span className="text-xs text-gray-500">(Instant payment)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'bank')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Bank Transfer</span>
                    <span className="text-xs text-gray-500">(1-2 business days)</span>
                  </label>
                </div>
              </div>

              {paymentMethod === 'mpesa' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g., 0712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You will receive an M-Pesa prompt on this number
                  </p>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h5 className="font-medium text-blue-800 mb-2">Bank Transfer Details</h5>
                  <div className="space-y-1 text-xs text-blue-700">
                    <p><strong>Bank:</strong> Equity Bank Kenya</p>
                    <p><strong>Account Name:</strong> Mzima Homes Ltd</p>
                    <p><strong>Account Number:</strong> 1234567890</p>
                    <p><strong>Branch:</strong> Westlands Branch</p>
                    <p><strong>Reference:</strong> {property.name} - Deposit</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Please use the property name as reference and upload proof of payment.
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMakePayment}
                  disabled={loading || !paymentMethod || (paymentMethod === 'mpesa' && !phoneNumber.trim())}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Pay KES ${depositAmount.toLocaleString()}`
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
            <span className="text-sm font-medium text-green-800">Deposit Paid Successfully</span>
          </div>
          <div className="bg-white border border-green-200 rounded-lg p-3">
            <div className="space-y-1 text-xs text-green-700">
              <p><strong>Amount:</strong> KES {depositAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> {paymentMethod === 'mpesa' ? 'M-Pesa' : 'Bank Transfer'}</p>
              <p><strong>Reference:</strong> {paymentReference}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> Verified & Confirmed</p>
            </div>
          </div>
          <p className="text-xs text-green-700">
            Your deposit has been received and verified. The property will now move to &quot;My Properties&quot; and the handover process will begin.
          </p>
        </div>
      )}
    </div>
  )
}
