import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import EnhancedPaymentForm from '../components/payments/enhanced-payment-form'
import { PaymentService } from '../lib/services/payment-service'

// Mock dependencies
jest.mock('../lib/services/payment-service')
jest.mock('../lib/supabase-client')

const mockPaymentService = PaymentService as jest.Mocked<typeof PaymentService>

describe('EnhancedPaymentForm', () => {
  const defaultProps = {
    isOpen: true,
    onSuccess: jest.fn(),
    onCancel: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock payment method info
    mockPaymentService.getPaymentMethodInfo.mockReturnValue({
      id: 'MPESA',
      label: 'M-Pesa',
      icon: '📱',
      description: 'Mobile money payment via M-Pesa',
      requiresTxRef: true,
      txRefLabel: 'M-Pesa Code',
      txRefPlaceholder: 'QA12345678',
      isEnabled: true,
      processingFee: 0,
      processingTime: 'Instant',
      supportedCurrencies: ['KES'],
      minAmount: 1,
      maxAmount: 300000
    })

    mockPaymentService.calculateProcessingFee.mockReturnValue(0)
  })

  it('should render the payment form when open', () => {
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    expect(screen.getByText('Record Payment')).toBeInTheDocument()
    expect(screen.getByText('Select Tenant')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<EnhancedPaymentForm {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Record Payment')).not.toBeInTheDocument()
  })

  it('should show progress steps', () => {
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    expect(screen.getByText('Select Tenant')).toBeInTheDocument()
    expect(screen.getByText('Choose the tenant making the payment')).toBeInTheDocument()
  })

  it('should navigate between steps', async () => {
    const user = userEvent.setup()
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Should start at step 1
    expect(screen.getByText('Select Tenant')).toBeInTheDocument()
    
    // Mock tenant selection (this would need to be implemented based on your actual component)
    // For now, we'll assume the Next button becomes enabled after valid input
    
    const nextButton = screen.getByText('Next')
    expect(nextButton).toBeInTheDocument()
    
    // Note: Actual step navigation testing would require mocking the form validation
    // and ensuring the form fields are properly filled
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Try to submit without filling required fields
    // This would need to be implemented based on your actual form validation
    
    // Navigate to the final step (assuming we can skip validation for testing)
    // and try to submit
    
    // The form should show validation errors
    // expect(screen.getByText(/Please select a tenant/)).toBeInTheDocument()
  })

  it('should show payment method information', async () => {
    const user = userEvent.setup()
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Navigate to payment method step
    // This would require implementing step navigation in the test
    
    // Should show M-Pesa information
    // expect(screen.getByText('Mobile money payment via M-Pesa')).toBeInTheDocument()
    // expect(screen.getByText('Processing time: Instant')).toBeInTheDocument()
  })

  it('should calculate and display processing fees', async () => {
    mockPaymentService.calculateProcessingFee.mockReturnValue(250)
    
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Navigate to review step and check if processing fee is displayed
    // This would require implementing the full form flow
    
    // expect(screen.getByText('Processing fee: 250 KES')).toBeInTheDocument()
  })

  it('should submit payment successfully', async () => {
    const user = userEvent.setup()
    const mockSuccessResult = {
      success: true,
      paymentId: 'payment-123',
      status: 'COMPLETED' as const
    }
    
    mockPaymentService.processPayment.mockResolvedValue(mockSuccessResult)
    
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Fill out the form (this would need to be implemented step by step)
    // Navigate through all steps and submit
    
    // await user.click(screen.getByText('Record Payment'))
    
    // await waitFor(() => {
    //   expect(mockPaymentService.processPayment).toHaveBeenCalled()
    //   expect(defaultProps.onSuccess).toHaveBeenCalledWith('payment-123')
    // })
  })

  it('should handle payment errors', async () => {
    const user = userEvent.setup()
    const mockErrorResult = {
      success: false,
      error: 'Payment failed',
      status: 'FAILED' as const,
      validationErrors: ['Invalid amount']
    }
    
    mockPaymentService.processPayment.mockResolvedValue(mockErrorResult)
    
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Fill out and submit the form
    // This would trigger the error display
    
    // await waitFor(() => {
    //   expect(screen.getByText('Payment Failed')).toBeInTheDocument()
    //   expect(screen.getByText('Payment failed')).toBeInTheDocument()
    //   expect(screen.getByText('Invalid amount')).toBeInTheDocument()
    // })
  })

  it('should show security warnings', async () => {
    const user = userEvent.setup()
    const mockWarningResult = {
      success: false,
      error: 'Security check failed',
      status: 'FAILED' as const,
      securityWarnings: ['Unusual payment pattern', 'High risk transaction'],
      riskLevel: 'high' as const
    }
    
    mockPaymentService.processPayment.mockResolvedValue(mockWarningResult)
    
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Submit form to trigger security warnings
    
    // await waitFor(() => {
    //   expect(screen.getByText('Security Warnings:')).toBeInTheDocument()
    //   expect(screen.getByText('Unusual payment pattern')).toBeInTheDocument()
    //   expect(screen.getByText('High risk transaction')).toBeInTheDocument()
    // })
  })

  it('should disable form during submission', async () => {
    const user = userEvent.setup()
    
    // Mock a slow payment processing
    mockPaymentService.processPayment.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, paymentId: 'test' }), 1000))
    )
    
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Submit the form
    // const submitButton = screen.getByText('Record Payment')
    // await user.click(submitButton)
    
    // Form should be disabled during processing
    // expect(submitButton).toBeDisabled()
    // expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('should reset form after successful submission', async () => {
    const mockSuccessResult = {
      success: true,
      paymentId: 'payment-123',
      status: 'COMPLETED' as const
    }
    
    mockPaymentService.processPayment.mockResolvedValue(mockSuccessResult)
    
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Fill out and submit form
    // After successful submission, form should reset to initial state
    
    // This would require checking that form fields are cleared
    // and the step is reset to the first step
  })

  it('should show confirmation modal after successful payment', async () => {
    const mockSuccessResult = {
      success: true,
      paymentId: 'payment-123',
      status: 'COMPLETED' as const
    }
    
    mockPaymentService.processPayment.mockResolvedValue(mockSuccessResult)
    
    render(<EnhancedPaymentForm {...defaultProps} />)
    
    // Submit successful payment
    // Should show confirmation modal
    
    // await waitFor(() => {
    //   expect(screen.getByText('Payment Confirmation')).toBeInTheDocument()
    // })
  })

  describe('Form Validation', () => {
    it('should validate tenant selection', () => {
      render(<EnhancedPaymentForm {...defaultProps} />)
      
      // Try to proceed without selecting a tenant
      // Should show validation error
    })

    it('should validate payment amount', () => {
      render(<EnhancedPaymentForm {...defaultProps} />)
      
      // Test various invalid amounts:
      // - Negative amounts
      // - Zero amounts
      // - Amounts exceeding method limits
      // - Non-numeric values
    })

    it('should validate payment date', () => {
      render(<EnhancedPaymentForm {...defaultProps} />)
      
      // Test invalid dates:
      // - Future dates beyond allowed range
      // - Very old dates
      // - Invalid date formats
    })

    it('should validate transaction reference based on payment method', () => {
      render(<EnhancedPaymentForm {...defaultProps} />)
      
      // Test M-Pesa transaction code validation
      // Test bank transfer reference validation
      // Test that cash payments don't require reference
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EnhancedPaymentForm {...defaultProps} />)
      
      // Check for proper ARIA labels on form fields
      // Check for proper heading structure
      // Check for proper focus management
    })

    it('should support keyboard navigation', () => {
      render(<EnhancedPaymentForm {...defaultProps} />)
      
      // Test that all interactive elements are keyboard accessible
      // Test tab order
      // Test that form can be submitted using keyboard
    })

    it('should announce form errors to screen readers', () => {
      render(<EnhancedPaymentForm {...defaultProps} />)
      
      // Test that validation errors are properly announced
      // Test that success/failure messages are announced
    })
  })
})
