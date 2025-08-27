// Security and Encryption Implementation
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import supabase from '../supabase-client'

// Note: This should only be used server-side with service role key
// For client-side operations, use the regular supabase client
const getAdminSupabaseClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Admin Supabase client should not be used on client-side')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits

// Get encryption key from environment
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  return Buffer.from(key, 'hex')
}

// Encryption utilities
export class EncryptionService {
  // Encrypt sensitive data
  static encrypt(text: string): string {
    try {
      const key = getEncryptionKey()
      const iv = crypto.randomBytes(IV_LENGTH)
      const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key)

      cipher.setAAD(Buffer.from('additional-data'))

      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const tag = cipher.getAuthTag()

      // Combine iv, tag, and encrypted data
      return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    try {
      const key = getEncryptionKey()
      const parts = encryptedData.split(':')

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const tag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]

      const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key)
      decipher.setAAD(Buffer.from('additional-data'))
      decipher.setAuthTag(tag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  // Hash passwords and sensitive data
  static hash(data: string, salt?: string): { hash: string; salt: string } {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(32)
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha512')

    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex'),
    }
  }

  // Verify hashed data
  static verifyHash(data: string, hash: string, salt: string): boolean {
    const hashedData = this.hash(data, salt)
    return hashedData.hash === hash
  }

  // Generate secure random tokens
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  // Generate API keys
  static generateApiKey(): string {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(16).toString('hex')
    return `ak_${timestamp}_${random}`
  }
}

// Data masking for sensitive information
export class DataMaskingService {
  // Mask ID numbers (show only last 4 digits)
  static maskIdNumber(idNumber: string): string {
    if (!idNumber || idNumber.length < 4) return '****'
    return '*'.repeat(idNumber.length - 4) + idNumber.slice(-4)
  }

  // Mask phone numbers (show only last 4 digits)
  static maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 4) return '****'
    const cleaned = phone.replace(/\D/g, '')
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4)
  }

  // Mask email addresses
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '****@****.***'

    const [username, domain] = email.split('@')
    const maskedUsername =
      username.length > 2
        ? username[0] + '*'.repeat(username.length - 2) + username.slice(-1)
        : '**'

    const [domainName, extension] = domain.split('.')
    const maskedDomain =
      domainName.length > 2
        ? domainName[0] + '*'.repeat(domainName.length - 2) + domainName.slice(-1)
        : '**'

    return `${maskedUsername}@${maskedDomain}.${extension}`
  }

  // Mask KRA PIN
  static maskKraPin(kraPin: string): string {
    if (!kraPin || kraPin.length < 4) return '****'
    return kraPin[0] + '*'.repeat(kraPin.length - 2) + kraPin.slice(-1)
  }

  // Mask bank account numbers
  static maskBankAccount(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return '****'
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
  }
}

// Audit logging service
export class AuditService {
  // Log user activities
  static async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await supabase.from('activities_audit').insert({
        actor_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        description: `${action} ${entityType}`,
        before_snapshot: details?.before || null,
        after_snapshot: details?.after || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error logging audit activity:', error)
    }
  }

  // Log data access
  static async logDataAccess(
    userId: string,
    entityType: string,
    entityId: string,
    accessType: 'read' | 'write' | 'delete',
    ipAddress?: string
  ): Promise<void> {
    try {
      await supabase.from('data_access_logs').insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        access_type: accessType,
        ip_address: ipAddress,
        accessed_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error logging data access:', error)
    }
  }

  // Log security events
  static async logSecurityEvent(
    eventType:
      | 'login_success'
      | 'login_failure'
      | 'password_change'
      | 'permission_denied'
      | 'suspicious_activity',
    userId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await supabase.from('security_events').insert({
        event_type: eventType,
        user_id: userId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error logging security event:', error)
    }
  }

  // Get audit trail for entity
  static async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('activities_audit')
        .select(
          `
          *,
          users:actor_id(email, raw_user_meta_data)
        `
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting audit trail:', error)
      return []
    }
  }
}

// Input validation and sanitization
export class InputValidator {
  // Sanitize string input
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return ''

    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, '') // Remove angle brackets
  }

  // Validate and sanitize email
  static validateEmail(email: string): { isValid: boolean; sanitized: string } {
    const sanitized = this.sanitizeString(email).toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    return {
      isValid: emailRegex.test(sanitized),
      sanitized,
    }
  }

  // Validate phone number
  static validatePhoneNumber(phone: string): { isValid: boolean; sanitized: string } {
    const sanitized = phone.replace(/\D/g, '') // Remove non-digits
    const kenyanPhoneRegex = /^(254|0)[17]\d{8}$/

    return {
      isValid: kenyanPhoneRegex.test(sanitized),
      sanitized,
    }
  }

  // Validate ID number
  static validateIdNumber(idNumber: string): { isValid: boolean; sanitized: string } {
    const sanitized = idNumber.replace(/\D/g, '') // Remove non-digits

    return {
      isValid: sanitized.length >= 7 && sanitized.length <= 8,
      sanitized,
    }
  }

  // Validate KRA PIN
  static validateKraPin(kraPin: string): { isValid: boolean; sanitized: string } {
    const sanitized = kraPin.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const kraPinRegex = /^[A-Z]\d{9}[A-Z]$/

    return {
      isValid: kraPinRegex.test(sanitized),
      sanitized,
    }
  }

  // Validate monetary amounts
  static validateAmount(amount: any): { isValid: boolean; value: number } {
    const numericAmount = parseFloat(amount)

    return {
      isValid: !isNaN(numericAmount) && numericAmount >= 0 && numericAmount <= 999999999,
      value: numericAmount,
    }
  }

  // Validate UUID
  static validateUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}

// File security service
export class FileSecurityService {
  // Allowed file types
  private static allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  // Maximum file size (10MB)
  private static maxFileSize = 10 * 1024 * 1024

  // Validate file upload
  static validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`)
    }

    // Check file type
    if (!this.allowedMimeTypes.includes(file.type)) {
      errors.push('File type not allowed')
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name too long')
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.php$/i,
    ]

    if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
      errors.push('Suspicious file type detected')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Generate secure file name
  static generateSecureFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    const extension = originalName.split('.').pop()?.toLowerCase() || ''

    return `${timestamp}_${random}.${extension}`
  }

  // Scan file for malware (placeholder - integrate with actual antivirus service)
  static async scanFile(fileBuffer: Buffer): Promise<{ isClean: boolean; threats: string[] }> {
    // This is a placeholder implementation
    // In production, integrate with services like ClamAV, VirusTotal, etc.

    // Simple check for suspicious patterns
    const fileContent = fileBuffer.toString('utf8', 0, Math.min(1024, fileBuffer.length))
    const suspiciousPatterns = [/<script/i, /javascript:/i, /vbscript:/i, /onload=/i, /onerror=/i]

    const threats = suspiciousPatterns
      .filter((pattern) => pattern.test(fileContent))
      .map((pattern) => `Suspicious pattern: ${pattern.source}`)

    return {
      isClean: threats.length === 0,
      threats,
    }
  }
}

// Rate limiting service
export class RateLimitService {
  private static attempts = new Map<string, { count: number; resetTime: number }>()

  // Check rate limit
  static checkRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = identifier

    let record = this.attempts.get(key)

    // Reset if window has expired
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    record.count++
    this.attempts.set(key, record)

    const allowed = record.count <= maxAttempts
    const remaining = Math.max(0, maxAttempts - record.count)

    return {
      allowed,
      remaining,
      resetTime: record.resetTime,
    }
  }

  // Reset rate limit for identifier
  static resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier)
  }

  // Clean up expired records
  static cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key)
      }
    }
  }
}

// Security headers middleware
export class SecurityHeaders {
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.supabase.co https://sandbox.safaricom.co.ke https://api.safaricom.co.ke",
        "frame-ancestors 'none'",
        'frame-src https://challenges.cloudflare.com https://www.google.com',
      ].join('; '),
    }
  }
}

// Initialize security services
export const initializeSecurity = () => {
  // Start rate limit cleanup
  setInterval(
    () => {
      RateLimitService.cleanup()
    },
    5 * 60 * 1000
  ) // Every 5 minutes
}

// All services are already exported individually above
