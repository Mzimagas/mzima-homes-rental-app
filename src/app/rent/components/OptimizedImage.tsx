'use client'
import { useState, useRef, useEffect } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  onLoad?: () => void
  onError?: () => void
}

export default function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observerRef.current?.disconnect()
          }
        })
      },
      {
        rootMargin: '50px',
      }
    )

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [priority, isInView])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Generate responsive image URLs (in a real app, this would use a CDN)
  const generateSrcSet = (baseSrc: string) => {
    const sizes = [320, 640, 768, 1024, 1280, 1920]
    return sizes.map((size) => `${baseSrc}?w=${size}&q=75 ${size}w`).join(', ')
  }

  const generateSizes = () => {
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  }

  if (hasError) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-2"
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
          <p className="text-sm">Image not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {/* Placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Loading spinner */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          srcSet={generateSrcSet(src)}
          sizes={generateSizes()}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } w-full h-full object-cover`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </div>
  )
}

// Hook for preloading images
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const preloadImage = (url: string) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          setLoadedImages((prev) => new Set(prev).add(url))
          resolve()
        }
        img.onerror = reject
        img.src = url
      })
    }

    const preloadAll = async () => {
      try {
        await Promise.all(urls.map(preloadImage))
      } catch (error) {
        console.warn('Failed to preload some images:', error)
      }
    }

    if (urls.length > 0) {
      preloadAll()
    }
  }, [urls])

  return loadedImages
}

// Component for progressive image enhancement
export function ProgressiveImage({
  lowQualitySrc,
  highQualitySrc,
  alt,
  className = '',
  ...props
}: {
  lowQualitySrc: string
  highQualitySrc: string
  alt: string
  className?: string
} & Omit<OptimizedImageProps, 'src'>) {
  const [highQualityLoaded, setHighQualityLoaded] = useState(false)

  return (
    <div className={`relative ${className}`}>
      {/* Low quality placeholder */}
      <OptimizedImage
        src={lowQualitySrc}
        alt={alt}
        className="absolute inset-0 filter blur-sm scale-110"
        priority
        {...props}
      />

      {/* High quality image */}
      <OptimizedImage
        src={highQualitySrc}
        alt={alt}
        className={`relative transition-opacity duration-500 ${
          highQualityLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setHighQualityLoaded(true)}
        {...props}
      />
    </div>
  )
}

// Image gallery with optimized loading
export function ImageGalleryOptimized({
  images,
  currentIndex = 0,
}: {
  images: Array<{ url: string; alt: string }>
  currentIndex?: number
}) {
  const preloadedImages = useImagePreloader(
    images.slice(Math.max(0, currentIndex - 1), currentIndex + 3).map((img) => img.url)
  )

  return (
    <div className="space-y-4">
      {images.map((image, index) => (
        <OptimizedImage
          key={index}
          src={image.url}
          alt={image.alt}
          className="aspect-video rounded-lg"
          priority={index === currentIndex}
          placeholder={preloadedImages.has(image.url) ? 'empty' : 'blur'}
        />
      ))}
    </div>
  )
}
