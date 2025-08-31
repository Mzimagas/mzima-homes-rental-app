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
  pipeline?: 'direct_addition' | 'purchase_pipeline' | 'handover'
  paymentType?: 'deposit' | 'installment' | 'fee' | 'tax' | 'acquisition_cost'
}

export const useTabNavigation = () => {
  // Event-driven navigation to financial tab (no DOM scraping)
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

    // Build URL parameters for form prefilling and deep-linking
    const params = new URLSearchParams()
    if (stageNumber) params.set('stage', stageNumber.toString())
    if (action) params.set('action', action)
    if (subtab) params.set('subtab', subtab)
    if (costTypeId) params.set('cost_type_id', costTypeId)
    if (typeof amount === 'number') params.set('amount_kes', amount.toString())
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

    // 1) Ask parent to switch to the Financial tab
    const navTabDetail = { propertyId, tabName: 'financial' as const }
    console.log('🔔 useTabNavigation: dispatch navigateToTab', navTabDetail)
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: navTabDetail }))

    // 2) Send financial prefill payload with delay to ensure component is mounted
    const finDetail = {
      propertyId,
      stageNumber,
      action,
      subtab,
      costTypeId,
      amount,
      date,
      description,
      pipeline,
      paymentType,
      tabName: 'financial' as const,
    }
    setTimeout(() => {
      console.log('🔔 useTabNavigation: dispatch navigateToFinancial', finDetail)
      window.dispatchEvent(new CustomEvent('navigateToFinancial', { detail: finDetail }))
    }, 200)

    return currentUrl.toString()
  }, [])

  // Navigate to documents tab with specific stage (event-driven)
  const navigateToDocuments = useCallback((options: TabNavigationOptions) => {
    const { propertyId, stageNumber } = options

    const params = new URLSearchParams()
    if (stageNumber) params.set('stage', stageNumber.toString())

    // Update URL for consistency
    const currentUrl = new URL(window.location.href)
    params.forEach((value, key) => {
      currentUrl.searchParams.set(key, value)
    })
    window.history.replaceState({}, '', currentUrl.toString())

    // Dispatch tab navigation event
    window.dispatchEvent(
      new CustomEvent('navigateToTab', {
        detail: { propertyId, tabName: 'documents' }
      })
    )

    return `/properties/${propertyId}/documents${params.toString() ? `?${params.toString()}` : ''}`
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