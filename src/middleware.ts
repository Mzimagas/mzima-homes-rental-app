import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Ensure CSRF token cookie exists (double-submit cookie pattern)
  const csrfCookieName = 'csrf-token'
  let csrfToken = req.cookies.get(csrfCookieName)?.value
  if (!csrfToken) {
    // Use Web Crypto API (Edge runtime compatible)
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    csrfToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

    res.cookies.set(csrfCookieName, csrfToken, {
      httpOnly: false, // must be readable by client for double-submit
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    })
  }

  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const url = req.nextUrl
  const pathname = url.pathname

  // Public routes allowlist
  const publicPrefixes = [
    '/',
    '/auth/',
    '/api/auth/confirm-user', // dev-only API
  ]

  const isPublic = publicPrefixes.some((p) => pathname === p || pathname.startsWith(p))

  // Protect non-public routes
  if (!isPublic && !session) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
