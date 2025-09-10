'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../../../components/auth/AuthProvider'
import getSupabaseClient from '../../../../lib/supabase-client'

const supabase = getSupabaseClient()

type Photo = {
  id: string
  unit_id: string
  url: string
  alt_text: string | null
  order_index: number
  created_at: string
}

type Unit = {
  id: string
  unit_label: string
}

export default function PhotosTab({ propertyId }: { propertyId: string }) {
  const { user } = useAuth()
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Load units for this property
  useEffect(() => {
    const loadUnits = async () => {
      try {
        if (!user?.id) {
          setError('Please log in to manage photos')
          return
        }

        const { data: units, error } = await supabase
          .from('units')
          .select('id, unit_label')
          .eq('property_id', propertyId)
          .order('unit_label')

        if (error) {
          setError('Failed to load units: ' + error.message)
        } else {
          setUnits(units || [])
          if (units?.length > 0) setSelectedUnitId(units[0].id)
        }
      } catch (e) {
        console.warn('Failed to load units:', e)
        setError('Failed to load units')
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) loadUnits()
  }, [propertyId, user?.id])

  // Load photos for selected unit
  const loadPhotos = useCallback(async () => {
    if (!selectedUnitId || !user?.id) return
    try {
      setError(null)
      const { data: photos, error } = await supabase
        .from('units_media')
        .select('*')
        .eq('unit_id', selectedUnitId)
        .eq('type', 'PHOTO')
        .order('order_index')

      if (error) {
        setError('Failed to load photos: ' + error.message)
      } else {
        setPhotos(photos || [])
      }
    } catch (e) {
      setError('Failed to load photos')
    }
  }, [selectedUnitId, user?.id])

  useEffect(() => {
    loadPhotos()
  }, [loadPhotos])

  const handleFileUpload = async (files: FileList) => {
    if (!selectedUnitId || !user?.id) return
    setUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 10 * 1024 * 1024) continue

        // Get next order_index
        const { data: lastPhoto } = await supabase
          .from('units_media')
          .select('order_index')
          .eq('unit_id', selectedUnitId)
          .eq('type', 'PHOTO')
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle()

        const nextOrderIndex = (lastPhoto?.order_index || -1) + 1

        // Upload to storage
        const timestamp = Date.now()
        const fileExt = file.name.split('.').pop()
        const fileName = `unit-${selectedUnitId}-${timestamp}.${fileExt}`
        const filePath = `units/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('public-media')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message)

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('public-media').getPublicUrl(filePath)

        // Create database entry
        const { error: dbError } = await supabase.from('units_media').insert({
          unit_id: selectedUnitId,
          type: 'PHOTO',
          url: publicUrl,
          alt_text: file.name.split('.')[0],
          order_index: nextOrderIndex,
        })

        if (dbError) {
          // Clean up uploaded file
          await supabase.storage.from('public-media').remove([filePath])
          throw new Error('Failed to save photo record: ' + dbError.message)
        }
      }
      await loadPhotos()
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFileUpload(e.target.files)
    }
  }

  const deletePhoto = async (photoId: string) => {
    if (!user?.id || !confirm('Delete this photo?')) return
    try {
      const photo = photos.find((p) => p.id === photoId)
      if (!photo) return

      // Extract file path from URL for storage deletion
      let filePath: string | null = null
      try {
        const url = new URL(photo.url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/public-media\/(.+)$/)
        if (pathMatch) filePath = pathMatch[1]
      } catch {}

      // Delete from database
      const { error: dbError } = await supabase.from('units_media').delete().eq('id', photoId)

      if (dbError) throw new Error('Failed to delete photo: ' + dbError.message)

      // Delete from storage (best effort)
      if (filePath) {
        try {
          await supabase.storage.from('public-media').remove([filePath])
        } catch (e) {
          console.warn('Failed to delete file from storage:', e)
        }
      }

      await loadPhotos()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const reorderPhotos = async (newOrder: Photo[]) => {
    if (!user?.id) return
    try {
      // Update order_index for each photo
      for (const [index, photo] of newOrder.entries()) {
        await supabase
          .from('units_media')
          .update({ order_index: index })
          .eq('id', photo.id)
          .eq('unit_id', selectedUnitId)
          .eq('type', 'PHOTO')
      }
      setPhotos(newOrder)
    } catch (e: any) {
      setError('Reorder failed: ' + e.message)
    }
  }

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos]
    const [moved] = newPhotos.splice(fromIndex, 1)
    newPhotos.splice(toIndex, 0, moved)
    reorderPhotos(newPhotos)
  }

  if (loading) return <div>Loading units...</div>

  return (
    <div className="space-y-6">
      {/* Unit Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Select Unit</label>
        <select
          value={selectedUnitId}
          onChange={(e) => setSelectedUnitId(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">Choose a unit...</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.unit_label}
            </option>
          ))}
        </select>
      </div>

      {selectedUnitId && (
        <>
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            } ${uploading ? 'opacity-50' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="photo-upload"
              disabled={uploading}
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              <div className="text-gray-600">
                {uploading ? 'Uploading...' : 'Drag photos here or click to select'}
              </div>
              <div className="text-sm text-gray-400 mt-1">JPEG, PNG up to 10MB each</div>
            </label>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          {/* Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.alt_text || ''}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Cover Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Cover
                  </div>
                )}

                {/* Controls */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="bg-red-600 text-white p-1 rounded text-xs hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>

                {/* Reorder Controls */}
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {index > 0 && (
                    <button
                      onClick={() => movePhoto(index, index - 1)}
                      className="bg-gray-800 text-white p-1 rounded text-xs"
                    >
                      ←
                    </button>
                  )}
                  {index < photos.length - 1 && (
                    <button
                      onClick={() => movePhoto(index, index + 1)}
                      className="bg-gray-800 text-white p-1 rounded text-xs"
                    >
                      →
                    </button>
                  )}
                </div>

                {/* Order Index */}
                <div className="absolute bottom-2 right-2 bg-gray-800 text-white text-xs px-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>

          {photos.length === 0 && !uploading && (
            <div className="text-center text-gray-500 py-8">
              No photos uploaded yet. Add some photos to showcase this unit.
            </div>
          )}
        </>
      )}
    </div>
  )
}
