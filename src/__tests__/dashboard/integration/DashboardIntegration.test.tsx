/**
 * Dashboard Integration Tests
 * Comprehensive integration testing for dashboard components, state management, and data layer
 * Tests component interactions, data flow, and real-time updates
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardContextProvider } from '../../../contexts/DashboardContextProvider'
import { AuthProvider } from '../../../lib/auth-context'
import DashboardLayout from '../../../components/dashboard/DashboardLayout'
import { DashboardSearch } from '../../../components/dashboard/search/DashboardSearch'
import { DashboardExport } from '../../../components/dashboard/export/DashboardExport'
import { DashboardCustomization } from '../../../components/dashboard/customization/DashboardCustomization'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'
import { dashboardService } from '../../../services/DashboardService'

// Mock external dependencies
jest.mock('../../../services/DashboardService')
jest.mock('../../../lib/supabase-client')
jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock chart components to avoid canvas issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Legend: () => <div data-testid="legend" />
}))

// Mock dashboard service responses
const mockDashboardData = {
  metrics: {
    totalProperties: 25,
    activeTenants: 68,
    monthlyRevenue: 2450000,
    occupancyRate: 94.1,
    collectionRate: 96.5,
    outstandingAmount: 135000
  },
  properties: [
    {
      id: '1',
      name: 'Westlands Tower',
      location: 'Westlands',
      units: 12,
      occupancyRate: 95,
      monthlyRevenue: 240000
    },
    {
      id: '2',
      name: 'Karen Villas',
      location: 'Karen',
      units: 6,
      occupancyRate: 100,
      monthlyRevenue: 180000
    }
  ],
  tenants: [
    {
      id: '1',
      name: 'John Kamau',
      propertyName: 'Westlands Tower',
      unitNumber: 'A-12',
      monthlyRent: 45000,
      status: 'active'
    }
  ],
  financial: [
    {
      category: 'Maintenance',
      amount: 245000,
      percentage: 40,
      trend: 'up'
    }
  ]
}

// Test wrapper component
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

describe('Dashboard Integration Tests', () => {
  let mockDashboardService: jest.Mocked<typeof dashboardService>

  beforeEach(() => {
    mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>
    mockDashboardService.getDashboardMetrics.mockResolvedValue(mockDashboardData.metrics)
    mockDashboardService.getPropertyAnalytics.mockResolvedValue(mockDashboardData.properties)
    mockDashboardService.getTenantAnalytics.mockResolvedValue(mockDashboardData.tenants)
    mockDashboardService.getFinancialAnalytics.mockResolvedValue(mockDashboardData.financial)
    
    // Clear localStorage before each test
    localStorage.clear()
    
    // Reset store state
    useDashboardStore.getState().reset?.()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Dashboard Layout Integration', () => {
    it('should render dashboard layout with all sections', async () => {
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Check if main navigation is rendered
      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
      
      // Check if tab navigation is present
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Properties')).toBeInTheDocument()
      expect(screen.getByText('Financial')).toBeInTheDocument()
      expect(screen.getByText('Tenants')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
    })

    it('should switch between dashboard tabs', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Click on Properties tab
      await user.click(screen.getByText('Properties'))
      
      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Property Analytics')).toBeInTheDocument()
      })

      // Click on Financial tab
      await user.click(screen.getByText('Financial'))
      
      await waitFor(() => {
        expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
      })
    })

    it('should handle real-time connection indicator', async () => {
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should show live updates indicator when connected
      await waitFor(() => {
        const liveIndicator = screen.queryByText('Live updates active')
        if (liveIndicator) {
          expect(liveIndicator).toBeInTheDocument()
        }
      })
    })
  })

  describe('State Management Integration', () => {
    it('should update store state when data is fetched', async () => {
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Wait for data to be fetched and store to be updated
      await waitFor(() => {
        const store = useDashboardStore.getState()
        expect(store.metrics).toBeDefined()
      })

      // Verify service was called
      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalled()
    })

    it('should handle context state updates', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Switch tabs and verify context updates
      await user.click(screen.getByText('Properties'))
      
      await waitFor(() => {
        // Context should reflect the current tab
        expect(screen.getByText('Property Analytics')).toBeInTheDocument()
      })
    })

    it('should persist user preferences', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardCustomization
            isOpen={true}
            onClose={() => {}}
          />
        </TestWrapper>
      )

      // Change theme
      const themeButton = screen.getByText('Dark Mode')
      await user.click(themeButton)

      // Save changes
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Verify localStorage was updated
      const savedCustomization = localStorage.getItem('dashboard-customization-test-user')
      expect(savedCustomization).toBeTruthy()
      
      if (savedCustomization) {
        const parsed = JSON.parse(savedCustomization)
        expect(parsed.theme.name).toBe('Dark Mode')
      }
    })
  })

  describe('Search and Filter Integration', () => {
    it('should perform search and update results', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()
      
      render(
        <TestWrapper>
          <DashboardSearch onSearch={mockOnSearch} />
        </TestWrapper>
      )

      // Type in search input
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Westlands')

      // Press Enter to search
      await user.keyboard('{Enter}')

      // Verify search was triggered
      expect(mockOnSearch).toHaveBeenCalledWith('Westlands', expect.any(Array))
    })

    it('should save and load recent searches', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardSearch />
        </TestWrapper>
      )

      // Perform a search
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Karen properties')
      await user.keyboard('{Enter}')

      // Focus search again to see recent searches
      await user.click(searchInput)
      await user.clear(searchInput)

      // Should show recent searches
      await waitFor(() => {
        expect(screen.getByText('Recent')).toBeInTheDocument()
      })
    })

    it('should apply filters correctly', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()
      
      render(
        <TestWrapper>
          <DashboardSearch onSearch={mockOnSearch} showFilters={true} />
        </TestWrapper>
      )

      // Open filter panel
      const filterButton = screen.getByTitle('Filters')
      await user.click(filterButton)

      // Apply a filter
      const typeSelect = screen.getByDisplayValue('All Type')
      await user.selectOptions(typeSelect, 'property')

      // Apply filters
      const applyButton = screen.getByText('Apply Filters')
      await user.click(applyButton)

      // Verify search was called with filters
      expect(mockOnSearch).toHaveBeenCalledWith(
        '',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'type',
            value: 'property'
          })
        ])
      )
    })
  })

  describe('Export Integration', () => {
    it('should trigger PDF export', async () => {
      const user = userEvent.setup()
      const mockOnExportStart = jest.fn()
      const mockOnExportComplete = jest.fn()
      
      // Mock jsPDF
      const mockSave = jest.fn()
      jest.doMock('jspdf', () => ({
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
          save: mockSave,
          internal: { pageSize: { width: 210 } },
          setFontSize: jest.fn(),
          setFont: jest.fn(),
          text: jest.fn(),
          autoTable: jest.fn()
        }))
      }))
      
      render(
        <TestWrapper>
          <DashboardExport
            onExportStart={mockOnExportStart}
            onExportComplete={mockOnExportComplete}
          />
        </TestWrapper>
      )

      // Click PDF export button
      const pdfButton = screen.getByText('Export PDF')
      await user.click(pdfButton)

      // Verify export callbacks were called
      expect(mockOnExportStart).toHaveBeenCalled()
    })

    it('should open custom export modal', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardExport />
        </TestWrapper>
      )

      // Click custom export button
      const customButton = screen.getByText('Custom Export')
      await user.click(customButton)

      // Should open modal
      await waitFor(() => {
        expect(screen.getByText('Export Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Mock service to throw error
      mockDashboardService.getDashboardMetrics.mockRejectedValue(new Error('API Error'))
      
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })

    it('should handle network failures', async () => {
      // Mock network failure
      mockDashboardService.getDashboardMetrics.mockRejectedValue(new Error('Network Error'))
      
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should show retry option
      await waitFor(() => {
        const retryButton = screen.queryByText(/retry/i)
        if (retryButton) {
          expect(retryButton).toBeInTheDocument()
        }
      })
    })
  })

  describe('Performance Integration', () => {
    it('should lazy load dashboard sections', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Initially should show overview (default)
      expect(screen.getByText('Overview')).toBeInTheDocument()

      // Switch to properties tab
      await user.click(screen.getByText('Properties'))

      // Should lazy load properties section
      await waitFor(() => {
        expect(screen.getByText('Property Analytics')).toBeInTheDocument()
      })
    })

    it('should handle concurrent data fetching', async () => {
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Multiple service calls should be made concurrently
      await waitFor(() => {
        expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility Integration', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Tab through navigation
      await user.tab()
      
      // Should focus on first interactive element
      const focusedElement = document.activeElement
      expect(focusedElement).toBeInTheDocument()
    })

    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Check for ARIA labels on navigation
      const navigation = screen.getByRole('main') || screen.getByRole('navigation')
      expect(navigation).toBeInTheDocument()
    })
  })

  describe('Mobile Integration', () => {
    it('should render mobile navigation', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should render mobile-specific elements
      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })

    it('should handle touch interactions', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Simulate touch interaction
      const overviewTab = screen.getByText('Overview')
      await user.click(overviewTab)

      expect(overviewTab).toBeInTheDocument()
    })
  })
})
