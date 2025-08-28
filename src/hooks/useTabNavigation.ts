import { useCallback } from 'react'

export interface TabNavigationOptions {
  propertyId: string
  stageNumber?: number
  paymentId?: string
  action?: 'view' | 'pay' | 'manage'
}

export const useTabNavigation = () => {
  // Navigate to financial tab with specific context
  const navigateToFinancial = useCallback((options: TabNavigationOptions) => {
    const { propertyId, stageNumber, paymentId, action = 'view' } = options

    // Create URL parameters for financial tab context
    const params = new URLSearchParams()
    if (stageNumber) params.set('stage', stageNumber.toString())
    if (paymentId) params.set('payment', paymentId)
    if (action) params.set('action', action)

    // Construct the financial tab URL
    const financialUrl = `/properties/${propertyId}/financial${params.toString() ? `?${params.toString()}` : ''}`

    // For now, we'll use a custom event to communicate with the parent component
    // In a real implementation, this would integrate with your routing system
    const navigationEvent = new CustomEvent('navigateToFinancial', {
      detail: {
        url: financialUrl,
        propertyId,
        stageNumber,
        paymentId,
        action,
        tabName: 'financial',
      },
    })

    window.dispatchEvent(navigationEvent)

    // Also try to find and click the financial tab if it exists
    const financialTab = document.querySelector('[data-tab="financial"]') as HTMLElement
    if (financialTab) {
      financialTab.click()
    }

    return financialUrl
  }, [])

  // Navigate to documents tab with specific stage
  const navigateToDocuments = useCallback((options: TabNavigationOptions) => {
    const { propertyId, stageNumber } = options

    const params = new URLSearchParams()
    if (stageNumber) params.set('stage', stageNumber.toString())

    const documentsUrl = `/properties/${propertyId}/documents${params.toString() ? `?${params.toString()}` : ''}`

    const navigationEvent = new CustomEvent('navigateToDocuments', {
      detail: {
        url: documentsUrl,
        propertyId,
        stageNumber,
        tabName: 'documents',
      },
    })

    window.dispatchEvent(navigationEvent)

    // Try to find and click the documents tab
    const documentsTab = document.querySelector('[data-tab="documents"]') as HTMLElement
    if (documentsTab) {
      documentsTab.click()
    }

    return documentsUrl
  }, [])

  // Navigate to specific payment processing
  const navigateToPayment = useCallback(
    (options: TabNavigationOptions & { amount?: number }) => {
      const { propertyId, stageNumber, paymentId, amount } = options

      // Navigate to financial tab with payment action
      const financialUrl = navigateToFinancial({
        propertyId,
        stageNumber,
        paymentId,
        action: 'pay',
      })

      // Additional payment-specific logic could go here
      // e.g., pre-fill payment forms, highlight specific payment

      return financialUrl
    },
    [navigateToFinancial]
  )

  // Get current tab context from URL or state
  const getCurrentTabContext = useCallback(() => {
    const url = new URL(window.location.href)
    const pathParts = url.pathname.split('/')

    // Extract property ID and current tab from URL
    const propertyIndex = pathParts.indexOf('properties')
    const propertyId = propertyIndex >= 0 ? pathParts[propertyIndex + 1] : null
    const currentTab = propertyIndex >= 0 ? pathParts[propertyIndex + 2] : null

    // Extract query parameters
    const stage = url.searchParams.get('stage')
    const payment = url.searchParams.get('payment')
    const action = url.searchParams.get('action')

    return {
      propertyId,
      currentTab,
      stageNumber: stage ? parseInt(stage) : undefined,
      paymentId: payment,
      action: action as 'view' | 'pay' | 'manage' | undefined,
    }
  }, [])

  return {
    navigateToFinancial,
    navigateToDocuments,
    navigateToPayment,
    getCurrentTabContext,
  }
}
