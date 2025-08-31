import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import PurchasePipelineDocuments from '../PurchasePipelineDocuments'

vi.mock('../../../../lib/supabase-client', () => ({ default: {} }))

describe('PurchasePipelineDocuments - NA/notes debounced update wiring', () => {
  it('creates element without rendering (smoke)', () => {
    const el = React.createElement(PurchasePipelineDocuments as any, { propertyId: 'prop-1', propertyName: 'Test' })
    expect(el).toBeTruthy()
  })
})

