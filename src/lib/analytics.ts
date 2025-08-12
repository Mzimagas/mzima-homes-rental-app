import posthog from 'posthog-js'

let inited = false

export function initAnalytics() {
  if (inited) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
  if (!key) return
  posthog.init(key, { api_host: host, capture_pageview: true, autocapture: true })
  inited = true
}

export function capture(event: string, props?: Record<string, any>) {
  try {
    if (!inited) initAnalytics()
    posthog.capture(event, props)
  } catch {}
}

