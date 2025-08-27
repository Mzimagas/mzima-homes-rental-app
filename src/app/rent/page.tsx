import UnitsList from './UnitsList'
import FeatureShowcase from './components/FeatureShowcase'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Available Rental Units | Mzima Homes',
  description:
    'Browse our collection of available rental units. Find apartments and houses with detailed photos, amenities, and pricing information.',
}

export default function RentLanding() {
  return (
    <div className="container py-8">
      {/* Hero Section */}
      <div className="text-center mb-12 bg-elevated rounded-3xl p-8 shadow-sm border border-light">
        <h1 className="text-4xl font-bold text-primary mb-4 bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent">
          Find Your Perfect Home
        </h1>
        <p className="text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
          Browse our collection of quality rental units. Each property is professionally managed
          with modern amenities and convenient locations.
        </p>
      </div>

      {/* Units List */}
      <UnitsList />

      {/* Feature Showcase */}
      <FeatureShowcase />
    </div>
  )
}
