/**
 * Responsive Testing Utilities
 * Helper functions and utilities for testing responsive behavior across different devices and viewports
 */

import { fireEvent } from '@testing-library/react'

// Common device viewport configurations
export const DEVICE_VIEWPORTS = {
  // Mobile devices
  iPhoneSE: { width: 375, height: 667, devicePixelRatio: 2 },
  iPhone12: { width: 390, height: 844, devicePixelRatio: 3 },
  iPhone12Pro: { width: 390, height: 844, devicePixelRatio: 3 },
  iPhone12ProMax: { width: 428, height: 926, devicePixelRatio: 3 },
  iPhone13Mini: { width: 375, height: 812, devicePixelRatio: 3 },
  
  // Android devices
  galaxyS21: { width: 384, height: 854, devicePixelRatio: 2.75 },
  galaxyNote20: { width: 412, height: 915, devicePixelRatio: 2.625 },
  pixelXL: { width: 411, height: 731, devicePixelRatio: 3.5 },
  
  // Tablets
  iPadMini: { width: 768, height: 1024, devicePixelRatio: 2 },
  iPad: { width: 820, height: 1180, devicePixelRatio: 2 },
  iPadPro: { width: 1024, height: 1366, devicePixelRatio: 2 },
  galaxyTab: { width: 800, height: 1280, devicePixelRatio: 1.5 },
  
  // Desktop
  laptop: { width: 1366, height: 768, devicePixelRatio: 1 },
  desktop: { width: 1920, height: 1080, devicePixelRatio: 1 },
  desktopHD: { width: 2560, height: 1440, devicePixelRatio: 1 },
  
  // Ultra-wide
  ultrawide: { width: 3440, height: 1440, devicePixelRatio: 1 }
} as const

export type DeviceViewport = keyof typeof DEVICE_VIEWPORTS

// User agent strings for different devices
export const USER_AGENTS = {
  iPhoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  iPadSafari: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  desktopFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  desktopSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
} as const

// Touch event simulation
export interface TouchPoint {
  clientX: number
  clientY: number
  identifier?: number
}

/**
 * Responsive Test Environment Setup
 */
export class ResponsiveTestEnvironment {
  private originalInnerWidth: number
  private originalInnerHeight: number
  private originalUserAgent: string
  private originalDevicePixelRatio: number
  private originalMatchMedia: typeof window.matchMedia

  constructor() {
    this.originalInnerWidth = window.innerWidth
    this.originalInnerHeight = window.innerHeight
    this.originalUserAgent = navigator.userAgent
    this.originalDevicePixelRatio = window.devicePixelRatio
    this.originalMatchMedia = window.matchMedia
  }

  /**
   * Set viewport to specific device configuration
   */
  setDevice(device: DeviceViewport): void {
    const config = DEVICE_VIEWPORTS[device]
    this.setViewport(config.width, config.height, config.devicePixelRatio)
  }

  /**
   * Set custom viewport dimensions
   */
  setViewport(width: number, height: number, devicePixelRatio: number = 1): void {
    // Set viewport dimensions
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

    // Set device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: devicePixelRatio,
    })

    // Update matchMedia mock
    this.updateMatchMedia(width)

    // Trigger resize event
    fireEvent(window, new Event('resize'))
  }

  /**
   * Set user agent for device simulation
   */
  setUserAgent(userAgent: keyof typeof USER_AGENTS): void {
    Object.defineProperty(navigator, 'userAgent', {
      value: USER_AGENTS[userAgent],
      configurable: true
    })
  }

  /**
   * Simulate orientation change
   */
  changeOrientation(): void {
    const currentWidth = window.innerWidth
    const currentHeight = window.innerHeight
    
    // Swap dimensions
    this.setViewport(currentHeight, currentWidth)
    
    // Trigger orientation change event
    fireEvent(window, new Event('orientationchange'))
  }

  /**
   * Update matchMedia mock for responsive queries
   */
  private updateMatchMedia(width: number): void {
    window.matchMedia = jest.fn().mockImplementation((query: string) => {
      // Parse media query
      const maxWidthMatch = query.match(/max-width:\s*(\d+)px/)
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/)
      
      let matches = false
      
      if (maxWidthMatch) {
        const maxWidth = parseInt(maxWidthMatch[1])
        matches = width <= maxWidth
      } else if (minWidthMatch) {
        const minWidth = parseInt(minWidthMatch[1])
        matches = width >= minWidth
      }
      
      // Handle other media features
      if (query.includes('prefers-color-scheme: dark')) {
        matches = false // Default to light mode
      }
      
      if (query.includes('prefers-reduced-motion: reduce')) {
        matches = false // Default to motion enabled
      }

      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }
    })
  }

  /**
   * Restore original environment
   */
  restore(): void {
    Object.defineProperty(window, 'innerWidth', {
      value: this.originalInnerWidth,
      configurable: true
    })
    
    Object.defineProperty(window, 'innerHeight', {
      value: this.originalInnerHeight,
      configurable: true
    })
    
    Object.defineProperty(navigator, 'userAgent', {
      value: this.originalUserAgent,
      configurable: true
    })
    
    Object.defineProperty(window, 'devicePixelRatio', {
      value: this.originalDevicePixelRatio,
      configurable: true
    })
    
    window.matchMedia = this.originalMatchMedia
  }
}

/**
 * Touch gesture simulation utilities
 */
export const TouchGestures = {
  /**
   * Simulate tap gesture
   */
  tap(element: Element, point: TouchPoint): void {
    fireEvent.touchStart(element, {
      touches: [{ ...point, identifier: 0 }]
    })
    
    fireEvent.touchEnd(element, {
      changedTouches: [{ ...point, identifier: 0 }]
    })
  },

  /**
   * Simulate long press gesture
   */
  async longPress(element: Element, point: TouchPoint, duration: number = 500): Promise<void> {
    fireEvent.touchStart(element, {
      touches: [{ ...point, identifier: 0 }]
    })
    
    await new Promise(resolve => setTimeout(resolve, duration))
    
    fireEvent.touchEnd(element, {
      changedTouches: [{ ...point, identifier: 0 }]
    })
  },

  /**
   * Simulate swipe gesture
   */
  swipe(
    element: Element, 
    start: TouchPoint, 
    end: TouchPoint, 
    duration: number = 300
  ): void {
    fireEvent.touchStart(element, {
      touches: [{ ...start, identifier: 0 }]
    })
    
    // Simulate intermediate points
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const x = start.clientX + (end.clientX - start.clientX) * progress
      const y = start.clientY + (end.clientY - start.clientY) * progress
      
      fireEvent.touchMove(element, {
        touches: [{ clientX: x, clientY: y, identifier: 0 }]
      })
    }
    
    fireEvent.touchEnd(element, {
      changedTouches: [{ ...end, identifier: 0 }]
    })
  },

  /**
   * Simulate pinch gesture
   */
  pinch(
    element: Element,
    center: TouchPoint,
    startDistance: number,
    endDistance: number
  ): void {
    const angle = Math.PI / 4 // 45 degrees
    
    const startPoint1 = {
      clientX: center.clientX - startDistance * Math.cos(angle),
      clientY: center.clientY - startDistance * Math.sin(angle),
      identifier: 0
    }
    
    const startPoint2 = {
      clientX: center.clientX + startDistance * Math.cos(angle),
      clientY: center.clientY + startDistance * Math.sin(angle),
      identifier: 1
    }
    
    const endPoint1 = {
      clientX: center.clientX - endDistance * Math.cos(angle),
      clientY: center.clientY - endDistance * Math.sin(angle),
      identifier: 0
    }
    
    const endPoint2 = {
      clientX: center.clientX + endDistance * Math.cos(angle),
      clientY: center.clientY + endDistance * Math.sin(angle),
      identifier: 1
    }
    
    // Start pinch
    fireEvent.touchStart(element, {
      touches: [startPoint1, startPoint2]
    })
    
    // Move to end position
    fireEvent.touchMove(element, {
      touches: [endPoint1, endPoint2]
    })
    
    // End pinch
    fireEvent.touchEnd(element, {
      changedTouches: [endPoint1, endPoint2]
    })
  }
}

/**
 * Responsive assertion helpers
 */
export const ResponsiveAssertions = {
  /**
   * Assert element is visible on current viewport
   */
  expectVisible(element: Element): void {
    expect(element).toBeInTheDocument()
    expect(element).toBeVisible()
  },

  /**
   * Assert element has responsive classes
   */
  expectResponsiveClasses(element: Element, expectedClasses: string[]): void {
    expectedClasses.forEach(className => {
      expect(element).toHaveClass(className)
    })
  },

  /**
   * Assert element meets minimum touch target size
   */
  expectTouchTargetSize(element: Element, minSize: number = 44): void {
    const rect = element.getBoundingClientRect()
    expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(minSize)
  },

  /**
   * Assert element is accessible on mobile
   */
  expectMobileAccessible(element: Element): void {
    // Check for ARIA labels
    expect(
      element.getAttribute('aria-label') || 
      element.getAttribute('aria-labelledby') ||
      element.textContent
    ).toBeTruthy()
    
    // Check for proper role
    const role = element.getAttribute('role')
    if (role) {
      expect(['button', 'link', 'tab', 'menuitem']).toContain(role)
    }
  }
}

/**
 * Test multiple viewports helper
 */
export function testAcrossViewports(
  testFn: (device: DeviceViewport, env: ResponsiveTestEnvironment) => void | Promise<void>,
  devices: DeviceViewport[] = ['iPhoneSE', 'iPad', 'desktop']
): void {
  devices.forEach(device => {
    describe(`on ${device}`, () => {
      let env: ResponsiveTestEnvironment

      beforeEach(() => {
        env = new ResponsiveTestEnvironment()
        env.setDevice(device)
      })

      afterEach(() => {
        env.restore()
      })

      it(`should work correctly on ${device}`, async () => {
        await testFn(device, env)
      })
    })
  })
}

/**
 * Performance testing for responsive components
 */
export const ResponsivePerformance = {
  /**
   * Measure responsive layout shift
   */
  measureLayoutShift(callback: () => void): number {
    const startTime = performance.now()
    callback()
    const endTime = performance.now()
    return endTime - startTime
  },

  /**
   * Test responsive image loading
   */
  testImageLoading(imgElement: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (imgElement.complete) {
        resolve()
      } else {
        imgElement.onload = () => resolve()
        imgElement.onerror = () => reject(new Error('Image failed to load'))
      }
    })
  }
}

export default ResponsiveTestEnvironment
