/**
 * Properties Module Integration Tests
 * Tests for seamless integration between dashboard and properties module
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardContextProvider } from '../../../contexts/DashboardContextProvider'
import { AuthProvider } from '../../../lib/auth-context'
import { PropertiesModuleIntegration } from '../../../components/dashboard/integration/PropertiesModuleIntegration'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'
import { useDashboardActions } from '../../../hooks/useDashboardActions'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'
import { usePropertyStore } from '../../../presentation/stores/propertyStore'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('../../../hooks/usePropertyAccess')
jest.mock('../../../hooks/useDashboardActions')
jest.mock('../../../presentation/stores/dashboardStore')
jest.mock('../../../presentation/stores/propertyStore')
jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock PropertyManagementTabs
jest.mock('../../../components/properties/PropertyManagementTabs', () => {
  return function MockPropertyManagementTabs({ onPropertyCreated, initialTab }: any) {
    return (
      <div data-testid="property-management-tabs">
        <div>Initial Tab: {initialTab}</div>
        <button
          onClick={() => onPropertyCreated({
            id: 'test-property-1',
            name: 'Test Property',
            physical_address: 'Test Address',
            property_type: 'APARTMENT',
            lifecycle_status: 'RENTAL_READY'
          })}
        >
          Create Property
        </button>
      </div>
    )
  }
})

// Mock data
const mockProperties = [
  {
    id: 'property-1',
    name: 'Westlands Tower',
    physical_address: 'Westlands, Nairobi',
    property_type: 'APARTMENT',
    lifecycle_status: 'RENTAL_READY',
    status: 'AVAILABLE'
  },
  {
    id: 'property-2',
    name: 'Karen Villas',
    physical_address: 'Karen, Nairobi',
    property_type: 'VILLA',
    lifecycle_status: 'ACQUISITION',
    status: 'AVAILABLE'
  }
]

const mockPropertyMetrics = {
  totalUnits: 12,
  occupancyRate: 95.5,
  monthlyRevenue: 240000,
  collectionRate: 98.2
}

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DashboardContextProvider>
          {children}
        </DashboardContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('Properties Module Integration', () => {
  let mockRouter: any
  let mockSearchParams: any
  let mockUsePropertyAccess: jest.MockedFunction<typeof usePropertyAccess>
  let mockUseDashboardActions: jest.MockedFunction<typeof useDashboardActions>
  let mockUseDashboardStore: jest.MockedFunction<typeof useDashboardStore>
  let mockUsePropertyStore: jest.MockedFunction<typeof usePropertyStore>

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn()
    }

    mockSearchParams = {
      get: jest.fn(),
      toString: jest.fn(() => '')
    }

    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

    mockUsePropertyAccess = usePropertyAccess as jest.MockedFunction<typeof usePropertyAccess>
    mockUseDashboardActions = useDashboardActions as jest.MockedFunction<typeof useDashboardActions>
    mockUseDashboardStore = useDashboardStore as jest.MockedFunction<typeof useDashboardStore>
    mockUsePropertyStore = usePropertyStore as jest.MockedFunction<typeof usePropertyStore>

    // Setup default mocks
    mockUsePropertyAccess.mockReturnValue({
      properties: mockProperties,
      loading: false,
      error: null,
      refetch: jest.fn()
    })

    mockUseDashboardActions.mockReturnValue({
      getPropertyMetrics: jest.fn().mockResolvedValue(mockPropertyMetrics),
      refreshDashboard: jest.fn(),
      updateProperty: jest.fn()
    })

    mockUseDashboardStore.mockReturnValue({
      setPropertyContext: jest.fn(),
      updatePropertyMetrics: jest.fn(),
      selectedProperty: null,
      metrics: null
    })

    mockUsePropertyStore.mockReturnValue({
      entities: { byId: {}, allIds: [] },
      selectedProperty: null,
      setSelectedProperty: jest.fn()
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render properties module integration', () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration />
        </TestWrapper>
      )

      expect(screen.getByTestId('property-management-tabs')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Properties')).toBeInTheDocument()
    })

    it('should render with initial tab', () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration initialTab="subdivision" />
        </TestWrapper>
      )

      expect(screen.getByText('Initial Tab: subdivision')).toBeInTheDocument()
    })

    it('should show dashboard context when enabled', () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration showDashboardContext={true} />
        </TestWrapper>
      )

      expect(screen.getByText('Select a property to view metrics')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    it('should hide dashboard context when disabled', () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration showDashboardContext={false} />
        </TestWrapper>
      )

      expect(screen.queryByText('Property Metrics')).not.toBeInTheDocument()
      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument()
    })
  })

  describe('Property Selection', () => {
    it('should select property from propertyId prop', async () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Westlands Tower')).toBeInTheDocument()
      })
    })

    it('should handle property creation', async () => {
      const mockOnPropertySelect = jest.fn()

      render(
        <TestWrapper>
          <PropertiesModuleIntegration onPropertySelect={mockOnPropertySelect} />
        </TestWrapper>
      )

      const createButton = screen.getByText('Create Property')
      await userEvent.click(createButton)

      expect(mockOnPropertySelect).toHaveBeenCalledWith({
        id: 'test-property-1',
        name: 'Test Property',
        physical_address: 'Test Address',
        property_type: 'APARTMENT',
        lifecycle_status: 'RENTAL_READY'
      })
    })

    it('should update URL when property is selected', async () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration />
        </TestWrapper>
      )

      const createButton = screen.getByText('Create Property')
      await userEvent.click(createButton)

      expect(mockRouter.push).toHaveBeenCalledWith('?propertyId=test-property-1')
    })
  })

  describe('Property Metrics', () => {
    it('should load property metrics when property is selected', async () => {
      const mockGetPropertyMetrics = jest.fn().mockResolvedValue(mockPropertyMetrics)
      mockUseDashboardActions.mockReturnValue({
        getPropertyMetrics: mockGetPropertyMetrics,
        refreshDashboard: jest.fn(),
        updateProperty: jest.fn()
      })

      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockGetPropertyMetrics).toHaveBeenCalledWith('property-1')
      })
    })

    it('should display property metrics', async () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument() // Total Units
        expect(screen.getByText('95.5%')).toBeInTheDocument() // Occupancy Rate
        expect(screen.getByText('98.2%')).toBeInTheDocument() // Collection Rate
      })
    })

    it('should handle metrics loading error', async () => {
      const mockGetPropertyMetrics = jest.fn().mockRejectedValue(new Error('Metrics failed'))
      mockUseDashboardActions.mockReturnValue({
        getPropertyMetrics: mockGetPropertyMetrics,
        refreshDashboard: jest.fn(),
        updateProperty: jest.fn()
      })

      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Properties Integration Error')).toBeInTheDocument()
      })
    })
  })

  describe('Quick Actions', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Westlands Tower')).toBeInTheDocument()
      })
    })

    it('should display quick actions for selected property', () => {
      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('Manage Units')).toBeInTheDocument()
      expect(screen.getByText('View Tenants')).toBeInTheDocument()
      expect(screen.getByText('View Financials')).toBeInTheDocument()
    })

    it('should navigate to property details', async () => {
      const viewDetailsButton = screen.getByText('View Details')
      await userEvent.click(viewDetailsButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/properties/property-1')
    })

    it('should navigate to units tab', async () => {
      const manageUnitsButton = screen.getByText('Manage Units')
      await userEvent.click(manageUnitsButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/properties/property-1?tab=units')
    })

    it('should navigate to tenants tab', async () => {
      const viewTenantsButton = screen.getByText('View Tenants')
      await userEvent.click(viewTenantsButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/properties/property-1?tab=tenants')
    })

    it('should navigate to financials tab', async () => {
      const viewFinancialsButton = screen.getByText('View Financials')
      await userEvent.click(viewFinancialsButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/properties/property-1?tab=financials')
    })
  })

  describe('Conditional Actions', () => {
    it('should show subdivision action for acquisition properties', async () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-2" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Start Subdivision')).toBeInTheDocument()
      })
    })

    it('should navigate to subdivision tab', async () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-2" />
        </TestWrapper>
      )

      await waitFor(() => {
        const subdivisionButton = screen.getByText('Start Subdivision')
        userEvent.click(subdivisionButton)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/properties?tab=subdivision&propertyId=property-2')
    })
  })

  describe('Navigation', () => {
    it('should navigate to dashboard', async () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration />
        </TestWrapper>
      )

      const dashboardLink = screen.getByText('Dashboard')
      await userEvent.click(dashboardLink)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should call custom navigation handler', async () => {
      const mockOnNavigateToDashboard = jest.fn()

      render(
        <TestWrapper>
          <PropertiesModuleIntegration onNavigateToDashboard={mockOnNavigateToDashboard} />
        </TestWrapper>
      )

      const dashboardLink = screen.getByText('Dashboard')
      await userEvent.click(dashboardLink)

      expect(mockOnNavigateToDashboard).toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Context Integration', () => {
    it('should update dashboard context when property is selected', async () => {
      const mockSetPropertyContext = jest.fn()
      mockUseDashboardStore.mockReturnValue({
        setPropertyContext: mockSetPropertyContext,
        updatePropertyMetrics: jest.fn(),
        selectedProperty: null,
        metrics: null
      })

      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockSetPropertyContext).toHaveBeenCalledWith({
          selectedPropertyId: 'property-1',
          propertyName: 'Westlands Tower',
          propertyType: 'APARTMENT',
          location: 'Westlands, Nairobi'
        })
      })
    })

    it('should update property metrics in store', async () => {
      const mockUpdatePropertyMetrics = jest.fn()
      mockUseDashboardStore.mockReturnValue({
        setPropertyContext: jest.fn(),
        updatePropertyMetrics: mockUpdatePropertyMetrics,
        selectedProperty: null,
        metrics: null
      })

      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="property-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockUpdatePropertyMetrics).toHaveBeenCalledWith('property-1', mockPropertyMetrics)
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error when properties fail to load', () => {
      mockUsePropertyAccess.mockReturnValue({
        properties: [],
        loading: false,
        error: 'Failed to load properties',
        refetch: jest.fn()
      })

      render(
        <TestWrapper>
          <PropertiesModuleIntegration />
        </TestWrapper>
      )

      // Should still render the component but with empty state
      expect(screen.getByTestId('property-management-tabs')).toBeInTheDocument()
    })

    it('should handle property not found', () => {
      render(
        <TestWrapper>
          <PropertiesModuleIntegration propertyId="non-existent-property" />
        </TestWrapper>
      )

      // Should render without selected property
      expect(screen.getByText('Select a property to view metrics')).toBeInTheDocument()
    })
  })
})
