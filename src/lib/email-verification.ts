/**
 * Two-Step Email Verification System
 * Validates email deliverability before sending authentication emails
 */

import { validateEmail, EmailValidationResult } from './email-validation'

export interface EmailVerificationResult {
  isValid: boolean
  isDeliverable: boolean
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
  errors: string[]
  shouldProceed: boolean
}

/**
 * Known reliable email providers
 */
const RELIABLE_PROVIDERS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'live.com',
  'msn.com',
  'ymail.com',
  'mail.com',
  'zoho.com'
]

/**
 * Common typos in email domains
 */
const COMMON_TYPOS = {
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmai.com': 'gmail.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com'
}

/**
 * Comprehensive email verification before sending authentication emails
 */
export async function verifyEmailForDelivery(email: string): Promise<EmailVerificationResult> {
  const result: EmailVerificationResult = {
    isValid: false,
    isDeliverable: false,
    confidence: 'low',
    warnings: [],
    errors: [],
    shouldProceed: false
  }

  // Step 1: Basic validation
  const basicValidation = validateEmail(email)
  if (!basicValidation.isValid) {
    result.errors.push(basicValidation.error || 'Invalid email format')
    return result
  }

  result.isValid = true
  if (basicValidation.warnings) {
    result.warnings.push(...basicValidation.warnings)
  }

  const [localPart, domain] = email.toLowerCase().split('@')

  // Step 2: Check for typos and suggest corrections
  const typoSuggestion = (COMMON_TYPOS as Record<string, string>)[domain]
  if (typoSuggestion) {
    result.errors.push(`Did you mean ${localPart}@${typoSuggestion}?`)
    result.confidence = 'low'
    return result
  }

  // Step 3: Check domain reliability
  if (RELIABLE_PROVIDERS.includes(domain)) {
    result.isDeliverable = true
    result.confidence = 'high'
    result.shouldProceed = true
  } else {
    // Step 4: Additional checks for unknown domains
    const domainChecks = await performDomainChecks(domain)
    result.isDeliverable = domainChecks.hasValidMX
    result.confidence = domainChecks.confidence
    result.warnings.push(...domainChecks.warnings)
    result.errors.push(...domainChecks.errors)
    result.shouldProceed = domainChecks.shouldProceed
  }

  // Step 5: Final decision logic
  if (result.isValid && result.isDeliverable && result.errors.length === 0) {
    result.shouldProceed = true
  }

  return result
}

/**
 * Perform basic domain checks (simplified version)
 * In production, you might want to use a proper email validation service
 */
async function performDomainChecks(domain: string): Promise<{
  hasValidMX: boolean
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
  errors: string[]
  shouldProceed: boolean
}> {
  const warnings: string[] = []
  const errors: string[] = []

  // Basic domain format checks
  if (!domain.includes('.')) {
    errors.push('Domain appears to be invalid (no TLD)')
    return { hasValidMX: false, confidence: 'low', warnings, errors, shouldProceed: false }
  }

  const tld = domain.split('.').pop()
  if (!tld || tld.length < 2) {
    errors.push('Invalid domain extension')
    return { hasValidMX: false, confidence: 'low', warnings, errors, shouldProceed: false }
  }

  // Check for suspicious patterns
  if (domain.includes('temp') || domain.includes('disposable') || domain.includes('10minute')) {
    errors.push('Temporary or disposable email addresses are not allowed')
    return { hasValidMX: false, confidence: 'low', warnings, errors, shouldProceed: false }
  }

  // For unknown domains, be cautious but allow
  warnings.push('Email domain is not recognized. Please verify this is your correct email address.')
  
  return { 
    hasValidMX: true, 
    confidence: 'medium', 
    warnings, 
    errors, 
    shouldProceed: true 
  }
}

/**
 * Pre-flight check before attempting user registration
 */
export async function preflightEmailCheck(email: string): Promise<{
  canProceed: boolean
  message: string
  suggestions?: string[]
}> {
  const verification = await verifyEmailForDelivery(email)

  if (!verification.isValid) {
    return {
      canProceed: false,
      message: verification.errors[0] || 'Invalid email address'
    }
  }

  if (!verification.shouldProceed) {
    return {
      canProceed: false,
      message: verification.errors[0] || 'Email address may not be deliverable',
      suggestions: verification.warnings
    }
  }

  if (verification.warnings.length > 0) {
    return {
      canProceed: true,
      message: 'Email appears valid, but please verify it is correct',
      suggestions: verification.warnings
    }
  }

  return {
    canProceed: true,
    message: 'Email address verified successfully'
  }
}

/**
 * Enhanced signup flow with email verification
 */
export async function enhancedSignupFlow(
  email: string,
  password: string,
  fullName: string,
  signUpFunction: (email: string, password: string, fullName: string) => Promise<any>
): Promise<{
  success: boolean
  error?: string
  warnings?: string[]
  data?: any
}> {
  // Step 1: Pre-flight email check
  const preflightCheck = await preflightEmailCheck(email)
  
  if (!preflightCheck.canProceed) {
    return {
      success: false,
      error: preflightCheck.message,
      warnings: preflightCheck.suggestions
    }
  }

  // Step 2: Proceed with signup if email is verified
  try {
    const result = await signUpFunction(email, password, fullName)
    
    return {
      success: !result.error,
      error: result.error,
      warnings: preflightCheck.suggestions,
      data: result.data
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Signup failed'
    }
  }
}

/**
 * Suggest email corrections for common typos
 */
export function suggestEmailCorrection(email: string): string | null {
  if (!email.includes('@')) return null
  
  const [localPart, domain] = email.toLowerCase().split('@')
  const suggestion = (COMMON_TYPOS as Record<string, string>)[domain]

  return suggestion ? `${localPart}@${suggestion}` : null
}
