'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Property } from '../../../../lib/types/database'
import { formatCurrency } from '../../../../lib/export-utils'
import { LoadingCard } from '../../../../components/ui/loading'
import { ErrorCard } from '../../../../components/ui/error'

interface PropertyDetail extends Property {
  images?: string[]
  main_image?: string
  property_type_display?: string
  location_display?: string
}

export default function PropertyDetailPage() {
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const router = useRouter()
  const params = useParams()
  const propertyId = params.id as string

  useEffect(() => {
    if (propertyId) {
      loadProperty()
    }
  }, [propertyId])

  const loadProperty = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/properties/${propertyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Property not found')
        }
        throw new Error('Failed to load property details')
      }

      const data = await response.json()
      setProperty(data.property)
    } catch (err) {
      console.error('Error loading property:', err)
      setError(err instanceof Error ? err.message : 'Failed to load property details')
    } finally {
      setLoading(false)
    }
  }

  const handleExpressInterest = () => {
    router.push(`/auth/register?property=${propertyId}&action=express-interest`)
  }

  const handleContactUs = () => {
    router.push(`/auth/register?property=${propertyId}&action=contact`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <LoadingCard message="Loading property details..." />
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <ErrorCard message={error || 'Property not found'} />
          <div className="mt-4">
            <Link
              href="/marketplace"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const images = property.images || []
  const hasImages = images.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/marketplace"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              ← Back to Marketplace
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Images */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Main Image */}
              <div className="relative h-96 bg-gray-200 flex items-center justify-center">
                {hasImages && !imageError ? (
                  <Image
                    src={images[selectedImageIndex] || ''}
                    alt={property.name || 'Property'}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <div className="text-6xl mb-4">🏠</div>
                    <span className="text-lg">No Image Available</span>
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              {hasImages && images.length > 1 && (
                <div className="p-4">
                  <div className="flex space-x-2 overflow-x-auto">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 ${
                          selectedImageIndex === index ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`Property view ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Property Description */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-600 leading-relaxed">
                {property.description || 'No description available for this property.'}
              </p>
            </div>
          </div>

          {/* Property Details Sidebar */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {property.name || 'Unnamed Property'}
              </h1>
              
              <p className="text-gray-600 mb-4 flex items-center">
                <span className="mr-2">📍</span>
                {property.location || 'Location not specified'}
              </p>

              <div className="mb-6">
                <p className="text-3xl font-bold text-green-600">
                  {property.asking_price_kes ? formatCurrency(property.asking_price_kes) : 'Price on request'}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span className="font-medium">{property.property_type_display || 'Not specified'}</span>
                </div>
                
                {property.size_sqm && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium">{property.size_sqm} sqm</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">Available</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleExpressInterest}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Express Interest
                </button>
                
                <button
                  onClick={handleContactUs}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Contact Us
                </button>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Choose Mzima Homes?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Professional property management
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Transparent purchase process
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Complete documentation support
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Real-time progress tracking
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Comprehensive handover process
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Need More Information?</h3>
              <p className="text-blue-700 text-sm mb-4">
                Our property specialists are ready to help you with any questions about this property.
              </p>
              <button
                onClick={handleContactUs}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Get in Touch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
