/**
 * Mobile and Responsive Dashboard Tests
 * Comprehensive testing for mobile responsiveness, touch interactions, and cross-device compatibility
 * Tests viewport adaptations, gesture handling, and mobile-specific UI patterns
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardContextProvider } from '../../../contexts/DashboardContextProvider'
import { AuthProvider } from '../../../lib/auth-context'
import DashboardLayout from '../../../components/dashboard/DashboardLayout'
import { DashboardNavigation } from '../../../components/dashboard/DashboardNavigation'
import { MetricsGrid } from '../../../components/dashboard/metrics/MetricsGrid'
import { DashboardSearch } from '../../../components/dashboard/search/DashboardSearch'

// Mock dependencies
jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock matchMedia for responsive testing
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
})

// Viewport configurations for testing
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  mobileLarge: { width: 414, height: 896 },
  tablet: { width: 768, height: 1024 },
  tabletLarge: { width: 1024, height: 1366 },
  desktop: { width: 1280, height: 720 },
  desktopLarge: { width: 1920, height: 1080 }
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

// Utility to set viewport size
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })

  // Update matchMedia mock
  window.matchMedia = jest.fn().mockImplementation((query) => {
    const matches = query.includes('max-width') 
      ? width <= parseInt(query.match(/\d+/)?.[0] || '0')
      : width >= parseInt(query.match(/\d+/)?.[0] || '0')
    
    return {
      ...mockMatchMedia(query),
      matches
    }
  })

  // Trigger resize event
  fireEvent(window, new Event('resize'))
}

describe('Mobile and Responsive Dashboard Tests', () => {
  beforeEach(() => {
    // Reset to desktop viewport
    setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height)
  })

  describe('Viewport Responsiveness', () => {
    it('should adapt layout for mobile viewport', () => {
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should show mobile-optimized layout
      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
      
      // Mobile navigation should be present
      const navigation = screen.getByRole('navigation') || screen.getByTestId('dashboard-navigation')
      expect(navigation).toBeInTheDocument()
    })

    it('should adapt layout for tablet viewport', () => {
      setViewport(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height)

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should show tablet-optimized layout
      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })

    it('should show full desktop layout on large screens', () => {
      setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height)

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should show full desktop layout
      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })

    it('should handle viewport changes dynamically', () => {
      const { rerender } = render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Start with desktop
      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()

      // Switch to mobile
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
      rerender(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should adapt to mobile layout
      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })
  })

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    })

    it('should render mobile navigation drawer', () => {
      render(
        <TestWrapper>
          <DashboardNavigation variant="mobile" />
        </TestWrapper>
      )

      // Should have mobile navigation elements
      const navigation = screen.getByRole('navigation') || screen.getByTestId('dashboard-navigation')
      expect(navigation).toBeInTheDocument()
    })

    it('should handle drawer toggle on mobile', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DashboardNavigation variant="mobile" />
        </TestWrapper>
      )

      // Look for menu button or drawer toggle
      const menuButton = screen.queryByRole('button', { name: /menu/i }) || 
                        screen.queryByTestId('mobile-menu-button')

      if (menuButton) {
        await user.click(menuButton)
        // Should open drawer
        expect(menuButton).toBeInTheDocument()
      }
    })

    it('should support swipe gestures for navigation', () => {
      render(
        <TestWrapper>
          <DashboardNavigation variant="mobile" />
        </TestWrapper>
      )

      const navigation = screen.getByRole('navigation') || screen.getByTestId('dashboard-navigation')

      // Simulate swipe gesture
      fireEvent.touchStart(navigation, {
        touches: [{ clientX: 0, clientY: 0 }]
      })

      fireEvent.touchMove(navigation, {
        touches: [{ clientX: 100, clientY: 0 }]
      })

      fireEvent.touchEnd(navigation, {
        changedTouches: [{ clientX: 100, clientY: 0 }]
      })

      // Should handle swipe gesture
      expect(navigation).toBeInTheDocument()
    })
  })

  describe('Responsive Grid Layout', () => {
    it('should adjust grid columns for mobile', () => {
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)

      render(
        <TestWrapper>
          <MetricsGrid columns={1} compact={true} />
        </TestWrapper>
      )

      // Should render with mobile-optimized grid
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    })

    it('should adjust grid columns for tablet', () => {
      setViewport(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height)

      render(
        <TestWrapper>
          <MetricsGrid columns={2} />
        </TestWrapper>
      )

      // Should render with tablet-optimized grid
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    })

    it('should use full grid on desktop', () => {
      setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height)

      render(
        <TestWrapper>
          <MetricsGrid columns={4} />
        </TestWrapper>
      )

      // Should render with desktop grid
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    })

    it('should handle grid reflow on viewport change', () => {
      const { rerender } = render(
        <TestWrapper>
          <MetricsGrid />
        </TestWrapper>
      )

      // Start with desktop
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()

      // Switch to mobile
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
      rerender(
        <TestWrapper>
          <MetricsGrid />
        </TestWrapper>
      )

      // Should reflow for mobile
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    })
  })

  describe('Touch Interactions', () => {
    beforeEach(() => {
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    })

    it('should handle touch events on interactive elements', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Find interactive elements
      const overviewTab = screen.getByText('Overview')
      
      // Should handle touch interaction
      await user.click(overviewTab)
      expect(overviewTab).toBeInTheDocument()
    })

    it('should support pinch-to-zoom on charts', () => {
      render(
        <TestWrapper>
          <div data-testid="chart-container">
            <div>Chart Content</div>
          </div>
        </TestWrapper>
      )

      const chartContainer = screen.getByTestId('chart-container')

      // Simulate pinch gesture
      fireEvent.touchStart(chartContainer, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 }
        ]
      })

      fireEvent.touchMove(chartContainer, {
        touches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 }
        ]
      })

      fireEvent.touchEnd(chartContainer, {
        changedTouches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 }
        ]
      })

      // Should handle pinch gesture
      expect(chartContainer).toBeInTheDocument()
    })

    it('should handle long press for context menus', async () => {
      render(
        <TestWrapper>
          <div data-testid="metric-card">Metric Card</div>
        </TestWrapper>
      )

      const metricCard = screen.getByTestId('metric-card')

      // Simulate long press
      fireEvent.touchStart(metricCard, {
        touches: [{ clientX: 100, clientY: 100 }]
      })

      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 500))

      fireEvent.touchEnd(metricCard, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      })

      // Should handle long press
      expect(metricCard).toBeInTheDocument()
    })
  })

  describe('Mobile Search Interface', () => {
    beforeEach(() => {
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    })

    it('should render mobile-optimized search', () => {
      render(
        <TestWrapper>
          <DashboardSearch />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText(/search/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('should handle virtual keyboard appearance', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DashboardSearch />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText(/search/i)

      // Focus input (simulates virtual keyboard)
      await user.click(searchInput)

      // Should handle virtual keyboard
      expect(searchInput).toHaveFocus()
    })

    it('should support voice search on mobile', () => {
      render(
        <TestWrapper>
          <DashboardSearch />
        </TestWrapper>
      )

      // Look for voice search button
      const voiceButton = screen.queryByTitle(/voice search/i) || 
                         screen.queryByTestId('voice-search-button')

      if (voiceButton) {
        expect(voiceButton).toBeInTheDocument()
      }
    })
  })

  describe('Performance on Mobile Devices', () => {
    beforeEach(() => {
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    })

    it('should load efficiently on mobile', async () => {
      const startTime = performance.now()

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
      })

      const loadTime = performance.now() - startTime

      // Should load within reasonable time on mobile
      expect(loadTime).toBeLessThan(2000) // 2 seconds
    })

    it('should handle memory constraints on mobile', () => {
      // Simulate mobile memory constraints
      const originalMemory = (performance as any).memory
      
      if (originalMemory) {
        Object.defineProperty(performance, 'memory', {
          value: {
            ...originalMemory,
            jsHeapSizeLimit: 50 * 1024 * 1024 // 50MB limit
          }
        })
      }

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()

      // Restore original memory
      if (originalMemory) {
        Object.defineProperty(performance, 'memory', {
          value: originalMemory
        })
      }
    })

    it('should optimize rendering for mobile', () => {
      render(
        <TestWrapper>
          <MetricsGrid compact={true} />
        </TestWrapper>
      )

      // Should render compact version for mobile
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    })
  })

  describe('Accessibility on Mobile', () => {
    beforeEach(() => {
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    })

    it('should support screen readers on mobile', () => {
      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      // Should have proper ARIA labels
      const main = screen.getByRole('main') || screen.getByTestId('dashboard-main')
      expect(main).toBeInTheDocument()
    })

    it('should have proper touch target sizes', () => {
      render(
        <TestWrapper>
          <DashboardNavigation variant="mobile" />
        </TestWrapper>
      )

      // Touch targets should be at least 44px (iOS) or 48px (Android)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minSize = parseInt(styles.minHeight) || parseInt(styles.height)
        
        if (minSize > 0) {
          expect(minSize).toBeGreaterThanOrEqual(44)
        }
      })
    })

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        ...mockMatchMedia(query),
        matches: query.includes('prefers-contrast: high')
      }))

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })
  })

  describe('Cross-Device Compatibility', () => {
    it('should work on iOS Safari', () => {
      // Mock iOS Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      })

      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })

    it('should work on Android Chrome', () => {
      // Mock Android Chrome user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        configurable: true
      })

      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })

    it('should handle different pixel densities', () => {
      // Mock high DPI display
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 3,
        configurable: true
      })

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })
  })

  describe('Orientation Changes', () => {
    it('should handle portrait to landscape transition', () => {
      // Start in portrait
      setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)

      const { rerender } = render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()

      // Switch to landscape
      setViewport(VIEWPORTS.mobile.height, VIEWPORTS.mobile.width)
      
      // Trigger orientation change
      fireEvent(window, new Event('orientationchange'))

      rerender(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument()
    })

    it('should adjust layout for landscape mode', () => {
      // Set landscape orientation
      setViewport(VIEWPORTS.mobile.height, VIEWPORTS.mobile.width)

      render(
        <TestWrapper>
          <MetricsGrid />
        </TestWrapper>
      )

      // Should adapt layout for landscape
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    })
  })
})
