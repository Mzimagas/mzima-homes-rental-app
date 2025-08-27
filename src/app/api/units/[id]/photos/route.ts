import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { errors } from '../../../../../lib/api/errors'
import { z } from 'zod'

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

async function checkUnitAccess(userId: string, unitId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: unit } = await admin
      .from('units')
      .select('property_id')
      .eq('id', unitId)
      .maybeSingle()
    if (!unit) return false

    const { data: membership } = await admin
      .from('property_users')
      .select('role, status')
      .eq('user_id', userId)
      .eq('property_id', unit.property_id)
      .maybeSingle()

    return (
      membership?.status === 'ACTIVE' && ['OWNER', 'PROPERTY_MANAGER'].includes(membership.role)
    )
  } catch {
    return false
  }
}

// GET /api/units/[id]/photos - List photos for a unit
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const hasAccess = await checkUnitAccess(userId, params.id)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: photos, error } = await admin
      .from('units_media')
      .select('*')
      .eq('unit_id', params.id)
      .eq('type', 'PHOTO')
      .order('order_index')

    if (error) return errors.internal('Failed to fetch photos')
    return NextResponse.json({ ok: true, data: photos })
  } catch (e: any) {
    return errors.internal(e?.message || 'Failed')
  }
}

// POST /api/units/[id]/photos - Upload new photo
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const hasAccess = await checkUnitAccess(userId, params.id)
    if (!hasAccess) return errors.forbidden()

    const formData = await req.formData()
    const file = formData.get('file') as File
    const altText = (formData.get('alt_text') as string) || ''

    if (!file) return errors.badRequest('No file provided')
    if (!file.type.startsWith('image/')) return errors.badRequest('File must be an image')
    if (file.size > 10 * 1024 * 1024) return errors.badRequest('File size must be less than 10MB')

    const admin = createClient(supabaseUrl, serviceKey)

    // Get next order_index
    const { data: lastPhoto } = await admin
      .from('units_media')
      .select('order_index')
      .eq('unit_id', params.id)
      .eq('type', 'PHOTO')
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrderIndex = (lastPhoto?.order_index || -1) + 1

    // Upload to storage
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `unit-${params.id}-${timestamp}.${fileExt}`
    const filePath = `units/${fileName}`

    const { data: uploadData, error: uploadError } = await admin.storage
      .from('public-media')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) return errors.internal('Failed to upload file: ' + uploadError.message)

    // Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from('public-media').getPublicUrl(filePath)

    // Create database entry
    const { data: photo, error: dbError } = await admin
      .from('units_media')
      .insert({
        unit_id: params.id,
        type: 'PHOTO',
        url: publicUrl,
        alt_text: altText,
        order_index: nextOrderIndex,
      })
      .select('*')
      .single()

    if (dbError) {
      // Clean up uploaded file
      await admin.storage.from('public-media').remove([filePath])
      return errors.internal('Failed to save photo record')
    }

    return NextResponse.json({ ok: true, data: photo })
  } catch (e: any) {
    return errors.internal(e?.message || 'Failed')
  }
}

// PATCH /api/units/[id]/photos - Reorder photos
const reorderSchema = z.object({
  photos: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int().min(0),
    })
  ),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const hasAccess = await checkUnitAccess(userId, params.id)
    if (!hasAccess) return errors.forbidden()

    const body = await req.json()
    const parsed = reorderSchema.safeParse(body)
    if (!parsed.success) return errors.validation(parsed.error.flatten())

    const admin = createClient(supabaseUrl, serviceKey)

    // Update order_index for each photo
    for (const photo of parsed.data.photos) {
      await admin
        .from('units_media')
        .update({ order_index: photo.order_index })
        .eq('id', photo.id)
        .eq('unit_id', params.id)
        .eq('type', 'PHOTO')
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return errors.internal(e?.message || 'Failed')
  }
}
