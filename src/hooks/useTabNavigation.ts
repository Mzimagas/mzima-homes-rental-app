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

    // Construct the financial tab URL - handle both property detail pages and inline views
    let financialUrl: string

    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname

      // If we're already on a specific property page, navigate to its financial tab
      if (currentPath.includes(`/properties/${propertyId}`)) {
        const basePath = currentPath.replace(/\/(documents|location|financial)$/, '')
        financialUrl = `${basePath}/financial${params.toString() ? `?${params.toString()}` : ''}`
      } else {
        // If we're on the properties list (purchase pipeline), stay on current page with params
        // The inline view will handle the tab switching via events
        financialUrl = `${currentPath}${params.toString() ? `?${params.toString()}` : ''}`
      }
    } else {
      // Server-side fallback - assume property detail page
      financialUrl = `/dashboard/properties/${propertyId}/financial${params.toString() ? `?${params.toString()}` : ''}`
    }

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

      // Enhanced tab finding with multiple strategies and retry logic
      const findAndClickFinancialTab = (attempt = 0) => {
        const maxAttempts = 3

        // Try multiple selectors in order of preference
        const selectors = [
          '[data-tab="financial"]',
          'button[data-tab="financial"]',
          '.tab-financial',
          'button[role="tab"][data-tab="financial"]'
        ]

        let financialTab: HTMLElement | null = null

        // Try direct selectors first
        for (const selector of selectors) {
          financialTab = document.querySelector(selector) as HTMLElement
          if (financialTab) break
        }

        // Fallback to text content search if direct selectors fail
        if (!financialTab) {
          const tabButtons = Array.from(document.querySelectorAll('button[role="tab"], button[data-tab], .tab-button, button'))
          financialTab = tabButtons.find((el) => {
            const text = el.textContent?.trim().toLowerCase() || ''
            return text.includes('financial') || text === 'financial'
          }) as HTMLElement
        }

        if (financialTab) {
          financialTab.click()
          return true
        } else if (attempt < maxAttempts) {
          // Retry after a short delay to handle dynamic content
          setTimeout(() => findAndClickFinancialTab(attempt + 1), 100)
        } else {
          // Debug: log available tabs if financial tab not found
          console.warn('Financial tab not found. Available tabs:',
            Array.from(document.querySelectorAll('button[data-tab], button[role="tab"]'))
              .map(el => ({
                selector: el.getAttribute('data-tab') || el.getAttribute('role'),
                text: el.textContent?.trim()
              }))
          )
        }
        return false
      }

      findAndClickFinancialTab()
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
