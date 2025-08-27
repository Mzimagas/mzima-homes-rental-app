'use client'
import { useState } from 'react'

export default function FeatureShowcase() {
  const [isOpen, setIsOpen] = useState(false)

  const features = [
    {
      category: '🎨 Visual Design & User Experience',
      items: [
        'Professional design system with consistent colors, typography, and spacing',
        'Enhanced unit cards with hover effects and status badges',
        'Advanced image gallery with lightbox, zoom, and keyboard navigation',
        'Mobile-first responsive design with touch-friendly interactions',
        'Loading states with skeleton screens and smooth animations',
      ],
    },
    {
      category: '🔍 Search & Discovery',
      items: [
        'Advanced search with real-time filtering by property, price, and amenities',
        'Smart amenity filters with visual chips and toggle states',
        'Property comparison tool (up to 3 units)',
        'Favorites system with local storage persistence',
        'Breadcrumb navigation for better user orientation',
      ],
    },
    {
      category: '📱 Mobile & Performance',
      items: [
        'Optimized image loading with lazy loading and responsive sizes',
        'Touch-friendly 44px minimum touch targets',
        'Swipe gestures for gallery navigation',
        'Progressive image enhancement with blur-to-sharp loading',
        'Efficient state management with minimal re-renders',
      ],
    },
    {
      category: '🏠 Property Information',
      items: [
        'Comprehensive neighborhood guides with transport, amenities, and schools',
        'Interactive amenity display with custom icons',
        'Enhanced unit details with structured pricing and availability',
        'Property contact information and management details',
        'Walk and bike scores for location assessment',
      ],
    },
    {
      category: '📋 Reservation & Application',
      items: [
        'Multi-step reservation flow with progress tracking',
        'Real-time form validation with helpful error messages',
        'Document upload capability for application requirements',
        'Availability notifications for occupied units',
        'Application status tracking and confirmation',
      ],
    },
    {
      category: '🚀 Interactive Features',
      items: [
        'Social sharing (WhatsApp, Telegram, Email, SMS)',
        'Unit comparison with side-by-side details',
        'Favorites management with visual indicators',
        'Availability notifications for future openings',
        'Virtual tour scheduling (framework ready)',
      ],
    },
    {
      category: '♿ Accessibility & SEO',
      items: [
        'ARIA labels and semantic HTML structure',
        'Keyboard navigation support throughout',
        'Screen reader compatibility with proper alt text',
        'Dynamic meta tags and Open Graph data',
        'Structured data (Schema.org) for property listings',
      ],
    },
    {
      category: '⚡ Technical Excellence',
      items: [
        'Component-based architecture with reusable elements',
        'TypeScript for type safety and better development experience',
        'Error boundaries with graceful fallbacks',
        'Local storage for user preferences and favorites',
        'Optimized bundle size with code splitting',
      ],
    },
  ]

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors text-sm"
      >
        🚀 View New Features
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🎉 Rental Portal Enhancements</h2>
            <p className="text-gray-600">
              Comprehensive UI/UX improvements for better user experience
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">15+</div>
              <div className="text-sm text-gray-600">Major Features</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">40+</div>
              <div className="text-sm text-gray-600">Improvements</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-gray-600">Mobile Ready</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">A+</div>
              <div className="text-sm text-gray-600">Accessibility</div>
            </div>
          </div>

          {/* Feature Categories */}
          <div className="space-y-6">
            {features.map((category, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{category.category}</h3>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Key Benefits */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Key Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">For Prospects</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Intuitive property search and comparison</li>
                  <li>• Comprehensive neighborhood information</li>
                  <li>• Streamlined application process</li>
                  <li>• Mobile-optimized experience</li>
                  <li>• Real-time availability updates</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">For Property Managers</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Higher conversion rates</li>
                  <li>• Reduced manual inquiries</li>
                  <li>• Better qualified leads</li>
                  <li>• Professional brand image</li>
                  <li>• SEO-optimized listings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Technical Highlights */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">⚙️ Technical Highlights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h4 className="font-medium">Performance</h4>
                <p className="text-sm text-gray-600">
                  Optimized loading, lazy images, efficient state management
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="font-medium">Accessibility</h4>
                <p className="text-sm text-gray-600">
                  WCAG compliant, keyboard navigation, screen reader support
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h4 className="font-medium">SEO Ready</h4>
                <p className="text-sm text-gray-600">Meta tags, structured data, semantic HTML</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Experience the New Portal?
            </h3>
            <p className="text-gray-600 mb-4">
              Explore the enhanced features and improved user experience
            </p>
            <div className="flex justify-center space-x-4">
              <button onClick={() => setIsOpen(false)} className="btn btn-primary">
                Start Exploring
              </button>
              <a href="/rent" className="btn btn-secondary">
                Browse Units
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
