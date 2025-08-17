import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ImageGallery from './ImageGallery'
import ReservationForm from './ReservationForm'
import Breadcrumbs from '../components/Breadcrumbs'
import { AmenityList } from '../components/AmenityIcons'
import { StructuredData, generatePropertyStructuredData } from '../components/SEOHead'
import NeighborhoodInfo from '../components/NeighborhoodInfo'
import { ShareButton, FavoriteButton, AvailabilityNotifier } from '../components/InteractiveFeatures'

async function fetchUnit(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/public/units/${id}`, { cache: 'no-store' })
  const j = await res.json()
  if (!j.ok) return null
  return j.data
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await fetchUnit(params.id)
  if (!data) return { title: 'Unit Not Found' }

  const { unit } = data
  return {
    title: `${unit.property_name} - ${unit.unit_label} | Mzima Homes`,
    description: `Rental unit ${unit.unit_label} at ${unit.property_name}. Monthly rent: KES ${unit.monthly_rent_kes?.toLocaleString() || 'Contact for pricing'}`,
    openGraph: {
      title: `${unit.property_name} - ${unit.unit_label}`,
      description: `Monthly rent: KES ${unit.monthly_rent_kes?.toLocaleString() || 'Contact for pricing'}`,
      type: 'website',
    }
  }
}

export default async function UnitDetail({ params }: { params: { id: string } }) {
  const data = await fetchUnit(params.id)
  if (!data) return notFound()
  const { unit, media, amenities } = data

  const formatPrice = (price: number | null) => {
    if (!price) return 'Contact for pricing'
    return `KES ${price.toLocaleString()}`
  }

  const getAvailabilityStatus = (availableFrom: string | null) => {
    if (!availableFrom) return { text: 'Available Now', color: 'bg-green-100 text-green-700 border border-green-200' }
    const date = new Date(availableFrom)
    const now = new Date()
    if (date <= now) return { text: 'Available Now', color: 'bg-green-100 text-green-700 border border-green-200' }
    return { text: `Available ${date.toLocaleDateString()}`, color: 'bg-amber-100 text-amber-700 border border-amber-200' }
  }

  const status = getAvailabilityStatus(unit.available_from)

  const structuredData = generatePropertyStructuredData(unit)

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="container py-8">
        {/* Breadcrumb */}
        <Breadcrumbs items={[
          { label: 'Available Units', href: '/rent' },
          { label: unit.property_name },
          { label: unit.unit_label }
        ]} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              {unit.unit_label}
            </h1>
            <p className="text-xl text-secondary font-medium">{unit.property_name}</p>
            {unit.physical_address && (
              <p className="text-tertiary flex items-center mt-1">
                <svg className="w-4 h-4 mr-1 text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {unit.physical_address}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <ShareButton unit={{ unit_id: unit.unit_id, unit_label: unit.unit_label, property_name: unit.property_name }} />
            <FavoriteButton unitId={unit.unit_id} />
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${status.color}`}>
              {status.text}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          <ImageGallery media={media || []} unitName={`${unit.property_name} - ${unit.unit_label}`} />

          {/* Unit Details */}
          <div className="bg-elevated rounded-xl shadow-md border border-light p-6">
            <h2 className="text-2xl font-semibold text-primary mb-6">Unit Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-primary mb-3">Pricing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-secondary">Monthly Rent:</span>
                    <span className="font-semibold text-primary">{formatPrice(unit.monthly_rent_kes)}</span>
                  </div>
                  {unit.deposit_kes && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Security Deposit:</span>
                      <span className="font-semibold text-primary">{formatPrice(unit.deposit_kes)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-primary mb-3">Availability</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-secondary">Status:</span>
                    <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Unit Type:</span>
                    <span className="font-medium text-primary">Residential</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {amenities && amenities.length > 0 && (
            <div className="bg-elevated rounded-xl shadow-md border border-light p-6">
              <h2 className="text-2xl font-semibold text-primary mb-6">Amenities & Features</h2>
              <AmenityList amenities={amenities} variant="grid" />
            </div>
          )}

          {/* Neighborhood Information */}
          <NeighborhoodInfo
            address={unit.physical_address || undefined}
            propertyName={unit.property_name}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <div className="bg-elevated rounded-xl shadow-lg border border-light p-6 sticky top-6">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-primary">
                {formatPrice(unit.monthly_rent_kes)}
                <span className="text-lg font-normal text-tertiary">/month</span>
              </div>
              {unit.deposit_kes && (
                <div className="text-secondary mt-1">
                  + {formatPrice(unit.deposit_kes)} deposit
                </div>
              )}
            </div>

            {/* Availability Notification or Reservation Form */}
            {status.text === 'Available Now' ? (
              <ReservationForm unitId={unit.unit_id} />
            ) : (
              <AvailabilityNotifier unitId={unit.unit_id} />
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-elevated rounded-xl shadow-md border border-light p-6">
            <h3 className="font-semibold text-primary mb-4">Need More Information?</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-secondary">info@mzimahomes.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-secondary">+254 700 000 000</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-secondary">Available 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

