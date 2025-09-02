'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'
import { useNavigationOptimization } from '../../hooks/useNavigationOptimization'
import { DashboardProvider } from '../../contexts/DashboardContext'
import ContextualHeader from '../../components/dashboard/ContextualHeader'
import EnhancedGlobalSearch from '../../components/dashboard/EnhancedGlobalSearch'
import { useSidebarSwipe } from '../../hooks/useSwipeGesture'
import MobileMenu from '../../components/mobile/MobileMenu'
import MobileMenuButton from '../../components/mobile/MobileMenuButton'
import MobileHeader from '../../components/mobile/MobileHeader'
import ResponsiveContainer from '../../components/layout/ResponsiveContainer'
import { SidebarNavLink, MobileNavLink } from '../../components/navigation/OptimizedNavLink'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import Image from 'next/image'

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Properties', href: '/dashboard/properties', icon: 'building' },
  { name: 'Rental Management', href: '/dashboard/rental-management', icon: 'rental' },
  { name: 'Accounting', href: '/dashboard/accounting', icon: 'calculator' },
  { name: 'Administration', href: '/dashboard/administration', icon: 'administration' },
  { name: 'Notifications', href: '/dashboard/notifications', icon: 'bell' },
  { name: 'Reports', href: '/dashboard/reports', icon: 'chart' },
]

const icons = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  calculator: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="5" y="3" width="14" height="18" rx="2" ry="2" strokeWidth={2}></rect>
      <rect x="7" y="7" width="10" height="4" strokeWidth={2}></rect>
      <path strokeWidth={2} d="M7 13h2m3 0h2m3 0h0M7 17h2m3 0h2m3 0h0" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    </svg>
  ),
  'user-group': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  'currency-dollar': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
      />
    </svg>
  ),
  'credit-card': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  wrench: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-5 5v-5zM4 19h6v2H4v-2zM20 4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
      />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  map: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  ),
  plug: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 2v6m4-6v6M7 10h10a2 2 0 012 2v1a5 5 0 01-5 5h-4a5 5 0 01-5-5v-1a2 2 0 012-2z"
      />
    </svg>
  ),
  rental: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0zM8 21v-4a2 2 0 012-2h2a2 2 0 012 2v4M3 7l9-4 9 4"
      />
    </svg>
  ),
  administration: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchDebugOpen, setSearchDebugOpen] = useState(false)
  const { user, signOut, loading } = useAuth()
  const propertyAccess = usePropertyAccess()
  const pathname = usePathname()
  const router = useRouter()

  // Navigation optimization for smooth transitions
  const { preloadRoute, handleLinkHover, handleLinkLeave } = useNavigationOptimization({
    enablePrefetch: true,
    enablePreload: true,
    preloadDelay: 100
  })

  // Initialize search service
  useEffect(() => {
    const initializeSearch = async () => {
      try {
        // Dynamic import to avoid build issues
        const { searchInitializationService } = await import(
          '../../services/SearchInitializationService'
        )
        await searchInitializationService.initialize()
        console.log('✅ Search service initialized in dashboard')

        // Load search test utilities in development (with error handling)
        if (process.env.NODE_ENV === 'development') {
          import('../../utils/searchTestUtils').catch((error) => {
            console.warn('⚠️ Failed to load search test utilities:', error)
          })
        }
      } catch (error) {
        console.warn('⚠️ Search service initialization failed:', error)
        // App continues to work, search just won't be available initially
      }
    }

    initializeSearch()
  }, [])

  // Add swipe gesture support for sidebar
  const sidebarSwipe = useSidebarSwipe(
    sidebarOpen,
    () => setSidebarOpen(true),
    () => setSidebarOpen(false)
  )

  // Handle mobile menu keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close mobile menu on Escape
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }

      // Open search debug panel with Ctrl+Shift+D (development only)
      if (
        process.env.NODE_ENV === 'development' &&
        event.ctrlKey &&
        event.shiftKey &&
        event.key === 'D'
      ) {
        event.preventDefault()
        console.log('🔍 Search Debug: Use browser console to test search')
        // Simple console-based debugging instead of complex UI
        if (typeof window !== 'undefined') {
          import('../../services/UniversalSearchService').then(({ universalSearchService }) => {
            ;(window as any).searchService = universalSearchService
            console.log('🔍 Search service available as window.searchService')
            console.log('🔍 Try: window.searchService.search("test")')
          })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Check if user has user management permissions for any property
  const canManageAnyUsers =
    propertyAccess.properties.some((property) => property.can_manage_users) || false

  // Handle sign out
  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('❌ Logout failed:', error)
        alert(`Logout failed: ${error}`)
      } else {
        console.log('✅ Logout successful')
      }
    } catch (err) {
      console.error('❌ Logout exception:', err)
      alert('An unexpected error occurred during logout')
    }
  }

  // Build navigation array - Administration tab is now included in baseNavigation
  const navigation = [...baseNavigation]

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login with current path as redirect target
      router.push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <DashboardProvider>
      <div className="h-screen flex overflow-hidden bg-gray-50" {...sidebarSwipe}>
        {/* Mobile sidebar with enhanced animations and touch targets */}
        <div
          className={`fixed inset-0 flex z-40 md:hidden transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div
            className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors duration-200 hover:bg-gray-600 hover:bg-opacity-50"
                onClick={() => setSidebarOpen(false)}
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <span className="sr-only">Close sidebar</span>
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              {/* Mobile Sidebar Header */}
              <div className="flex-shrink-0 flex items-center px-4 gap-2 mb-6">
                <Image src="/kodirent-logo.svg" alt="KodiRent" width={32} height={32} />
                <h1 className="text-xl font-bold text-gray-900">KodiRent</h1>
              </div>

              {/* Mobile Navigation with Touch-Optimized Targets */}
              <nav className="px-3 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <MobileNavLink
                      key={item.name}
                      href={item.href}
                      isActive={isActive}
                      icon={icons[item.icon as keyof typeof icons]}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.name}
                    </MobileNavLink>
                  )
                })}
              </nav>

              {/* Mobile User Info */}
              <div className="mt-8 px-4 py-4 border-t border-gray-200">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                    <p className="text-xs text-gray-500">
                      {(propertyAccess as any).accessibleProperties?.length || 0} properties
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  style={{ minHeight: '44px' }}
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-4 gap-2">
                  <Image src="/kodirent-logo.svg" alt="KodiRent" width={24} height={24} />
                  <h1 className="text-xl font-bold text-gray-900">KodiRent</h1>
                </div>
                <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <SidebarNavLink
                        key={item.name}
                        href={item.href}
                        isActive={isActive}
                        icon={icons[item.icon as keyof typeof icons]}
                      >
                        {item.name}
                      </SidebarNavLink>
                    )
                  })}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Top navigation */}
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <button
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </button>
            <div className="flex-1 px-4 flex justify-end">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="ml-3 relative">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <button
                      onClick={async () => {
                        console.log('🚪 Logout button clicked')
                        try {
                          const { error } = await signOut()
                          if (error) {
                            console.error('❌ Logout failed:', error)
                            // You could show a toast notification here
                            alert(`Logout failed: ${error}`)
                          } else {
                            console.log('✅ Logout successful')
                          }
                        } catch (err) {
                          console.error('❌ Logout exception:', err)
                          alert('An unexpected error occurred during logout')
                        }
                      }}
                      className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="Sign Out"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            {/* Mobile Header */}
            <MobileHeader
              onMenuToggle={() => setMobileMenuOpen(true)}
              isMenuOpen={mobileMenuOpen}
            />

            <ResponsiveContainer maxWidth="full" padding="md" className="py-2 md:py-6">
              {/* Desktop Global Search */}
              <div className="hidden md:block mb-4 md:mb-6">
                <EnhancedGlobalSearch
                  className="max-w-md"
                  qualityThreshold="moderate"
                  maxResults={12}
                />
              </div>

              {/* Contextual Header */}
              <div className="mb-4 md:mb-6">
                <ContextualHeader />
              </div>

              {/* Page Content */}
              <div className="min-h-0 flex-1">{children}</div>
            </ResponsiveContainer>
          </main>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </DashboardProvider>
  )
}
