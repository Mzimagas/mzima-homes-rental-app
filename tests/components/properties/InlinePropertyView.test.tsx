import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import InlinePropertyView from '../../../src/components/properties/components/InlinePropertyView'
import { PropertyWithLifecycle } from '../../../src/components/properties/types/property-management.types'

// Mock the supabase client
jest.mock('../../../src/lib/supabase-client', () => ({
  __esModule: true,
  default: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'test-url' } })),
        createSignedUrl: jest.fn(() => Promise.resolve({ data: { signedUrl: 'test-signed-url' }, error: null }))
      }))
    },
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } }))
    }
  }
}))

// Mock ViewOnGoogleMapsButton
jest.mock('../../../src/components/location/ViewOnGoogleMapsButton', () => {
  return function MockViewOnGoogleMapsButton() {
    return <button>View on Google Maps</button>
  }
})

const mockProperty: PropertyWithLifecycle = {
  id: 'test-property-id',
  name: 'Test Property',
  physical_address: '123 Test Street',
  property_type: 'HOME',
  property_source: 'DIRECT_ADDITION',
  lifecycle_status: 'ACTIVE',
  total_area_acres: 2.5,
  expected_rental_income_kes: 50000,
  purchase_completion_date: '2023-01-15',
  subdivision_date: null,
  acquisition_notes: 'Test notes for the property',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

describe('InlinePropertyView', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders property details correctly', () => {
    render(<InlinePropertyView property={mockProperty} onClose={mockOnClose} />)
    
    expect(screen.getByText('Property Details')).toBeInTheDocument()
    expect(screen.getByText('Test Property')).toBeInTheDocument()
    expect(screen.getByText('123 Test Street')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('shows all tabs', () => {
    render(<InlinePropertyView property={mockProperty} onClose={mockOnClose} />)
    
    expect(screen.getByText('Basic Info')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Financial')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
  })

  it('switches between tabs correctly', () => {
    render(<InlinePropertyView property={mockProperty} onClose={mockOnClose} />)
    
    // Click on Location tab
    fireEvent.click(screen.getByText('Location'))
    expect(screen.getByText('Coordinates')).toBeInTheDocument()
    
    // Click on Financial tab
    fireEvent.click(screen.getByText('Financial'))
    expect(screen.getByText('Expected Monthly Rent')).toBeInTheDocument()
    
    // Click on Documents tab
    fireEvent.click(screen.getByText('Documents'))
    expect(screen.getByText('Property Documents')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<InlinePropertyView property={mockProperty} onClose={mockOnClose} />)
    
    fireEvent.click(screen.getByText('✕ Close'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('displays property area and financial information', () => {
    render(<InlinePropertyView property={mockProperty} onClose={mockOnClose} />)
    
    expect(screen.getByText('2.5 acres')).toBeInTheDocument()
    
    // Switch to financial tab
    fireEvent.click(screen.getByText('Financial'))
    expect(screen.getByText('KES 50,000')).toBeInTheDocument()
  })

  it('shows acquisition notes when available', () => {
    render(<InlinePropertyView property={mockProperty} onClose={mockOnClose} />)
    
    expect(screen.getByText('Test notes for the property')).toBeInTheDocument()
  })

  it('displays purchase and subdivision dates when available', () => {
    render(<InlinePropertyView property={mockProperty} onClose={mockOnClose} />)
    
    expect(screen.getByText('1/15/2023')).toBeInTheDocument() // Purchase date
  })
})
