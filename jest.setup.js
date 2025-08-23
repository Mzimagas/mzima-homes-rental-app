// Jest setup file
import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
process.env.MPESA_CONSUMER_KEY = 'test-consumer-key'
process.env.MPESA_CONSUMER_SECRET = 'test-consumer-secret'
process.env.MPESA_BUSINESS_SHORT_CODE = 'test-shortcode'
process.env.MPESA_PASSKEY = 'test-passkey'
process.env.MPESA_ENVIRONMENT = 'sandbox'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock crypto for file hashing
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()

  // Reset fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear()
  }
})

// Global test utilities
global.testUtils = {
  // Generate test UUID
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock successful API response
  mockApiSuccess: (data) => ({
    ok: true,
    status: 200,
    json: async () => ({ data, error: null })
  }),

  // Mock API error response
  mockApiError: (error) => ({
    ok: false,
    status: 400,
    json: async () => ({ data: null, error })
  }),

  // Create test client data
  createTestClient: () => ({
    full_name: 'Test Client',
    id_number: `TEST${Date.now()}`,
    phone: '+254701234567',
    email: 'test@example.com',
    source: 'walk_in'
  }),

  // Create test plot data
  createTestPlot: (subdivisionId) => ({
    subdivision_id: subdivisionId,
    plot_no: `TEST${Date.now()}`,
    size_sqm: 1000,
    access_type: 'public_road',
    utility_level: 'water_power',
    stage: 'ready_for_sale'
  }),

  // Create test coordinates
  createTestCoordinates: () => [
    [36.8219, -1.2921],
    [36.8229, -1.2921],
    [36.8229, -1.2931],
    [36.8219, -1.2931],
    [36.8219, -1.2921]
  ]
}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Supabase client
jest.mock('./src/lib/supabase-client', () => ({
  __esModule: true,
  default: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
  clientBusinessFunctions: {
    applyPayment: jest.fn().mockResolvedValue({ data: 'payment-123', error: null }),
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock crypto.randomUUID for Node.js environments
if (typeof crypto === 'undefined') {
  global.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
} else if (!crypto.randomUUID) {
  crypto.randomUUID = () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Setup test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
