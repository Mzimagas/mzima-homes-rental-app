'use client'

import React from 'react'
import GoogleMapsTestComponent from '../../../components/location/GoogleMapsTestComponent'

export default function GoogleMapsDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Maps Integration Debug</h1>
          <p className="text-gray-600">
            This page helps debug Google Maps integration issues. Check the browser console for
            detailed logs.
          </p>
        </div>

        <GoogleMapsTestComponent />

        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Debug Instructions</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900">1. Check Browser Console</h3>
              <p>
                Open browser developer tools (F12) and check the Console tab for debug messages.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">2. Test Google Maps URLs</h3>
              <p>
                Run{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  window.googleMapsUtils.testGoogleMapsUrls()
                </code>{' '}
                in the console.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">3. Debug Location Data</h3>
              <p>
                Use{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  window.googleMapsUtils.debugLocationData(locationData, 'context')
                </code>{' '}
                to debug specific location data.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">4. Check Property Data</h3>
              <p>
                Navigate to the properties page and check console logs for property data loading and
                coordinate information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
