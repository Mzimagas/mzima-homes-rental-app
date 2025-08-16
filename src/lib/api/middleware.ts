import { NextRequest, NextResponse } from 'next/server'
import { errors } from './errors'
import { getRatelimit } from '../upstash'
import { createServerSupabaseClient } from '../supabase-server'

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
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errors.unauthorized()
    return handler(req)
  }
}

export function compose(...middlewares: ((h: Handler) => Handler)[]) {
  return (handler: Handler) => middlewares.reduceRight((acc, mw) => mw(acc), handler)
}

