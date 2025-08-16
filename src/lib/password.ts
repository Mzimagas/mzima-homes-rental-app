export function strengthScore(pw: string): { score: 0|1|2|3|4; label: string } {
  let score = 0 as 0|1|2|3|4
  if (!pw) return { score, label: 'Very weak' }
  const len = pw.length
  const lower = /[a-z]/.test(pw)
  const upper = /[A-Z]/.test(pw)
  const digit = /[0-9]/.test(pw)
  const sym = /[^A-Za-z0-9]/.test(pw)
  const classes = [lower, upper, digit, sym].filter(Boolean).length
  if (len >= 10) score = (score + 1) as 0|1|2|3|4
  if (classes >= 2) score = (score + 1) as 0|1|2|3|4
  if (classes >= 3) score = (score + 1) as 0|1|2|3|4
  if (len >= 14 && classes === 4) score = (score + 1) as 0|1|2|3|4
  const label = ['Very weak','Weak','Fair','Strong','Very strong'][score] as 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'
  return { score, label }
}

