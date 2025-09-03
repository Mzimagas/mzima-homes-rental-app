import getSupabaseClient from './supabase-client'

const supabase = getSupabaseClient()

export interface HealthCheckResult {
  isHealthy: boolean
  error?: string
  latency?: number
  timestamp: Date
}

/**
 * Performs a health check on the Supabase connection
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    console.log('🏥 Performing Supabase health check...')

    // Simple health check - try to get auth settings
    const { data, error } = await supabase.auth.getSession()

    const latency = Date.now() - startTime

    if (error) {
      console.error('❌ Supabase health check failed:', error)
      return {
        isHealthy: false,
        error: error.message,
        latency,
        timestamp: new Date(),
      }
    }

    console.log(`✅ Supabase health check passed (${latency}ms)`)
    return {
      isHealthy: true,
      latency,
      timestamp: new Date(),
    }
  } catch (error) {
    const latency = Date.now() - startTime
    console.error('❌ Supabase health check exception:', error)

    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency,
      timestamp: new Date(),
    }
  }
}

/**
 * Checks if the current environment has proper Supabase configuration
 */
export function validateSupabaseConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  }

  // Validate URL format
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    } catch {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL')
    }
  }

  // Validate key format (should be a JWT)
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!key.startsWith('eyJ')) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY does not appear to be a valid JWT')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Performs a comprehensive Supabase connectivity test
 */
export async function performConnectivityTest(): Promise<{
  config: { isValid: boolean; errors: string[] }
  health: HealthCheckResult
  recommendations: string[]
}> {
  console.log('🔍 Performing comprehensive Supabase connectivity test...')

  const config = validateSupabaseConfig()
  const health = await checkSupabaseHealth()

  const recommendations: string[] = []

  if (!config.isValid) {
    recommendations.push('Fix environment variable configuration')
  }

  if (!health.isHealthy) {
    if (health.error?.includes('Failed to fetch') || health.error?.includes('Network error')) {
      recommendations.push('Check internet connection')
      recommendations.push('Verify Supabase project is not paused')
      recommendations.push('Check if firewall is blocking requests to supabase.co')
    }

    if (health.error?.includes('timeout')) {
      recommendations.push('Check network stability')
      recommendations.push('Try connecting from a different network')
    }

    if (health.error?.includes('401') || health.error?.includes('403')) {
      recommendations.push('Verify Supabase API keys are correct')
      recommendations.push('Check if Supabase project settings allow your domain')
    }
  }

  if (health.latency && health.latency > 5000) {
    recommendations.push('Network latency is high - consider checking connection quality')
  }

  return {
    config,
    health,
    recommendations,
  }
}

/**
 * Retry wrapper for Supabase operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`)
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`❌ Attempt ${attempt} failed:`, lastError.message)

      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${delayMs}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        delayMs *= 2 // Exponential backoff
      }
    }
  }

  throw lastError!
}
