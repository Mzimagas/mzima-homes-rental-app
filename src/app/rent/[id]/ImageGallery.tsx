'use client'
import { useState, useEffect } from 'react'

type MediaItem = {
  id: string
  type: 'PHOTO' | 'FLOOR_PLAN'
  url: string
  alt_text: string | null
  order_index: number
}

interface ImageGalleryProps {
  media: MediaItem[]
  unitName: string
}

export default function ImageGallery({ media, unitName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const photos = media.filter((m) => m.type === 'PHOTO')
  const floorPlans = media.filter((m) => m.type === 'FLOOR_PLAN')
  const [activeTab, setActiveTab] = useState<'photos' | 'floorplans'>('photos')

  const currentMedia = activeTab === 'photos' ? photos : floorPlans
  const currentImage = currentMedia[selectedIndex]

  useEffect(() => {
    if (currentImage) {
      setIsLoading(true)
      const img = new Image()
      img.onload = () => setIsLoading(false)
      img.src = currentImage.url
    }
  }, [currentImage])

  const nextImage = () => {
    setSelectedIndex((prev) => (prev + 1) % currentMedia.length)
  }

  const prevImage = () => {
    setSelectedIndex((prev) => (prev - 1 + currentMedia.length) % currentMedia.length)
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return

      switch (e.key) {
        case 'Escape':
          closeLightbox()
          break
        case 'ArrowLeft':
          prevImage()
          break
        case 'ArrowRight':
          nextImage()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen])

  if (!media.length) {
    return (
      <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-medium">No photos available</p>
          <p className="text-sm">Photos will be added soon</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      {floorPlans.length > 0 && (
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setActiveTab('photos')
              setSelectedIndex(0)
            }}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'photos'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Photos ({photos.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('floorplans')
              setSelectedIndex(0)
            }}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'floorplans'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Floor Plans ({floorPlans.length})
          </button>
        </div>
      )}

      {/* Main Image */}
      <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden group">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {currentImage && (
          <>
            <img
              src={currentImage.url}
              alt={currentImage.alt_text || `${unitName} - Image ${selectedIndex + 1}`}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => openLightbox(selectedIndex)}
            />

            {/* Navigation Arrows */}
            {currentMedia.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {currentMedia.length}
            </div>

            {/* Zoom Icon */}
            <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {currentMedia.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {currentMedia.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setSelectedIndex(index)}
              className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? 'border-primary-600 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <img
                src={item.url}
                alt={item.alt_text || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Navigation */}
          {currentMedia.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Main Image */}
          <div className="max-w-4xl max-h-full">
            <img
              src={currentImage?.url}
              alt={currentImage?.alt_text || `${unitName} - Image ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Image Info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="text-lg font-medium">{unitName}</p>
            <p className="text-sm opacity-75">
              {selectedIndex + 1} of {currentMedia.length}{' '}
              {activeTab === 'photos' ? 'photos' : 'floor plans'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
