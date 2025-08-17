// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LandDetailsForm from '../src/components/properties/LandDetailsForm'

// No supabase imports in the form; it calls onSave prop; test that it wires values through

describe('LandDetailsForm', () => {
  it('renders with initial data and submits updates', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    render(
      <LandDetailsForm
        propertyId="prop-123"
        initialData={{
          totalAreaSqm: 4047,
          totalAreaAcres: 1,
          zoningClassification: 'Residential',
          electricityAvailable: true,
          waterAvailable: false,
        }}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    // Change a couple of fields
    const sqm = screen.getByLabelText(/Total Area \(Square Meters\)/i) as HTMLInputElement
    fireEvent.change(sqm, { target: { value: '8094' } })

    const zoning = screen.getByLabelText(/Zoning Classification/i) as HTMLSelectElement
    fireEvent.change(zoning, { target: { value: 'Commercial' } })

    // Submit
    const submit = screen.getByRole('button', { name: /save land details/i })
    fireEvent.click(submit)

    await waitFor(() => expect(onSave).toHaveBeenCalled())

    const payload = onSave.mock.calls[0][0]
    expect(payload.totalAreaSqm).toBe(8094)
    expect(payload.zoningClassification).toBe('Commercial')
  })
})

