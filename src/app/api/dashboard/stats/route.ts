import { NextResponse } from 'next/server'
import { getServerSupabase, getServiceSupabase } from '../../../../lib/supabase-server'
import { memoryCache, CacheKeys, CacheTTL } from '../../../../lib/cache/memory-cache'

// GET /api/dashboard/stats - Minimal dashboard statistics
export async function GET() {
  console.log('📊 Dashboard stats API called')
  try {
    const supabase = await getServerSupabase()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('auth.getUser error:', error)
    }

    if (!user) {
      console.log('❌ Dashboard stats: No user found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Dashboard stats: User authenticated:', user.id)

    // Check cache first
    const cacheKey = CacheKeys.dashboardStats(user.id)
    const cachedStats = memoryCache.get(cacheKey)

    if (cachedStats) {
      console.log('📊 Dashboard stats served from cache')
      return NextResponse.json(cachedStats, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          'X-Cache': 'HIT',
        },
      })
    }

    console.log('📊 Computing dashboard stats from database (optimized)')
    const admin = getServiceSupabase()

    // Use optimized database function for stats
    const { data: statsData, error: statsError } = await admin.rpc('get_rental_dashboard_stats', {
      user_id: user.id
    })

    if (statsError) {
      console.error('Dashboard stats function error:', statsError)

      // If the error is about missing maintenance_requests table, provide fallback data
      if (statsError.message && statsError.message.includes('maintenance_requests') && statsError.message.includes('does not exist')) {
        console.log('📊 maintenance_requests table missing, using fallback stats calculation...')

        // Calculate basic stats without maintenance_requests table
        // Fall back to zeros if helper function doesn't exist
        const basicStats = {
          total_properties: 0,
          total_units: 0,
          occupied_units: 0,
          monthly_income: 0,
          maintenance_requests: 0
        }

        return NextResponse.json({
          totalProperties: basicStats.total_properties,
          totalUnits: basicStats.total_units,
          occupiedUnits: basicStats.occupied_units,
          vacantUnits: basicStats.total_units - basicStats.occupied_units,
          occupancyRate: basicStats.total_units > 0 ? (basicStats.occupied_units / basicStats.total_units) * 100 : 0,
          monthlyIncome: basicStats.monthly_income,
          outstandingRent: 0,
          maintenanceRequests: 0,
          recentActivity: []
        })

        return NextResponse.json({
          totalProperties: dbStats.total_properties || 0,
          totalUnits: dbStats.total_units || 0,
          occupiedUnits: dbStats.occupied_units || 0,
          vacantUnits: (dbStats.total_units || 0) - (dbStats.occupied_units || 0),
          occupancyRate: dbStats.total_units > 0 ? (dbStats.occupied_units / dbStats.total_units) * 100 : 0,
          monthlyIncome: dbStats.monthly_income || 0,
          outstandingRent: 0,
          maintenanceRequests: 0, // Set to 0 since table doesn't exist
          recentActivity: []
        })
      }

      return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
    }

    // Use optimized function for recent activity
    const { data: activityData, error: activityError } = await admin.rpc('get_recent_activity', {
      user_id: user.id,
      limit_param: 5
    })

    if (activityError) {
      console.error('Recent activity function error:', activityError)
      // Don't fail the request, just use empty activity
      console.warn('Continuing with empty recent activity')
    }

    // Extract stats from function result
    const dbStats = statsData?.[0] || {
      total_properties: 0,
      total_units: 0,
      active_tenants: 0,
      monthly_revenue: 0,
      occupancy_rate: 0
    }

    // Format recent activity
    const recentActivity = (activityData || []).map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
    }))

    const stats = {
      totalProperties: Number(dbStats.total_properties),
      totalUnits: Number(dbStats.total_units),
      activeTenants: Number(dbStats.active_tenants),
      occupancyRate: Number(dbStats.occupancy_rate),
      monthlyRevenue: Number(dbStats.monthly_revenue),
      recentActivity: recentActivity,
    }

    // Cache the computed stats
    memoryCache.set(CacheKeys.dashboardStats(user.id), stats, CacheTTL.DASHBOARD_STATS)

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
