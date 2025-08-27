// Simple in-memory rate limiter (works per-instance; for production use a distributed store like Upstash)

const globalAny = globalThis as any

if (!globalAny.__rateLimitStore) {
  globalAny.__rateLimitStore = new Map<string, { count: number; resetAt: number }>()
}

const store: Map<string, { count: number; resetAt: number }> = globalAny.__rateLimitStore

export type RateLimitOptions = {
  limit: number // max requests per window
  windowMs: number // window size in ms
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const rec = store.get(key)

  if (!rec || rec.resetAt < now) {
    const resetAt = now + opts.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: opts.limit - 1, resetAt }
  }

  if (rec.count < opts.limit) {
    rec.count += 1
    store.set(key, rec)
    return { allowed: true, remaining: opts.limit - rec.count, resetAt: rec.resetAt }
  }

  return { allowed: false, remaining: 0, resetAt: rec.resetAt }
}
