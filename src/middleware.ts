import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
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
  let userType: string | null = null

  // Try to get session and user type if auth is configured
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

        // Detect user type for role-based access control
        try {
          const user = session.user
          if (user) {
            // Quick user type detection based on metadata and database
            const userMetadata = user.user_metadata || {}

            // Check metadata first for quick detection
            if (userMetadata.user_type === 'client') {
              userType = 'client'
            } else if (userMetadata.role || userMetadata.member_number) {
              userType = 'staff'
            } else {
              // Check for admin email patterns
              const adminEmailPatterns = [
                /@(admin|staff|management|kodirent)\./i,
                /admin@/i,
                /staff@/i,
                /manager@/i,
                /^abeljoshua04@gmail\.com$/i, // Specific admin user
              ]

              const hasAdminEmail = adminEmailPatterns.some(pattern => pattern.test(user.email || ''))

              if (hasAdminEmail) {
                userType = 'staff'
              } else {
                // Check enhanced_users table for more accurate detection
                const { data: enhancedUser } = await supabase
                  .from('enhanced_users')
                  .select('user_type, member_number')
                  .eq('id', user.id)
                  .single()

                if (enhancedUser) {
                  if (enhancedUser.user_type === 'client') {
                    userType = 'client'
                  } else if (enhancedUser.member_number) {
                    userType = 'staff'
                  }
                }
              }
            }

            // Default to client if we can't determine (safer for marketplace users)
            if (!userType) {
              userType = 'client'
            }
          }
        } catch (error) {
          console.warn('Middleware: Failed to detect user type:', error)
          userType = 'client' // Safe default
        }
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

  // Admin-only routes
  const adminOnlyPrefixes = ['/dashboard/']

  // Client-only routes
  const clientOnlyPrefixes = ['/client-portal/']

  const isPublic = publicPrefixes.some((p) => pathname === p || pathname.startsWith(p))
  const isAdminOnly = adminOnlyPrefixes.some((p) => pathname.startsWith(p))
  const isClientOnly = clientOnlyPrefixes.some((p) => pathname.startsWith(p))

  // Protect non-public routes (but skip API routes since they handle their own auth)
  if (!isPublic && !session && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control for authenticated users
  if (session && userType) {
    // Prevent clients from accessing admin dashboard
    if (isAdminOnly && userType === 'client') {
      console.log(
        `🚫 Client user ${session.user.email} attempted to access admin route: ${pathname}`
      )
      return NextResponse.redirect(new URL('/client-portal', req.url))
    }

    // Prevent staff from accessing client portal (optional - you might want to allow this)
    if (isClientOnly && userType === 'staff') {
      console.log(
        `🚫 Staff user ${session.user.email} attempted to access client route: ${pathname}`
      )
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
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
