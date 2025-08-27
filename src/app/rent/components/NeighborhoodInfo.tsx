'use client'
import { useState } from 'react'

interface NeighborhoodInfoProps {
  address?: string
  propertyName: string
}

export default function NeighborhoodInfo({ address, propertyName }: NeighborhoodInfoProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transport' | 'amenities' | 'schools'>(
    'overview'
  )

  // Mock data - in a real app, this would come from an API or database
  const neighborhoodData = {
    overview: {
      description:
        'This vibrant neighborhood offers a perfect blend of urban convenience and residential tranquility. Known for its tree-lined streets and friendly community atmosphere.',
      highlights: [
        'Safe, family-friendly environment',
        'Close to shopping centers and restaurants',
        'Well-maintained infrastructure',
        'Growing property values',
        'Active community associations',
      ],
    },
    transport: {
      publicTransport: [
        {
          type: 'Bus Stop',
          name: 'Main Street Bus Stop',
          distance: '2 min walk',
          routes: ['Route 14', 'Route 23'],
        },
        {
          type: 'Matatu Stage',
          name: 'Junction Stage',
          distance: '5 min walk',
          routes: ['City Center', 'Westlands'],
        },
      ],
      roads: [
        {
          name: 'Main Highway Access',
          distance: '1.2 km',
          description: 'Direct access to major highways',
        },
        {
          name: 'Ring Road',
          distance: '800m',
          description: 'Quick connection to other parts of the city',
        },
      ],
      walkScore: 75,
      bikeScore: 60,
    },
    amenities: {
      shopping: [
        { name: 'Neighborhood Mall', distance: '500m', type: 'Shopping Center' },
        { name: 'Local Market', distance: '300m', type: 'Fresh Produce' },
        { name: 'Pharmacy', distance: '200m', type: 'Healthcare' },
      ],
      dining: [
        { name: 'Java House', distance: '400m', type: 'Coffee & Light Meals' },
        { name: 'Local Restaurant', distance: '250m', type: 'Traditional Cuisine' },
        { name: 'Pizza Place', distance: '600m', type: 'Fast Food' },
      ],
      healthcare: [
        { name: 'Neighborhood Clinic', distance: '350m', type: 'Primary Care' },
        { name: 'Pharmacy Plus', distance: '200m', type: 'Pharmacy' },
      ],
      recreation: [
        { name: 'Community Park', distance: '400m', type: 'Green Space' },
        { name: 'Fitness Center', distance: '500m', type: 'Gym' },
        { name: 'Library', distance: '800m', type: 'Public Library' },
      ],
    },
    schools: [
      { name: 'Sunshine Primary School', distance: '600m', type: 'Primary', rating: 4.2 },
      { name: 'Excellence Secondary', distance: '1.2km', type: 'Secondary', rating: 4.5 },
      { name: 'Little Angels Nursery', distance: '300m', type: 'Nursery', rating: 4.0 },
      { name: 'Tech University Campus', distance: '2.5km', type: 'University', rating: 4.3 },
    ],
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏘️' },
    { id: 'transport', label: 'Transport', icon: '🚌' },
    { id: 'amenities', label: 'Amenities', icon: '🏪' },
    { id: 'schools', label: 'Schools', icon: '🎓' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Neighborhood Guide</h2>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div>
            <p className="text-gray-600 mb-4">{neighborhoodData.overview.description}</p>
            <h3 className="font-semibold text-gray-900 mb-3">Neighborhood Highlights</h3>
            <ul className="space-y-2">
              {neighborhoodData.overview.highlights.map((highlight, index) => (
                <li key={index} className="flex items-center text-gray-600">
                  <svg
                    className="w-4 h-4 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'transport' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Public Transport</h3>
              <div className="space-y-3">
                {neighborhoodData.transport.publicTransport.map((transport, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{transport.name}</div>
                      <div className="text-sm text-gray-600">{transport.distance}</div>
                      <div className="text-xs text-gray-500">
                        Routes: {transport.routes.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Road Access</h3>
              <div className="space-y-3">
                {neighborhoodData.transport.roads.map((road, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{road.name}</div>
                      <div className="text-sm text-gray-600">{road.distance}</div>
                      <div className="text-xs text-gray-500">{road.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {neighborhoodData.transport.walkScore}
                </div>
                <div className="text-sm text-gray-600">Walk Score</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {neighborhoodData.transport.bikeScore}
                </div>
                <div className="text-sm text-gray-600">Bike Score</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'amenities' && (
          <div className="space-y-6">
            {Object.entries(neighborhoodData.amenities).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-semibold text-gray-900 mb-3 capitalize">{category}</h3>
                <div className="space-y-2">
                  {items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.type}</div>
                      </div>
                      <div className="text-sm text-gray-500">{item.distance}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'schools' && (
          <div>
            <div className="space-y-3">
              {neighborhoodData.schools.map((school, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{school.name}</div>
                    <div className="text-sm text-gray-600">{school.type} School</div>
                    <div className="text-xs text-gray-500">{school.distance}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-1">
                        {school.rating}
                      </span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(school.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
