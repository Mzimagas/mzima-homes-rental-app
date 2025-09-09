import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Temporarily disabled to fix edge runtime issues
// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  // Temporarily simplified middleware to fix edge runtime issues
  const res = NextResponse.next()

  // Ensure CSRF token cookie exists (double-submit cookie pattern)
  const csrfCookieName = 'csrf-token'
  let csrfToken = req.cookies.get(csrfCookieName)?.value
  if (!csrfToken) {
    // Use Web Crypto API (Edge runtime compatible)
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    csrfToken = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    res.cookies.set(csrfCookieName, csrfToken, {
      httpOnly: false, // must be readable by client for double-submit
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    })
  }

  // Avoid Invalid URL by skipping Supabase when env is missing/placeholders
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const authConfigured = !!(
    supabaseUrl &&
    supabaseKey &&
    /^https?:\/\//.test(supabaseUrl) &&
    !supabaseUrl.includes('your-supabase-url-here') &&
    !supabaseKey.includes('your-anon-key-here')
  )

  let session: any = null

  // Try to get session if auth is configured
  if (authConfigured) {
    try {
      // Use a simpler approach that works with edge runtime
      const { createServerClient } = await import('@supabase/ssr')
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          },
        },
      })

      // Get and refresh the session
      const result = await supabase.auth.getSession()
      session = result.data.session

      // If we have a session, refresh it to ensure cookies are up to date
      if (session) {
        await supabase.auth.refreshSession()
      }
    } catch (error) {
      console.warn('Middleware: Failed to get session:', error)
      // Continue without session
    }
  }

  const url = req.nextUrl
  const pathname = url.pathname

  // Public routes allowlist
  const publicPrefixes = [
    '/',
    '/auth/',
    '/marketplace/', // Public property marketplace
    '/api/', // Allow all API routes to handle their own auth
    '/api/auth/confirm-user', // dev-only API
  ]

  // Protected routes that require authentication but are not admin-only
  const clientProtectedPrefixes = [
    '/client-portal/',
  ]

  const isPublic = publicPrefixes.some((p) => pathname === p || pathname.startsWith(p))
  const isClientProtected = clientProtectedPrefixes.some((p) => pathname.startsWith(p))

  // Protect non-public routes (but skip API routes since they handle their own auth)
  if (!isPublic && !session && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For client protected routes, ensure user has client access
  if (isClientProtected && session) {
    // Client portal routes are accessible to authenticated users
    // Additional role checking can be added here if needed
  }

  return res
}

export const config = {
  matcher: [
    // Include API routes that need auth cookies
    '/api/clients/:path*',
    '/api/auth/:path*',
    // Include protected pages
    '/client-portal/:path*',
    '/dashboard/:path*',
    // Include marketplace for session refresh
    '/marketplace/:path*',
  ],
}
