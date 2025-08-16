/**
 * Comprehensive email validation utility for KodiRent
 * Prevents invalid emails that cause bounces and delivery failures
 */

export interface EmailValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

/**
 * Validates email format and checks for common patterns that cause bounces
 */
export function validateEmail(email: string): EmailValidationResult {
  const warnings: string[] = []

  // Basic checks
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' }
  }

  email = email.trim().toLowerCase()

  if (email.length === 0) {
    return { isValid: false, error: 'Email is required' }
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email address is too long' }
  }

  // RFC 5322 compliant email regex (more comprehensive than basic)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address format' }
  }

  // Split email into local and domain parts
  const [localPart, domainPart] = email.split('@')

  // Validate local part (before @)
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email address local part is too long' }
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, error: 'Email address contains invalid characters' }
  }

  // Validate domain part (after @)
  if (domainPart.length > 253) {
    return { isValid: false, error: 'Email domain is too long' }
  }

  // Check for invalid test/example domains that cause bounces
  const invalidDomains = [
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'test.org',
    'test.net',
    'localhost',
    'invalid',
    'local'
  ]

  const invalidDomainPatterns = [
    /\.example$/i,
    /\.test$/i,
    /\.invalid$/i,
    /\.local$/i,
    /\.localhost$/i
  ]

  // Check exact domain matches
  if (invalidDomains.includes(domainPart)) {
    return { 
      isValid: false, 
      error: 'Please use a valid, deliverable email address. Test and example domains are not allowed.' 
    }
  }

  // Check domain patterns
  for (const pattern of invalidDomainPatterns) {
    if (pattern.test(domainPart)) {
      return { 
        isValid: false, 
        error: 'Please use a valid, deliverable email address. Test and example domains are not allowed.' 
      }
    }
  }

  // Check for common test email prefixes
  const testPrefixes = ['test', 'admin', 'noreply', 'no-reply', 'debug', 'dummy']
  if (testPrefixes.some(prefix => localPart.startsWith(prefix))) {
    warnings.push('This appears to be a test email address. Please use your actual email.')
  }

  // Check for valid TLD (at least 2 characters)
  const tldMatch = domainPart.match(/\.([a-zA-Z]{2,})$/)
  if (!tldMatch || tldMatch[1].length < 2) {
    return { isValid: false, error: 'Please enter an email with a valid domain extension' }
  }

  // Check for suspicious patterns that might indicate typos
  const suspiciousPatterns = [
    /gmail\.co$/i,  // Should be gmail.com
    /yahoo\.co$/i,  // Should be yahoo.com
    /hotmail\.co$/i, // Should be hotmail.com
    /outlook\.co$/i  // Should be outlook.com
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(domainPart)) {
      warnings.push('Please check your email domain - it may contain a typo.')
    }
  }

  return { 
    isValid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  }
}

/**
 * Simple validation function that returns just the error message (for backward compatibility)
 */
export function validateEmailSimple(email: string): string | null {
  const result = validateEmail(email)
  return result.isValid ? null : result.error || 'Invalid email address'
}

/**
 * Check if an email domain is likely to be deliverable
 * This is a basic check - for production, consider using a proper email validation service
 */
export function isDomainLikelyDeliverable(domain: string): boolean {
  // Common email providers that are definitely deliverable
  const knownGoodDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'protonmail.com',
    'aol.com',
    'live.com',
    'msn.com',
    'ymail.com'
  ]

  return knownGoodDomains.includes(domain.toLowerCase())
}

/**
 * Enhanced validation for production use
 * Includes additional checks for deliverability
 */
export function validateEmailForProduction(email: string): EmailValidationResult {
  const basicResult = validateEmail(email)
  
  if (!basicResult.isValid) {
    return basicResult
  }

  const [, domainPart] = email.toLowerCase().split('@')
  const warnings = basicResult.warnings || []

  // Add warning for unknown domains (might want to verify these)
  if (!isDomainLikelyDeliverable(domainPart)) {
    warnings.push('Please verify this email address is correct and deliverable.')
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}
