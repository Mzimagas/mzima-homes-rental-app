import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { errors } from '../../../../../../lib/api/errors'

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

async function checkPhotoAccess(
  userId: string,
  unitId: string,
  photoId: string
): Promise<{ hasAccess: boolean; photo?: any }> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)

    // Get photo and verify it belongs to the unit
    const { data: photo } = await admin
      .from('units_media')
      .select('*, units(property_id)')
      .eq('id', photoId)
      .eq('unit_id', unitId)
      .eq('type', 'PHOTO')
      .maybeSingle()

    if (!photo) return { hasAccess: false }

    // Check user access to property
    const { data: membership } = await admin
      .from('property_users')
      .select('role, status')
      .eq('user_id', userId)
      .eq('property_id', (photo as any).units.property_id)
      .maybeSingle()

    const hasAccess =
      membership?.status === 'ACTIVE' && ['OWNER', 'PROPERTY_MANAGER'].includes(membership.role)
    return { hasAccess, photo }
  } catch {
    return { hasAccess: false }
  }
}

// DELETE /api/units/[id]/photos/[photoId] - Delete a photo
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const { hasAccess, photo } = await checkPhotoAccess(userId, params.id, params.photoId)
    if (!hasAccess || !photo) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)

    // Extract file path from URL for storage deletion
    let filePath: string | null = null
    try {
      const url = new URL(photo.url)
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/public-media\/(.+)$/)
      if (pathMatch) filePath = pathMatch[1]
    } catch {}

    // Delete from database first
    const { error: dbError } = await admin.from('units_media').delete().eq('id', params.photoId)

    if (dbError) return errors.internal('Failed to delete photo record')

    // Delete from storage (best effort)
    if (filePath) {
      try {
        await admin.storage.from('public-media').remove([filePath])
      } catch (e) {
        console.warn('Failed to delete file from storage:', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return errors.internal(e?.message || 'Failed')
  }
}
