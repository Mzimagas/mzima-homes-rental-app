import { useCallback } from 'react'

export interface TabNavigationOptions {
  propertyId: string
  stageNumber?: number
  paymentId?: string
  action?: 'view' | 'pay' | 'manage'
  subtab?: 'acquisition_costs' | 'payments' | string
  costTypeId?: string
  amount?: number
  date?: string
  description?: string
  pipeline?: 'direct_addition' | 'purchase_pipeline'
  paymentType?: 'deposit' | 'installment' | 'fee' | 'tax' | 'acquisition_cost'
}

export const useTabNavigation = () => {
  // Simple, direct navigation to financial tab
  const navigateToFinancial = useCallback((options: TabNavigationOptions) => {
    const {
      propertyId,
      stageNumber,
      action = 'view',
      subtab,
      costTypeId,
      amount,
      date,
      description,
      pipeline,
      paymentType,
    } = options

    console.log('🚀 Starting financial navigation for property:', propertyId)

    // Build URL parameters for form prefilling
    const params = new URLSearchParams()
    if (stageNumber) params.set('stage', stageNumber.toString())
    if (action) params.set('action', action)
    if (subtab) params.set('subtab', subtab)
    if (costTypeId) params.set('cost_type_id', costTypeId)
    if (amount) params.set('amount_kes', amount.toString())
    if (date) params.set('payment_date', date)
    if (description) params.set('notes', description)
    if (pipeline) params.set('pipeline', pipeline)
    if (paymentType) params.set('payment_type', paymentType)

    // Update URL with parameters for form prefilling
    const currentUrl = new URL(window.location.href)
    params.forEach((value, key) => {
      currentUrl.searchParams.set(key, value)
    })
    window.history.replaceState({}, '', currentUrl.toString())
    console.log('📝 Updated URL with parameters:', currentUrl.toString())

    // Navigation strategy: Direct DOM manipulation with clear steps
    const executeNavigation = () => {
      console.log('🔍 Looking for purchase item with ID:', propertyId)

      // Step 1: Find and open purchase details if not already open
      let detailsOpened = false

      // Look for existing financial tab first
      let financialTab = document.querySelector('[data-tab="financial"]') as HTMLElement

      if (!financialTab) {
        console.log('💡 Financial tab not found, looking for purchase details button...')

        // Try to find the specific purchase details button using data attribute
        const detailsButton = document.querySelector(`[data-purchase-details-btn="${propertyId}"]`) as HTMLElement

        if (detailsButton) {
          console.log('🎯 Found specific details button for property, clicking...')
          detailsButton.click()
          detailsOpened = true
        } else {
          console.log('⚠️ Specific details button not found, trying generic approach...')

          // Fallback: Find any "View Details" button
          const allButtons = Array.from(document.querySelectorAll('button'))
          const genericDetailsButton = allButtons.find(btn =>
            btn.textContent?.includes('View Details') &&
            !btn.textContent?.includes('Hide Details')
          ) as HTMLElement

          if (genericDetailsButton) {
            console.log('🎯 Found generic details button, clicking...')
            genericDetailsButton.click()
            detailsOpened = true
          }
        }
      }

      // Step 2: Wait for details to load and find financial tab
      const findAndClickFinancialTab = (attempt = 0) => {
        const maxAttempts = 10

        financialTab = document.querySelector('[data-tab="financial"]') as HTMLElement

        if (financialTab) {
          console.log('✅ Found financial tab, clicking...')
          financialTab.click()
          console.log('🎉 Successfully navigated to financial tab!')
          return true
        }

        if (attempt < maxAttempts) {
          console.log(`⏳ Attempt ${attempt + 1}/${maxAttempts}: Financial tab not found, retrying...`)
          setTimeout(() => findAndClickFinancialTab(attempt + 1), 300)
        } else {
          console.error('❌ Failed to find financial tab after', maxAttempts, 'attempts')
          console.log('🔍 Available elements:', {
            allButtons: Array.from(document.querySelectorAll('button')).map(b => ({
              text: b.textContent?.trim(),
              dataTab: b.getAttribute('data-tab'),
              classes: b.className
            })),
            allDataTabs: Array.from(document.querySelectorAll('[data-tab]')).map(el => ({
              dataTab: el.getAttribute('data-tab'),
              text: el.textContent?.trim()
            }))
          })
        }

        return false
      }

      // Start looking for financial tab
      if (detailsOpened) {
        // Wait a bit for the details to load
        setTimeout(() => findAndClickFinancialTab(), 500)
      } else {
        // Try immediately if details were already open
        findAndClickFinancialTab()
      }
    }

    // Execute navigation
    executeNavigation()

    return currentUrl.toString()
  }, [])

  // Navigate to documents tab with specific stage
  const navigateToDocuments = useCallback((options: TabNavigationOptions) => {
    const { propertyId, stageNumber } = options

    const params = new URLSearchParams()
    if (stageNumber) params.set('stage', stageNumber.toString())

    const documentsUrl = `/properties/${propertyId}/documents${params.toString() ? `?${params.toString()}` : ''}`

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

      return financialUrl
    },
    [navigateToFinancial]
  )

  return {
    navigateToFinancial,
    navigateToDocuments,
    navigateToPayment,
  }
}