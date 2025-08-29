import { useCallback } from 'react'

export interface TabNavigationOptions {
  propertyId: string
  stageNumber?: number
  paymentId?: string
  action?: 'view' | 'pay' | 'manage'
  // Optional prefill fields for financial forms
  subtab?: 'acquisition_costs' | 'payments' | string
  costTypeId?: string
  amount?: number
  date?: string // ISO date (YYYY-MM-DD)
  description?: string
  // Pipeline context for better navigation
  pipeline?: 'direct_addition' | 'purchase_pipeline'
  // Payment type for better categorization
  paymentType?: 'deposit' | 'installment' | 'fee' | 'tax' | 'acquisition_cost'
}

export const useTabNavigation = () => {
  // Navigate to financial tab with specific context
  const navigateToFinancial = useCallback((options: TabNavigationOptions) => {
    const {
      propertyId,
      stageNumber,
      paymentId,
      action = 'view',
      subtab,
      costTypeId,
      amount,
      date,
      description,
      pipeline,
      paymentType,
    } = options

    // Create URL parameters for financial tab context
    const params = new URLSearchParams()
    if (stageNumber) params.set('stage', stageNumber.toString())
    if (paymentId) params.set('payment', paymentId)
    if (action) params.set('action', action)
    if (pipeline) params.set('pipeline', pipeline)
    if (paymentType) params.set('payment_type', paymentType)

    // Prefill parameters for acquisition costs/payment forms
    if (subtab) params.set('subtab', subtab)
    if (costTypeId) params.set('cost_type_id', costTypeId)

    // Handle different amount parameter names based on subtab
    if (typeof amount === 'number') {
      if (subtab === 'payments') {
        params.set('payment_amount_kes', String(amount))
      } else {
        params.set('amount_kes', String(amount))
      }
    }

    if (date) params.set('payment_date', date)

    // Handle different description parameter names based on subtab
    if (description) {
      if (subtab === 'payments') {
        params.set('payment_notes', description)
      } else {
        params.set('notes', description)
      }
    }

    // Construct the financial tab URL (preserve current path and ensure property ID is included)
    let basePath =
      typeof window !== 'undefined' ? window.location.pathname : '/dashboard/properties'

    // Ensure the path includes the property ID and financial tab
    if (!basePath.includes(propertyId)) {
      basePath = `/dashboard/properties/${propertyId}`
    }

    // Ensure the path ends with /financial for the financial tab
    if (!basePath.endsWith('/financial')) {
      basePath = basePath.replace(/\/(documents|location|financial)$/, '') + '/financial'
    }

    const financialUrl = `${basePath}${params.toString() ? `?${params.toString()}` : ''}`

    // Optimized navigation: batch DOM operations and reduce event overhead
    const navigationEvent = new CustomEvent('navigateToFinancial', {
      detail: {
        url: financialUrl,
        propertyId,
        stageNumber,
        paymentId,
        action,
        subtab,
        costTypeId,
        amount,
        date,
        description,
        tabName: 'financial',
      },
    })

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      // Dispatch event first - this will trigger the InlinePropertyView listener
      window.dispatchEvent(navigationEvent)

      // Update URL parameters without changing the path (for form prefilling)
      try {
        const currentUrl = new URL(window.location.href)
        // Only update query parameters, keep the current path
        params.forEach((value, key) => {
          currentUrl.searchParams.set(key, value)
        })
        window.history.replaceState({}, '', currentUrl.toString())
      } catch {}

      // Find and click tab efficiently - try multiple selectors
      const financialTab =
        (document.querySelector('[data-tab="financial"]') as HTMLElement) ||
        (document.querySelector('.tab-financial') as HTMLElement) ||
        (Array.from(document.querySelectorAll('button[role="tab"]')).find((el) =>
          el.textContent?.trim().toLowerCase().includes('financial')
        ) as HTMLElement)

      if (financialTab) {
        financialTab.click()
      }
    })

    // Return the current URL with updated parameters
    try {
      const currentUrl = new URL(window.location.href)
      params.forEach((value, key) => {
        currentUrl.searchParams.set(key, value)
      })
      return currentUrl.toString()
    } catch {
      return financialUrl
    }
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
