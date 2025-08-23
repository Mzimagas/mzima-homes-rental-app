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
  if (authConfigured) {
    const supabase = createMiddlewareClient({ req, res }, { supabaseUrl, supabaseKey })
    const result = await supabase.auth.getSession()
    session = result.data.session
  }

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
