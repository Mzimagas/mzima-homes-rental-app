import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

  // Refresh/attach session cookies so APIs see a user if logged in
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: '', ...options }),
      },
    }
  )

  // Use getUser() instead of getSession() for better security
  await supabase.auth.getUser()

  return res
}

export const config = {
  matcher: [
    '/client-portal/:path*',
    '/api/clients/:path*',
    '/api/auth/:path*',
  ],
}
