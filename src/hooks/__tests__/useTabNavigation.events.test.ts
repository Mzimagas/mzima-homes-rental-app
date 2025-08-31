import { describe, it, expect, vi } from 'vitest'
import { useTabNavigation } from '../useTabNavigation'
import { renderHook, act } from '@testing-library/react'

describe('useTabNavigation - event flow', () => {
  it('dispatches navigateToTab and navigateToFinancial with payload', () => {
    const events: any[] = []
    vi.spyOn(window, 'dispatchEvent').mockImplementation((evt: Event) => {
      events.push(evt)
      return true
    })

    const { result } = renderHook(() => useTabNavigation())

    act(() => {
      result.current.navigateToFinancial({
        propertyId: 'p1',
        stageNumber: 3,
        action: 'pay',
        subtab: 'acquisition_costs',
        costTypeId: 'due_diligence',
        amount: 5000,
        date: '2025-01-01',
        description: 'Test',
        pipeline: 'purchase_pipeline',
        paymentType: 'acquisition_cost',
      })
    })

    const tabEvt = events.find(e => (e as CustomEvent).type === 'navigateToTab') as CustomEvent
    const finEvt = events.find(e => (e as CustomEvent).type === 'navigateToFinancial') as CustomEvent

    expect(tabEvt).toBeTruthy()
    expect(tabEvt.detail).toMatchObject({ propertyId: 'p1', tabName: 'financial' })
    expect(finEvt).toBeTruthy()
    expect(finEvt.detail).toMatchObject({ propertyId: 'p1', stageNumber: 3, subtab: 'acquisition_costs', costTypeId: 'due_diligence', amount: 5000 })
  })
})

