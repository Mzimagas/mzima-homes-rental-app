/**
 * Authentication Service
 * Handles user authentication, MFA, and session management
 */

export interface AuthenticationCredentials {
  email: string
  password: string
  mfaToken?: string
  rememberMe?: boolean
}

export interface AuthenticationResult {
  success: boolean
  user?: AuthenticatedUser
  accessToken?: string
  refreshToken?: string
  mfaRequired?: boolean
  mfaChallenge?: MFAChallenge
  errors?: string[]
}

export interface AuthenticatedUser {
  id: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
  lastLoginAt?: Date
  mfaEnabled: boolean
  accountStatus: 'active' | 'suspended' | 'locked' | 'pending'
}

export interface MFAChallenge {
  challengeId: string
  method: 'sms' | 'email' | 'totp' | 'backup_codes'
  maskedTarget?: string
  expiresAt: Date
}

export interface SessionInfo {
  sessionId: string
  userId: string
  createdAt: Date
  lastActivityAt: Date
  ipAddress: string
  userAgent: string
  isActive: boolean
}

export class AuthenticationService {
  private activeSessions = new Map<string, SessionInfo>()
  private mfaChallenges = new Map<string, MFAChallenge>()
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date }>()

  // Primary authentication
  async authenticate(credentials: AuthenticationCredentials): Promise<AuthenticationResult> {
    try {
      // Rate limiting check
      if (this.isRateLimited(credentials.email)) {
        return {
          success: false,
          errors: ['Too many failed attempts. Please try again later.']
        }
      }

      // Validate credentials
      const user = await this.validateCredentials(credentials.email, credentials.password)
      if (!user) {
        this.recordFailedAttempt(credentials.email)
        return {
          success: false,
          errors: ['Invalid email or password']
        }
      }

      // Check account status
      if (user.accountStatus !== 'active') {
        return {
          success: false,
          errors: [`Account is ${user.accountStatus}. Please contact support.`]
        }
      }

      // Check if MFA is required
      if (user.mfaEnabled && !credentials.mfaToken) {
        const mfaChallenge = await this.createMFAChallenge(user.id)
        return {
          success: false,
          mfaRequired: true,
          mfaChallenge
        }
      }

      // Verify MFA if provided
      if (user.mfaEnabled && credentials.mfaToken) {
        const mfaValid = await this.verifyMFAToken(user.id, credentials.mfaToken)
        if (!mfaValid) {
          this.recordFailedAttempt(credentials.email)
          return {
            success: false,
            errors: ['Invalid MFA token']
          }
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user)

      // Create session
      const session = await this.createSession(user.id, credentials)

      // Clear failed attempts
      this.clearFailedAttempts(credentials.email)

      // Update last login
      await this.updateLastLogin(user.id)

      return {
        success: true,
        user,
        accessToken,
        refreshToken
      }

    } catch (error) {
      return {
        success: false,
        errors: ['Authentication failed. Please try again.']
      }
    }
  }

  // MFA Management
  async enableMFA(userId: string, method: 'sms' | 'email' | 'totp'): Promise<{
    success: boolean
    secret?: string
    qrCode?: string
    backupCodes?: string[]
    error?: string
  }> {
    try {
      const user = await this.getUserById(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      switch (method) {
        case 'totp':
          const secret = this.generateTOTPSecret()
          const qrCode = this.generateQRCode(user.email, secret)
          const backupCodes = this.generateBackupCodes()
          
          // Store MFA configuration
          await this.storeMFAConfig(userId, {
            method: 'totp',
            secret,
            backupCodes,
            enabled: false // Will be enabled after verification
          })

          return {
            success: true,
            secret,
            qrCode,
            backupCodes
          }

        case 'sms':
        case 'email':
          // Store MFA configuration
          await this.storeMFAConfig(userId, {
            method,
            enabled: false
          })

          return { success: true }

        default:
          return { success: false, error: 'Unsupported MFA method' }
      }
    } catch (error) {
      return { success: false, error: 'Failed to enable MFA' }
    }
  }

  async verifyMFASetup(userId: string, token: string): Promise<boolean> {
    try {
      const mfaConfig = await this.getMFAConfig(userId)
      if (!mfaConfig) return false

      const isValid = await this.verifyMFAToken(userId, token)
      if (isValid) {
        // Enable MFA
        await this.updateMFAConfig(userId, { enabled: true })
        return true
      }

      return false
    } catch (error) {
      return false
    }
  }

  async disableMFA(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId)
      if (!user) return false

      // Verify password
      const isValidPassword = await this.verifyPassword(userId, password)
      if (!isValidPassword) return false

      // Disable MFA
      await this.removeMFAConfig(userId)
      return true
    } catch (error) {
      return false
    }
  }

  // Session Management
  async createSession(userId: string, credentials: AuthenticationCredentials): Promise<SessionInfo> {
    const sessionId = this.generateSessionId()
    const session: SessionInfo = {
      sessionId,
      userId,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
      isActive: true
    }

    this.activeSessions.set(sessionId, session)
    
    // Store in persistent storage
    await this.storeSession(session)

    return session
  }

  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.activeSessions.get(sessionId) || await this.getStoredSession(sessionId)
    
    if (!session || !session.isActive) {
      return null
    }

    // Check session expiry (24 hours)
    const maxAge = 24 * 60 * 60 * 1000
    if (Date.now() - session.lastActivityAt.getTime() > maxAge) {
      await this.invalidateSession(sessionId)
      return null
    }

    // Update last activity
    session.lastActivityAt = new Date()
    this.activeSessions.set(sessionId, session)
    await this.updateSessionActivity(sessionId)

    return session
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.isActive = false
      this.activeSessions.delete(sessionId)
      await this.removeStoredSession(sessionId)
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    // Invalidate active sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        await this.invalidateSession(sessionId)
      }
    }

    // Invalidate stored sessions
    await this.removeAllUserSessions(userId)
  }

  // Token Management
  async generateTokens(user: AuthenticatedUser): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    const accessToken = await this.generateAccessToken(user)
    const refreshToken = await this.generateRefreshToken(user.id)

    return { accessToken, refreshToken }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean
    accessToken?: string
    error?: string
  }> {
    try {
      const userId = await this.validateRefreshToken(refreshToken)
      if (!userId) {
        return { success: false, error: 'Invalid refresh token' }
      }

      const user = await this.getUserById(userId)
      if (!user || user.accountStatus !== 'active') {
        return { success: false, error: 'User not found or inactive' }
      }

      const accessToken = await this.generateAccessToken(user)
      return { success: true, accessToken }
    } catch (error) {
      return { success: false, error: 'Token refresh failed' }
    }
  }

  // Security utilities
  private isRateLimited(email: string): boolean {
    const attempts = this.failedAttempts.get(email)
    if (!attempts) return false

    const maxAttempts = 5
    const windowMs = 15 * 60 * 1000 // 15 minutes

    return attempts.count >= maxAttempts && 
           Date.now() - attempts.lastAttempt.getTime() < windowMs
  }

  private recordFailedAttempt(email: string): void {
    const current = this.failedAttempts.get(email) || { count: 0, lastAttempt: new Date() }
    current.count += 1
    current.lastAttempt = new Date()
    this.failedAttempts.set(email, current)
  }

  private clearFailedAttempts(email: string): void {
    this.failedAttempts.delete(email)
  }

  private async createMFAChallenge(userId: string): Promise<MFAChallenge> {
    const challengeId = this.generateChallengeId()
    const mfaConfig = await this.getMFAConfig(userId)
    
    const challenge: MFAChallenge = {
      challengeId,
      method: mfaConfig?.method || 'email',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      maskedTarget: this.getMaskedTarget(userId, mfaConfig?.method || 'email')
    }

    this.mfaChallenges.set(challengeId, challenge)

    // Send MFA code
    await this.sendMFACode(userId, challenge)

    return challenge
  }

  private async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    const mfaConfig = await this.getMFAConfig(userId)
    if (!mfaConfig) return false

    switch (mfaConfig.method) {
      case 'totp':
        return this.verifyTOTPToken(mfaConfig.secret, token)
      case 'sms':
      case 'email':
        return this.verifyOTPToken(userId, token)
      default:
        return false
    }
  }

  // Mock implementations (replace with real implementations)
  private async validateCredentials(email: string, password: string): Promise<AuthenticatedUser | null> {
    // Mock implementation - integrate with your user repository
    return {
      id: 'user_123',
      email,
      fullName: 'John Doe',
      roles: ['property_manager'],
      permissions: ['read:properties', 'write:properties'],
      mfaEnabled: false,
      accountStatus: 'active'
    }
  }

  private async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    // Mock implementation
    return null
  }

  private async generateAccessToken(user: AuthenticatedUser): Promise<string> {
    // Mock implementation - use JWT library
    return `access_token_${user.id}_${Date.now()}`
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // Mock implementation
    return `refresh_token_${userId}_${Date.now()}`
  }

  private async validateRefreshToken(token: string): Promise<string | null> {
    // Mock implementation
    return 'user_123'
  }

  private generateTOTPSecret(): string {
    // Mock implementation - use crypto library
    return 'JBSWY3DPEHPK3PXP'
  }

  private generateQRCode(email: string, secret: string): string {
    // Mock implementation - generate QR code for TOTP
    return `otpauth://totp/MzimaHomes:${email}?secret=${secret}&issuer=MzimaHomes`
  }

  private generateBackupCodes(): string[] {
    // Mock implementation
    return Array.from({ length: 10 }, () => 
      Math.random().toString(36).substr(2, 8).toUpperCase()
    )
  }

  private verifyTOTPToken(secret: string, token: string): boolean {
    // Mock implementation - use TOTP library
    return token.length === 6 && /^\d+$/.test(token)
  }

  private verifyOTPToken(userId: string, token: string): boolean {
    // Mock implementation
    return token.length === 6 && /^\d+$/.test(token)
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateChallengeId(): string {
    return `chal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentIP(): string {
    return '127.0.0.1' // Mock implementation
  }

  private getCurrentUserAgent(): string {
    return 'Mozilla/5.0...' // Mock implementation
  }

  private getMaskedTarget(userId: string, method: string): string {
    // Mock implementation
    if (method === 'email') return 'j***@example.com'
    if (method === 'sms') return '+1***-***-1234'
    return ''
  }

  // Storage methods (implement with your database)
  private async storeMFAConfig(userId: string, config: any): Promise<void> {}
  private async getMFAConfig(userId: string): Promise<any> { return null }
  private async updateMFAConfig(userId: string, updates: any): Promise<void> {}
  private async removeMFAConfig(userId: string): Promise<void> {}
  private async storeSession(session: SessionInfo): Promise<void> {}
  private async getStoredSession(sessionId: string): Promise<SessionInfo | null> { return null }
  private async updateSessionActivity(sessionId: string): Promise<void> {}
  private async removeStoredSession(sessionId: string): Promise<void> {}
  private async removeAllUserSessions(userId: string): Promise<void> {}
  private async sendMFACode(userId: string, challenge: MFAChallenge): Promise<void> {}
  private async verifyPassword(userId: string, password: string): Promise<boolean> { return false }
  private async updateLastLogin(userId: string): Promise<void> {}
}
