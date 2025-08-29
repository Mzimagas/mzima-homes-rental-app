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

      // Step 1: Check if financial tab is already available
      let financialTab = document.querySelector('[data-tab="financial"]') as HTMLElement

      if (financialTab) {
        console.log('✅ Financial tab already available, clicking...')
        financialTab.click()
        console.log('🎉 Successfully navigated to financial tab!')
        return
      }

      // Step 2: Find and open purchase details if not already open
      console.log('💡 Financial tab not found, looking for purchase details button...')

      const openDetailsAndNavigate = (attempt = 0) => {
        const maxAttempts = 15

        // Try to find the specific purchase details button using data attribute
        let detailsButton = document.querySelector(`[data-purchase-details-btn="${propertyId}"]`) as HTMLElement

        if (!detailsButton) {
          // Fallback: Find any "View Details" button that's not "Hide Details"
          const allButtons = Array.from(document.querySelectorAll('button'))
          detailsButton = allButtons.find(btn =>
            btn.textContent?.includes('View Details') &&
            !btn.textContent?.includes('Hide Details')
          ) as HTMLElement
        }

        if (detailsButton) {
          console.log('🎯 Found details button, clicking...')
          detailsButton.click()

          // Wait for details to load, then look for financial tab
          setTimeout(() => {
            financialTab = document.querySelector('[data-tab="financial"]') as HTMLElement

            if (financialTab) {
              console.log('✅ Found financial tab after opening details, clicking...')
              financialTab.click()
              console.log('🎉 Successfully navigated to financial tab!')
            } else if (attempt < maxAttempts) {
              console.log(`⏳ Attempt ${attempt + 1}/${maxAttempts}: Financial tab still not found, retrying...`)
              openDetailsAndNavigate(attempt + 1)
            } else {
              console.error('❌ Failed to find financial tab after', maxAttempts, 'attempts')
              console.log('🔍 Available elements after opening details:', {
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
          }, 400)
        } else if (attempt < maxAttempts) {
          console.log(`⏳ Attempt ${attempt + 1}/${maxAttempts}: Details button not found, retrying...`)
          setTimeout(() => openDetailsAndNavigate(attempt + 1), 200)
        } else {
          console.error('❌ Failed to find details button after', maxAttempts, 'attempts')
          console.log('🔍 Available buttons:',
            Array.from(document.querySelectorAll('button')).map(b => ({
              text: b.textContent?.trim(),
              attributes: Array.from(b.attributes).map(attr => `${attr.name}="${attr.value}"`),
              classes: b.className
            }))
          )
        }
      }

      // Start the process
      openDetailsAndNavigate()
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