import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null
let redisClient: Redis | null = null

export function getRedis() {
  if (!redisClient) {
    redisClient = Redis.fromEnv()
  }
  return redisClient
}

export function getRatelimit() {
  if (!ratelimit) {
    const redis = getRedis()
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'voi-auth',
    })
  }
  return ratelimit
}

