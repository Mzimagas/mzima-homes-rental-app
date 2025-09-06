// Dynamic import for analytics to reduce initial bundle size
let posthog: any = null

const loadPostHog = async () => {
  if (!posthog) {
    const posthogModule = await import('posthog-js')
    posthog = posthogModule.default
  }
  return posthog
}

let inited = false

export async function initAnalytics() {
  if (inited) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
  if (!key) return

  const ph = await loadPostHog()
  ph.init(key, { api_host: host, capture_pageview: true, autocapture: true })
  inited = true
}

export async function capture(event: string, props?: Record<string, any>) {
  try {
    if (!inited) await initAnalytics()
    const ph = await loadPostHog()
    ph.capture(event, props)
  } catch (error) {
    console.warn('Analytics capture failed:', error)
  }
}
