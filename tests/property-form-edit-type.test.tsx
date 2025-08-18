// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock AddressAutocomplete to a simple input to avoid external deps
vi.mock('../src/components/location/AddressAutocomplete', () => ({
  default: (props: any) => (
    <input aria-label="address" value={props.value || ''} onChange={(e) => props.onChange?.(e.target.value)} />
  ),
}))

// Mock global fetch to capture API calls
const fetchMock = vi.fn()
global.fetch = fetchMock

// Mock supabase client to capture update payload (define inside factory to avoid hoist issues)
vi.mock('../src/lib/supabase-client', () => {
  const updateMock = vi.fn().mockReturnThis()
  const eqMock = vi.fn().mockReturnThis()
  const selectMock = vi.fn().mockReturnThis()
  const singleMock = vi.fn().mockResolvedValue({ data: { id: 'prop-1' }, error: null })
  const fromMock = vi.fn(() => ({ update: updateMock, eq: eqMock, select: selectMock, single: singleMock }))
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

  return {
    default: {
      from: fromMock,
      auth: { getUser },
    },
    handleSupabaseError: (e: any) => e?.message || 'error',
    __test_doubles: { fromMock, updateMock },
  }
})

import PropertyForm from '../src/components/properties/property-form'
import * as supabaseModule from '../src/lib/supabase-client'

const doubles = (supabaseModule as any).__test_doubles


describe('PropertyForm editing property_type', () => {
  it('allows changing property_type and includes it in update payload', async () => {
    // Mock successful API response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'prop-1', property_type: 'RESIDENTIAL_LAND' }),
    })
    const property = {
      id: 'prop-1',
      name: 'Test Property',
      physical_address: '123 Test St',
      property_type: 'HOME',
      lat: -1.2921,
      lng: 36.8219,
    }

    render(<PropertyForm isOpen={true} property={property} onCancel={() => {}} />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeEnabled()

    fireEvent.change(select, { target: { value: 'RESIDENTIAL_LAND' } })
    expect(select.value).toBe('RESIDENTIAL_LAND')

    const submitBtn = screen.getByRole('button', { name: /update property/i })
    fireEvent.click(submitBtn)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(fetchMock).toHaveBeenCalledWith('/api/properties/prop-1', expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
      body: expect.stringContaining('"property_type":"RESIDENTIAL_LAND"'),
    }))
  })

  it('shows a warning when switching between rental and land categories', async () => {
    const property = {
      id: 'prop-2',
      name: 'Another Property',
      physical_address: '456 Test Ave',
      property_type: 'HOME',
      lat: -1.2921,
      lng: 36.8219,
    }

    render(<PropertyForm isOpen={true} property={property} onCancel={() => {}} />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'RESIDENTIAL_LAND' } })

    expect(
      await screen.findByText(/Changing between rental and land types can affect existing units and tenants/i)
    ).toBeInTheDocument()
  })
})

