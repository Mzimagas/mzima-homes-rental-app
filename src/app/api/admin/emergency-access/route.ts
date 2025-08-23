/**
 * EMERGENCY ACCESS API ENDPOINT
 * 
 * This endpoint provides emergency access creation for permanent super-admins.
 * It serves as a disaster recovery mechanism when normal authentication fails.
 * 
 * SECURITY FEATURES:
 * - Only accessible by hardcoded super-admin emails
 * - Creates/ensures authentication access for emergency situations
 * - Comprehensive audit logging
 * - Rate limiting to prevent abuse
 * 
 * USAGE:
 * POST /api/admin/emergency-access
 * Body: { "email": "mzimagas@gmail.com", "action": "create_access" }
 */

import { NextRequest, NextResponse } from 'next/server'
import AdminBackdoorService from '../../../../lib/auth/admin-backdoor'
import { getRatelimit } from '../../../../lib/upstash'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for security
    const ratelimit = getRatelimit()
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `emergency_access:${ip}`,
      5, // 5 attempts
      '1h' // per hour
    )

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Emergency access attempts are limited.',
          limit,
          reset,
          remaining: 0
        },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { email, action } = body

    if (!email || !action) {
      return NextResponse.json(
        { success: false, error: 'Email and action are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email is authorized for emergency access
    if (!AdminBackdoorService.isPermanentSuperAdmin(email)) {
      // Log unauthorized attempt
      await AdminBackdoorService.logBackdoorUsage(
        email, 
        'UNAUTHORIZED_EMERGENCY_ACCESS_ATTEMPT',
        undefined,
        `IP: ${ip}, Action: ${action}`
      )
      
      return NextResponse.json(
        { success: false, error: 'Email not authorized for emergency access' },
        { status: 403 }
      )
    }

    // Handle different emergency actions
    switch (action) {
      case 'create_access':
        const result = await AdminBackdoorService.createEmergencyAccess(email)
        
        return NextResponse.json({
          success: result.success,
          message: result.message,
          email: email,
          timestamp: new Date().toISOString(),
          remaining
        })

      case 'validate_system':
        const validation = AdminBackdoorService.validateBackdoorIntegrity()
        
        await AdminBackdoorService.logBackdoorUsage(
          email,
          'SYSTEM_VALIDATION',
          undefined,
          `Valid: ${validation.valid}, Issues: ${validation.issues.length}`
        )
        
        return NextResponse.json({
          success: true,
          validation,
          email: email,
          timestamp: new Date().toISOString(),
          remaining
        })

      case 'check_status':
        const superAdmins = AdminBackdoorService.getPermanentSuperAdmins()
        
        await AdminBackdoorService.logBackdoorUsage(
          email,
          'STATUS_CHECK',
          undefined,
          `Admins: ${superAdmins.length}`
        )
        
        return NextResponse.json({
          success: true,
          status: {
            isPermanentSuperAdmin: AdminBackdoorService.isPermanentSuperAdmin(email),
            totalSuperAdmins: superAdmins.length,
            systemIntegrity: AdminBackdoorService.validateBackdoorIntegrity()
          },
          email: email,
          timestamp: new Date().toISOString(),
          remaining
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported: create_access, validate_system, check_status' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Emergency access API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during emergency access',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // GET endpoint for system status (less sensitive)
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter required' },
        { status: 400 }
      )
    }

    if (!AdminBackdoorService.isPermanentSuperAdmin(email)) {
      return NextResponse.json(
        { success: false, error: 'Email not authorized' },
        { status: 403 }
      )
    }

    const validation = AdminBackdoorService.validateBackdoorIntegrity()
    const superAdmins = AdminBackdoorService.getPermanentSuperAdmins()

    await AdminBackdoorService.logBackdoorUsage(
      email,
      'SYSTEM_STATUS_CHECK',
      undefined,
      'GET request'
    )

    return NextResponse.json({
      success: true,
      status: {
        systemValid: validation.valid,
        issues: validation.issues,
        totalSuperAdmins: superAdmins.length,
        isPermanentSuperAdmin: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Emergency access status error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS if needed
export async function OPTIONS() {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        'Allow': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  )
}
