// Simple CSRF helper for double-submit cookie pattern
export function getCsrfTokenFromDom(): string | null {
  try {
    const match = document.cookie.split(';').map(p => p.trim()).find(p => p.startsWith('csrf-token='))
    if (!match) return null
    return decodeURIComponent(match.split('=')[1])
  } catch {
    return null
  }
}

