export function strengthScore(pw: string): { score: 0|1|2|3|4; label: string } {
  let score: 0|1|2|3|4 = 0
  if (!pw) return { score, label: 'Very weak' }
  const len = pw.length
  const lower = /[a-z]/.test(pw)
  const upper = /[A-Z]/.test(pw)
  const digit = /[0-9]/.test(pw)
  const sym = /[^A-Za-z0-9]/.test(pw)
  const classes = [lower, upper, digit, sym].filter(Boolean).length
  if (len >= 10) score++
  if (classes >= 2) score++
  if (classes >= 3) score++
  if (len >= 14 && classes === 4) score++
  const label = ['Very weak','Weak','Fair','Strong','Very strong'][score]
  return { score, label }
}

