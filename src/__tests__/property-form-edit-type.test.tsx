import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PropertyForm from '../components/properties/property-form'

// Create a focused mock for this test so we can inspect update payload
jest.mock('../lib/supabase-client', () => {
  const updateMock = jest.fn().mockReturnThis()
  const eqMock = jest.fn().mockReturnThis()
  const selectMock = jest.fn().mockReturnThis()
  const singleMock = jest.fn().mockResolvedValue({ data: { id: 'prop-1' }, error: null })
  const fromMock = jest.fn(() => ({
    update: updateMock,
    eq: eqMock,
    select: selectMock,
    single: singleMock,
  }))

  return {
    __esModule: true,
    default: {
      from: fromMock,
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
    },
    // Re-export helper for error handling if used
    handleSupabaseError: (e: any) => e?.message || 'error',
  }
})

// Access the mocked module types
import supabase from '../lib/supabase-client'

describe('PropertyForm editing property_type', () => {
  test('allows changing property_type and includes it in update payload', async () => {
    const property = {
      id: 'prop-1',
      name: 'Test Property',
      physical_address: '123 Test St',
      property_type: 'HOME',
    }

    render(
      <PropertyForm isOpen={true} property={property} onCancel={() => {}} />
    )

    // Ensure the select is enabled and change it
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeEnabled()

    fireEvent.change(select, { target: { value: 'RESIDENTIAL_LAND' } })
    expect(select.value).toBe('RESIDENTIAL_LAND')

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /update property/i })
    fireEvent.click(submitBtn)

    // Wait for update to be called
    const fromMock = (supabase.from as unknown as jest.Mock)
    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('properties'))

    const updateFn = fromMock.mock.results[0].value.update as jest.Mock
    expect(updateFn).toHaveBeenCalled()

    const payload = updateFn.mock.calls[0][0]
    expect(payload).toMatchObject({ property_type: 'RESIDENTIAL_LAND' })
  })

  test('shows a warning when switching between rental and land categories', async () => {
    const property = {
      id: 'prop-2',
      name: 'Another Property',
      physical_address: '456 Test Ave',
      property_type: 'HOME',
    }

    render(
      <PropertyForm isOpen={true} property={property} onCancel={() => {}} />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'RESIDENTIAL_LAND' } })

    // Warning text should appear
    expect(
      await screen.findByText(/Changing between rental and land types can affect existing units and tenants/i)
    ).toBeInTheDocument()
  })
})

