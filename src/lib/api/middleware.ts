import { NextRequest, NextResponse } from 'next/server'
import { errors } from './errors'
import { getRatelimit } from '../upstash'
import { createServerSupabaseClient } from '../supabase-server'
import { createClient } from '@supabase/supabase-js'

export type Handler = (req: NextRequest) => Promise<NextResponse> | NextResponse

export function withCsrf(handler: Handler): Handler {
  return async (req: NextRequest) => {
    const csrfHeader = req.headers.get('x-csrf-token') || ''
    const csrfCookie = req.cookies.get('csrf-token')?.value || ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return errors.csrf()
    }
    return handler(req)
  }
}

export function withRateLimit(handler: Handler, keyFn?: (req: NextRequest) => string, limitLabel = 'generic'): Handler {
  return async (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const key = keyFn ? keyFn(req) : `${limitLabel}:${ip}`
    const rl = getRatelimit()
    const res = await rl.limit(key)
    if (!res.success) return errors.rate()
    return handler(req)
  }
}

export function withAuth(handler: Handler): Handler {
  return async (req: NextRequest) => {
    // Primary: cookie-based session
    try {
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await (await supabase).auth.getUser()
      if (user) return handler(req)
    } catch {}

    // Fallback: Bearer token in Authorization header
    const auth = req.headers.get('authorization') || ''
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7)
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (url && anon) {
        try {
          const anonClient = createClient(url, anon)
          const { data: tokenUser } = await anonClient.auth.getUser(token)
          if (tokenUser?.user) return handler(req)
        } catch {}
      }
    }

    return errors.unauthorized()
  }
}

export function compose(...middlewares: ((h: Handler) => Handler)[]) {
  return (handler: Handler) => middlewares.reduceRight((acc, mw) => mw(acc), handler)
}

