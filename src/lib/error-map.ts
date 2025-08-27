// Centralized mapping from raw error messages to user-friendly, non-enumerating messages

export function mapAuthErrorToMessage(raw?: string): string {
  const msg = (raw || '').toLowerCase()

  // Non-enumerating generic messages for sign-in
  if (
    msg.includes('invalid login') ||
    msg.includes('invalid credentials') ||
    msg.includes('not confirmed')
  ) {
    return 'Invalid email or password. Please try again.'
  }

  if (msg.includes('network'))
    return 'Network error. Please check your internet connection and try again.'
  if (msg.includes('timeout')) return 'Request timed out. Please try again.'

  // Default generic
  return 'Something went wrong. Please try again.'
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'
}

export function passwordStrength(pw: string): PasswordStrength {
  let score = 0 as 0 | 1 | 2 | 3 | 4
  if (!pw) return { score: 0, label: 'Very weak' }
  const len = pw.length
  const lower = /[a-z]/.test(pw)
  const upper = /[A-Z]/.test(pw)
  const digit = /[0-9]/.test(pw)
  const sym = /[^A-Za-z0-9]/.test(pw)
  const classes = [lower, upper, digit, sym].filter(Boolean).length

  if (len >= 10) score = (score + 1) as typeof score
  if (classes >= 2) score = (score + 1) as typeof score
  if (classes >= 3) score = (score + 1) as typeof score
  if (len >= 14 && classes === 4) score = (score + 1) as typeof score

  const label = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][
    score
  ] as PasswordStrength['label']
  return { score, label }
}
