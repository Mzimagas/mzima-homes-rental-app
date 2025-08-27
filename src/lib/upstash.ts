import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: any | null = null
let redisClient: any | null = null

function hasUpstashEnv() {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
}

export function getRedis() {
  if (redisClient) return redisClient

  if (hasUpstashEnv()) {
    redisClient = Redis.fromEnv()
    return redisClient
  }

  // Fallback no-op Redis for local/dev when Upstash is not configured
  const store = new Map<string, { value: string; exp?: number }>()
  redisClient = {
    async ttl(key: string) {
      const rec = store.get(key)
      if (!rec) return 0
      if (rec.exp && Date.now() > rec.exp) {
        store.delete(key)
        return 0
      }
      return rec.exp ? Math.max(0, Math.floor((rec.exp - Date.now()) / 1000)) : -1
    },
    async set(key: string, value: string, opts?: { ex?: number }) {
      const exp = opts?.ex ? Date.now() + opts.ex * 1000 : undefined
      store.set(key, { value, exp })
      return 'OK'
    },
    async incr(key: string) {
      const rec = store.get(key)
      const n = rec ? Number(rec.value) + 1 : 1
      store.set(key, { value: String(n), exp: rec?.exp })
      return n
    },
    async expire(key: string, seconds: number) {
      const rec = store.get(key)
      if (rec) store.set(key, { value: rec.value, exp: Date.now() + seconds * 1000 })
      return 1
    },
    async sadd(key: string, member: string) {
      const rec = store.get(key)
      const set = new Set<string>(rec ? JSON.parse(rec.value) : [])
      set.add(member)
      store.set(key, { value: JSON.stringify(Array.from(set)) })
      return 1
    },
    async smembers<T = string>(key: string): Promise<T[]> {
      const rec = store.get(key)
      if (!rec) return []
      try {
        return JSON.parse(rec.value)
      } catch {
        return []
      }
    },
  }
  return redisClient
}

export function getRatelimit() {
  if (ratelimit) return ratelimit

  if (hasUpstashEnv()) {
    const redis = getRedis()
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'voi-auth',
    })
    return ratelimit
  }

  // Fallback permissive limiter
  ratelimit = {
    async limit(_key: string) {
      return { success: true, limit: 10, remaining: 10, reset: Date.now() + 60_000 }
    },
  }
  return ratelimit
}
