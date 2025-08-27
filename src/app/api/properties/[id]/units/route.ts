import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { errors } from '../../../../../lib/api/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, serviceKey)
    const {
      data: { user },
    } = await supabase.auth.getUser(token)
    return user?.id || null
  } catch {
    return null
  }
}

async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: membership } = await admin
      .from('property_users')
      .select('role, status')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle()

    return (
      membership?.status === 'ACTIVE' && ['OWNER', 'PROPERTY_MANAGER'].includes(membership.role)
    )
  } catch {
    return false
  }
}

// GET /api/properties/[id]/units - List units for a property
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const hasAccess = await checkPropertyAccess(userId, params.id)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: units, error } = await admin
      .from('units')
      .select('id, unit_label')
      .eq('property_id', params.id)
      .order('unit_label')

    if (error) return errors.internal('Failed to fetch units')
    return NextResponse.json({ ok: true, data: units })
  } catch (e: any) {
    return errors.internal(e?.message || 'Failed')
  }
}
