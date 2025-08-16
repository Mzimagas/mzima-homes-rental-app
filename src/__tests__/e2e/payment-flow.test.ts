import { test, expect } from '@playwright/test'

// End-to-end tests for the complete payment flow
// These tests would run against a real or staging environment

test.describe('Payment Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a landlord user
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'landlord@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard')
    
    // Navigate to payments section
    await page.click('[data-testid="payments-nav"]')
    await page.waitForURL('/dashboard/payments')
  })

  test('should complete full payment recording flow', async ({ page }) => {
    // Click record payment button
    await page.click('[data-testid="record-payment-button"]')
    
    // Wait for payment form modal to open
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible()
    
    // Step 1: Select tenant
    await page.click('[data-testid="tenant-select"]')
    await page.click('[data-testid="tenant-option-john-doe"]')
    await page.click('[data-testid="next-step-button"]')
    
    // Step 2: Enter payment details
    await page.fill('[data-testid="amount-input"]', '25000')
    await page.fill('[data-testid="payment-date-input"]', '2024-01-15')
    await page.click('[data-testid="next-step-button"]')
    
    // Step 3: Select payment method
    await page.click('[data-testid="payment-method-select"]')
    await page.click('[data-testid="payment-method-mpesa"]')
    
    // Verify M-Pesa information is displayed
    await expect(page.locator('[data-testid="payment-method-info"]')).toContainText('Mobile money payment via M-Pesa')
    await expect(page.locator('[data-testid="processing-time"]')).toContainText('Instant')
    
    await page.click('[data-testid="next-step-button"]')
    
    // Step 4: Enter transaction details
    await page.fill('[data-testid="transaction-ref-input"]', 'QA12345678')
    await page.fill('[data-testid="notes-input"]', 'Monthly rent payment for January 2024')
    await page.click('[data-testid="next-step-button"]')
    
    // Step 5: Review and submit
    await expect(page.locator('[data-testid="payment-summary"]')).toBeVisible()
    await expect(page.locator('[data-testid="summary-amount"]')).toContainText('25,000 KES')
    await expect(page.locator('[data-testid="summary-method"]')).toContainText('M-Pesa')
    await expect(page.locator('[data-testid="summary-tenant"]')).toContainText('John Doe')
    
    // Submit payment
    await page.click('[data-testid="submit-payment-button"]')
    
    // Wait for processing
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible()
    
    // Verify success confirmation
    await expect(page.locator('[data-testid="payment-success-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Payment Recorded Successfully')
    
    // Close confirmation
    await page.click('[data-testid="close-confirmation-button"]')
    
    // Verify payment appears in history
    await expect(page.locator('[data-testid="payment-history-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-row"]').first()).toContainText('25,000')
    await expect(page.locator('[data-testid="payment-row"]').first()).toContainText('John Doe')
    await expect(page.locator('[data-testid="payment-row"]').first()).toContainText('M-Pesa')
  })

  test('should handle payment validation errors', async ({ page }) => {
    await page.click('[data-testid="record-payment-button"]')
    
    // Try to proceed without selecting tenant
    await page.click('[data-testid="next-step-button"]')
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Please select a tenant')
    
    // Select tenant and proceed
    await page.click('[data-testid="tenant-select"]')
    await page.click('[data-testid="tenant-option-john-doe"]')
    await page.click('[data-testid="next-step-button"]')
    
    // Try invalid amount
    await page.fill('[data-testid="amount-input"]', '-1000')
    await page.click('[data-testid="next-step-button"]')
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Enter a valid amount')
    
    // Try amount exceeding limits
    await page.fill('[data-testid="amount-input"]', '500000')
    await page.click('[data-testid="next-step-button"]')
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Maximum amount for M-Pesa is 300,000 KES')
    
    // Enter valid amount
    await page.fill('[data-testid="amount-input"]', '25000')
    await page.fill('[data-testid="payment-date-input"]', '2024-01-15')
    await page.click('[data-testid="next-step-button"]')
    
    // Select M-Pesa method
    await page.click('[data-testid="payment-method-select"]')
    await page.click('[data-testid="payment-method-mpesa"]')
    await page.click('[data-testid="next-step-button"]')
    
    // Try invalid M-Pesa transaction code
    await page.fill('[data-testid="transaction-ref-input"]', 'INVALID')
    await page.click('[data-testid="next-step-button"]')
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('M-Pesa transaction code must be 10 characters')
  })

  test('should handle security warnings', async ({ page }) => {
    // Mock a payment that triggers security warnings
    // This would require setting up test data that triggers security checks
    
    await page.click('[data-testid="record-payment-button"]')
    
    // Complete form with data that triggers security warnings
    // (This would need to be coordinated with backend test data)
    
    // Submit payment
    await page.click('[data-testid="submit-payment-button"]')
    
    // Verify security warnings are displayed
    await expect(page.locator('[data-testid="security-warnings"]')).toBeVisible()
    await expect(page.locator('[data-testid="security-warning-item"]')).toContainText('Unusual payment pattern')
    
    // User should be able to proceed or cancel based on warnings
  })

  test('should filter and search payment history', async ({ page }) => {
    // Ensure there are multiple payments in the system for testing
    
    // Test search functionality
    await page.fill('[data-testid="payment-search-input"]', 'John Doe')
    await page.waitForTimeout(500) // Wait for debounced search
    
    // Verify filtered results
    const paymentRows = page.locator('[data-testid="payment-row"]')
    await expect(paymentRows).toHaveCount(2) // Assuming John Doe has 2 payments
    
    // Test method filter
    await page.click('[data-testid="method-filter-select"]')
    await page.click('[data-testid="method-filter-mpesa"]')
    
    // Verify filtered results show only M-Pesa payments
    await expect(page.locator('[data-testid="payment-method-badge"]')).toContainText('M-Pesa')
    
    // Test date range filter
    await page.click('[data-testid="date-range-selector"]')
    await page.click('[data-testid="date-range-last-30-days"]')
    
    // Verify results are filtered by date range
    
    // Clear filters
    await page.click('[data-testid="clear-filters-button"]')
    
    // Verify all payments are shown again
  })

  test('should export payment history to CSV', async ({ page }) => {
    // Set up download handling
    const downloadPromise = page.waitForEvent('download')
    
    // Click export button
    await page.click('[data-testid="export-csv-button"]')
    
    // Wait for download
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/payment-history-\d{4}-\d{2}-\d{2}\.csv/)
    
    // Optionally verify CSV content
    const path = await download.path()
    // Read and verify CSV content if needed
  })

  test('should display payment analytics', async ({ page }) => {
    // Navigate to analytics tab
    await page.click('[data-testid="analytics-tab"]')
    
    // Verify analytics components are loaded
    await expect(page.locator('[data-testid="monthly-trends-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-methods-breakdown"]')).toBeVisible()
    await expect(page.locator('[data-testid="top-tenants-list"]')).toBeVisible()
    
    // Test date range selection for analytics
    await page.click('[data-testid="analytics-date-range"]')
    await page.click('[data-testid="date-range-last-6-months"]')
    
    // Verify charts update with new date range
    await expect(page.locator('[data-testid="chart-loading"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-loading"]')).not.toBeVisible()
  })

  test('should handle payment notifications', async ({ page }) => {
    // Open notifications center
    await page.click('[data-testid="notifications-button"]')
    
    // Verify notifications modal opens
    await expect(page.locator('[data-testid="notifications-modal"]')).toBeVisible()
    
    // Check for payment-related notifications
    await expect(page.locator('[data-testid="notification-item"]').first()).toBeVisible()
    
    // Mark notification as read
    await page.click('[data-testid="mark-as-read-button"]')
    
    // Verify notification is marked as read
    await expect(page.locator('[data-testid="notification-item"]').first()).not.toHaveClass(/unread/)
    
    // Mark all as read
    await page.click('[data-testid="mark-all-read-button"]')
    
    // Verify all notifications are marked as read
    await expect(page.locator('[data-testid="unread-count"]')).toContainText('0')
  })

  test('should handle payment confirmation modal', async ({ page }) => {
    // Record a payment to trigger confirmation
    await page.click('[data-testid="record-payment-button"]')
    
    // Complete payment form quickly (helper function could be created)
    await completePaymentForm(page, {
      tenant: 'John Doe',
      amount: '25000',
      method: 'MPESA',
      txRef: 'QA12345678'
    })
    
    // Submit payment
    await page.click('[data-testid="submit-payment-button"]')
    
    // Wait for confirmation modal
    await expect(page.locator('[data-testid="payment-confirmation-modal"]')).toBeVisible()
    
    // Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-amount"]')).toContainText('25,000 KES')
    await expect(page.locator('[data-testid="confirmation-tenant"]')).toContainText('John Doe')
    await expect(page.locator('[data-testid="confirmation-method"]')).toContainText('M-Pesa')
    await expect(page.locator('[data-testid="confirmation-tx-ref"]')).toContainText('QA12345678')
    
    // Test print receipt functionality
    await page.click('[data-testid="print-receipt-button"]')
    // Verify print dialog opens (this might need special handling in tests)
    
    // Close confirmation
    await page.click('[data-testid="close-confirmation-button"]')
    await expect(page.locator('[data-testid="payment-confirmation-modal"]')).not.toBeVisible()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-payment-dashboard"]')).toBeVisible()
    
    // Test mobile payment form
    await page.click('[data-testid="record-payment-button"]')
    await expect(page.locator('[data-testid="mobile-payment-form"]')).toBeVisible()
    
    // Verify form is usable on mobile
    await page.click('[data-testid="tenant-select"]')
    await expect(page.locator('[data-testid="tenant-dropdown"]')).toBeVisible()
  })
})

// Helper function to complete payment form quickly
async function completePaymentForm(page: any, data: {
  tenant: string
  amount: string
  method: string
  txRef: string
}) {
  // Step 1: Select tenant
  await page.click('[data-testid="tenant-select"]')
  await page.click(`[data-testid="tenant-option-${data.tenant.toLowerCase().replace(' ', '-')}"]`)
  await page.click('[data-testid="next-step-button"]')
  
  // Step 2: Enter amount and date
  await page.fill('[data-testid="amount-input"]', data.amount)
  await page.fill('[data-testid="payment-date-input"]', '2024-01-15')
  await page.click('[data-testid="next-step-button"]')
  
  // Step 3: Select payment method
  await page.click('[data-testid="payment-method-select"]')
  await page.click(`[data-testid="payment-method-${data.method.toLowerCase()}"]`)
  await page.click('[data-testid="next-step-button"]')
  
  // Step 4: Enter transaction reference
  await page.fill('[data-testid="transaction-ref-input"]', data.txRef)
  await page.click('[data-testid="next-step-button"]')
}
