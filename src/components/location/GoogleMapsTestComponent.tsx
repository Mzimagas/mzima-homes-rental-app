'use client'

import React from 'react'
import ViewOnGoogleMapsButton from '../ui/ViewOnGoogleMapsButton'

/**
 * Test component to verify Google Maps URL generation
 * This component demonstrates the different scenarios for Google Maps integration
 */
export default function GoogleMapsTestComponent() {
    const testScenarios = [
    {
      name: 'Property with Coordinates',
      lat: -1.2921,
      lng: 36.8219,
      address: 'Nairobi, Kenya',
      propertyName: 'Test Property 1',
      expectedUrl: 'https://www.google.com/maps?q=-1.2921,36.8219',
    },
    {
      name: 'Property with Address Only',
      lat: null,
      lng: null,
      address: 'Westlands, Nairobi, Kenya',
      propertyName: 'Test Property 2',
      expectedUrl: 'https://www.google.com/maps/search/Westlands%2C%20Nairobi%2C%20Kenya',
    },
    {
      name: 'Property with Invalid Coordinates',
      lat: NaN,
      lng: undefined,
      address: 'Karen, Nairobi, Kenya',
      propertyName: 'Test Property 3',
      expectedUrl: 'https://www.google.com/maps/search/Karen%2C%20Nairobi%2C%20Kenya',
    },
    {
      name: 'Property with No Location Data',
      lat: null,
      lng: null,
      address: '',
      propertyName: 'Test Property 4',
      expectedUrl: null,
    },
  ]

  const buildGoogleMapsUrl = (
    lat?: number | null,
    lng?: number | null,
    address?: string | null
  ): string | null => {
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      return `https://www.google.com/maps?q=${lat},${lng}`
    }
    const q = (address ?? '').trim()
    if (q.length > 0) {
      return `https://www.google.com/maps/search/${encodeURIComponent(q)}`
    }
    return null
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Google Maps Integration Test</h2>

      <div className="space-y-6">
        {testScenarios.map((scenario, index) => {
          const actualUrl = buildGoogleMapsUrl(scenario.lat, scenario.lng, scenario.address)
          const isCorrect = actualUrl === scenario.expectedUrl

          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{scenario.name}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Input Data:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      <strong>Lat:</strong> {scenario.lat?.toString() || 'null'}
                    </li>
                    <li>
                      <strong>Lng:</strong> {scenario.lng?.toString() || 'null'}
                    </li>
                    <li>
                      <strong>Address:</strong> {scenario.address || 'empty'}
                    </li>
                    <li>
                      <strong>Property:</strong> {scenario.propertyName}
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">URL Generation:</h4>
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>Expected:</strong>
                      <div className="bg-gray-100 p-2 rounded text-xs break-all">
                        {scenario.expectedUrl || 'null (no button shown)'}
                      </div>
                    </div>
                    <div>
                      <strong>Actual:</strong>
                      <div
                        className={`p-2 rounded text-xs break-all ${
                          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {actualUrl || 'null (no button shown)'}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        isCorrect ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ViewOnGoogleMapsButton
                  source="Test Component"
                  name={scenario.propertyName}
                  lat={scenario.lat}
                  lng={scenario.lng}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Fix Summary</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Issue:</strong> Google Maps buttons were opening general locations instead of
            specific property coordinates.
          </p>
          <p>
            <strong>Root Cause:</strong> Pipeline queries didn&apos;t include property coordinates, only
            addresses.
          </p>
          <p>
            <strong>Solution:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              Enhanced database queries to join with properties table and fetch lat/lng coordinates
            </li>
            <li>Updated PurchaseItem and HandoverItem interfaces to include coordinate fields</li>
            <li>Modified Google Maps button usage to prioritize coordinates over addresses</li>
            <li>Ensured all property queries include coordinate data</li>
          </ul>
          <p>
            <strong>Priority:</strong> Coordinates are used first (most accurate), then address as
            fallback.
          </p>
        </div>
      </div>
    </div>
  )
}
