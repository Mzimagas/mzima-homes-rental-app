// Lightweight logger with redaction and environment-aware output

const isProd = process.env.NODE_ENV === 'production'

export function redactEmail(email?: string | null): string {
  if (!email) return ''
  try {
    const [local, domain] = email.split('@')
    if (!domain) return '***'
    const redactedLocal = local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***${local[local.length - 1]}`
    const parts = domain.split('.')
    const redactedDomain = parts.length > 1
      ? `${parts[0][0]}***.${parts.slice(1).join('.')}`
      : `${domain[0]}***`
    return `${redactedLocal}@${redactedDomain}`
  } catch {
    return '***'
  }
}

function fmt(args: any[]) {
  return args.map((a) => (a && typeof a === 'object' ? safeClone(a) : a))
}

function safeClone(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (key.toLowerCase().includes('password')) return '***'
      if (key.toLowerCase().includes('token')) return '***'
      if (key.toLowerCase().includes('secret')) return '***'
      return value
    }))
  } catch {
    return '[unserializable]'
  }
}

export const logger = {
  debug: (...args: any[]) => {
    if (!isProd) console.debug(...fmt(args))
  },
  info: (...args: any[]) => {
    if (!isProd) console.info(...fmt(args))
  },
  warn: (...args: any[]) => {
    // Warnings may be useful in prod, but keep sparse
    if (!isProd) console.warn(...fmt(args))
  },
  error: (...args: any[]) => {
    // Always log errors, but redact
    console.error(...fmt(args))
  },
}

// Helper to silence noisy auth logs in production quickly
export function shouldLogAuth(): boolean {
  return !isProd
}

