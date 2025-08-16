'use client'

import { useMemo, useState } from 'react'
import { reverseGeocode, type GeocodeResult, shortenAddress, isValidLatLng, parseCoordinates } from '../../lib/geocoding'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (result: GeocodeResult) => void
  label?: string
  allowCurrentLocation?: boolean
  error?: string | null
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  label = 'Physical Address',
  allowCurrentLocation = true,
  error
}: AddressAutocompleteProps) {
  const [loading, setLoading] = useState(false)
  const [validated, setValidated] = useState<GeocodeResult | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [policyBlocked, setPolicyBlocked] = useState(false)
  // Manual coordinates UI state
  const [coordsValue, setCoordsValue] = useState('')
  const [coordsError, setCoordsError] = useState<string | null>(null)
  const [coordsLoading, setCoordsLoading] = useState(false)

  function getBrowserName(): 'chrome' | 'safari' | 'firefox' | 'edge' | 'other' {
    if (typeof navigator === 'undefined') return 'other'
    const ua = navigator.userAgent
    if (/Edg\//.test(ua)) return 'edge'
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) return 'chrome'
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari'
    if (/Firefox\//.test(ua)) return 'firefox'
    return 'other'
  }

  function getGeoHelp(): string {
    const b = getBrowserName()
    switch (b) {
      case 'chrome':
        return 'In Chrome: click the lock icon in the address bar > Site settings > Allow Location.'
      case 'safari':
        return 'In Safari: Safari > Settings > Websites > Location and set this site to Allow.'
      case 'edge':
        return 'In Edge: click the lock icon > Permissions for this site > Allow Location.'
      case 'firefox':
        return 'In Firefox: click the location icon in the address bar and allow location for this site.'
      default:
        return 'Please allow location access for this site in your browser settings.'
    }
  }

  function isInIframe(): boolean {
    try { return window.self !== window.top } catch { return true }
  }

  function policyBlocksGeolocation(): boolean | null {
    const anyDoc = document as any
    try {
      const fp = anyDoc?.featurePolicy || anyDoc?.permissionsPolicy
      if (fp?.allowsFeature) return fp.allowsFeature('geolocation') === false
      if (fp?.features) return !fp.features().includes('geolocation')
    } catch {}
    return null
  }

  async function preflightPermissionsCheck(): Promise<'blocked_by_policy' | 'denied' | 'ok' | 'insecure'> {
    if (!window.isSecureContext) return 'insecure'
    const policy = policyBlocksGeolocation()
    if (policy === true) return 'blocked_by_policy'

    try {
      const perm: any = (navigator as any).permissions
      if (perm?.query) {
        const status = await perm.query({ name: 'geolocation' as any })
        if (status.state === 'denied') return 'denied'
      }
    } catch {}

    return 'ok'
  }

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocalError('Geolocation is not supported in this browser.')
      return
    }

    const preflight = await preflightPermissionsCheck()
    if (preflight === 'insecure') {
      setLocalError('Geolocation requires a secure context (HTTPS) or localhost. Please use HTTPS or open the app directly.')
      return
    }
    if (preflight === 'blocked_by_policy') {
      const iframeNote = isInIframe() ? ' This page appears to be embedded (iframe), which often blocks geolocation.' : ''
      setPolicyBlocked(true)
      setLocalError(`Geolocation is blocked by the browser's Permissions Policy.${iframeNote} Please contact your administrator or open the app directly in a new tab.`)
      return
    }
    if (preflight === 'denied') {
      setLocalError(`Location access is currently blocked. ${getGeoHelp()} Or enter coordinates manually below.`)
      // We continue to attempt in case the state changed after last prompt.
    }

    setLocalError(null)
    setLoading(true)

    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords

          const address = await reverseGeocode(latitude, longitude)

          if (address && address !== `${latitude}, ${longitude}`) {
            // Successfully got a real address
            const result: GeocodeResult = {
              address,
              lat: latitude,
              lng: longitude,
            }
            setValidated(result)
            onChange(address)
            onSelect(result)
          } else {
            // Geocoding failed, use coordinates as fallback
            const result: GeocodeResult = {
              address: `${latitude}, ${longitude}`,
              lat: latitude,
              lng: longitude,
            }
            setValidated(result)
            onChange(result.address)
            onSelect(result)
          }
          setLoading(false)
        } catch (geocodeError) {
          console.error('GPS geocoding failed:', geocodeError)
          const { latitude, longitude } = pos.coords
          const result: GeocodeResult = {
            address: `${latitude}, ${longitude}`,
            lat: latitude,
            lng: longitude,
          }
          setValidated(result)
          onChange(result.address)
          onSelect(result)
          setLoading(false)
        }
      }, (err) => {
        setLoading(false)
        const msg = String((err && (err as any).message) || '')
        if (msg.toLowerCase().includes('permissions policy') || msg.toLowerCase().includes('feature policy')) {
          const iframeNote = isInIframe() ? ' This page appears to be embedded (iframe), which often blocks geolocation.' : ''
          setPolicyBlocked(true)
          setLocalError(`Geolocation is blocked by the browser's Permissions Policy.${iframeNote} Please open the app directly in a new tab or contact your administrator.`)
          return
        }
        if ((err as any).code === 1) {
          setLocalError(`Location permission was denied. ${getGeoHelp()} Or enter coordinates manually below.`)
        } else if ((err as any).code === 2) {
          setLocalError('Location is currently unavailable. Please try again or enter coordinates manually below.')
        } else if ((err as any).code === 3) {
          setLocalError('Location request timed out. Please try again or enter coordinates manually below.')
        } else {
          setLocalError('Unable to access your location. Please try again or enter coordinates manually below.')
        }
      }, { enableHighAccuracy: true, timeout: 8000 })
    } catch (e: any) {
      setLoading(false)
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('permissions policy') || msg.toLowerCase().includes('feature policy')) {
        const iframeNote = isInIframe() ? ' This page appears to be embedded (iframe), which often blocks geolocation.' : ''
        setPolicyBlocked(true)
        setLocalError(`Geolocation is blocked by the browser's Permissions Policy.${iframeNote} Please open the app directly in a new tab or contact your administrator.`)
      } else if (msg.toLowerCase().includes('secure origin') || !window.isSecureContext) {
        setLocalError('Geolocation requires a secure context (HTTPS) or localhost. Please use HTTPS or open the app directly.')
      } else {
        setLocalError('An unexpected error occurred while accessing location. Please try again or enter coordinates manually below.')
      }
    }
  }

  const hint = useMemo(() => {
    if (error) return error
    if (localError) return localError
    if (validated) return `Validated: ${shortenAddress(validated.address, 3)}`
    return 'Click “Use current” to fill your current location, or enter coordinates manually below.'
  }, [validated, error, localError])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-start">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Address will be filled from GPS (or edit manually)"
        />
        {allowCurrentLocation && (
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={loading}
            className={`h-10 mt-1 px-3 whitespace-nowrap border rounded-md text-sm ${loading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700'}`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-gray-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Locating…
              </span>
            ) : (
              'Use current'
            )}
          </button>
        )}
            </div>

            {/* Inline manual coordinates, directly under address input */}
            <div className="mt-1">
              <label htmlFor="manual-coords" className="block text-xs font-medium text-gray-700">
                Manual coordinates
              </label>
              <div className="mt-1 flex items-start gap-2">
                <input
                  id="manual-coords"
                  type="text"
                  inputMode="decimal"
                  aria-describedby="coords-help coords-error"
                  placeholder="e.g., -1.2921, 36.8219"
                  className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 text-sm ${coordsError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  value={coordsValue}
                  onChange={async (e) => {
                    const val = e.target.value
                    setCoordsValue(val)
                    setCoordsError(null)
                    setLocalError(null)
                    if (!val || !val.trim()) return
                    const parsed = parseCoordinates(val)
                    if (!parsed) {
                      setCoordsError('Invalid format. Use "lat, lng" e.g., -1.2921, 36.8219')
                      return
                    }
                    if (!isValidLatLng(parsed.lat, parsed.lng)) {
                      setCoordsError('Out of range. Latitude -90..90, Longitude -180..180')
                      return
                    }
                    setCoordsLoading(true)
                    console.info(`[AddressAutocomplete] Manual coordinates entered: ${parsed.lat}, ${parsed.lng}`)

                    try {
                      const address = await reverseGeocode(parsed.lat, parsed.lng)

                      if (address && address !== `${parsed.lat}, ${parsed.lng}`) {
                        // Successfully got a real address
                        const res: GeocodeResult = { address, lat: parsed.lat, lng: parsed.lng }
                        setValidated(res)
                        onChange(address)
                        onSelect(res)
                      } else {
                        // Geocoding failed or returned coordinates, use coordinates as fallback
                        const res: GeocodeResult = { address: `${parsed.lat}, ${parsed.lng}`, lat: parsed.lat, lng: parsed.lng }
                        setValidated(res)
                        onChange(res.address)
                        onSelect(res)
                      }
                    } catch (e) {
                      console.error('Manual reverse geocoding error:', e)
                      const res: GeocodeResult = { address: `${parsed.lat}, ${parsed.lng}`, lat: parsed.lat, lng: parsed.lng }
                      setValidated(res)
                      onChange(res.address)
                      onSelect(res)
                    } finally {
                      setCoordsLoading(false)
                    }
                  }}
                />
                {coordsLoading && (
                  <svg className="animate-spin h-4 w-4 text-gray-500 mt-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                )}
                {!coordsError && coordsValue && validated && isValidLatLng(validated.lat, validated.lng) && (
                  <div className="text-xs text-green-600 mt-2" role="status" aria-live="polite">✓ Looks good</div>
                )}
              </div>
              <p id="coords-help" className="mt-1 text-[11px] text-gray-500">Decimal degrees only; spaces optional. Example: -3.4039, 38.5824</p>
              {coordsError && (
                <p id="coords-error" role="alert" className="mt-1 text-[11px] text-red-600">{coordsError}</p>
              )}
            </div>

      </div>
      <div className="mt-1 text-xs">
        {loading ? (
          <p className="text-gray-500">Locating…</p>
        ) : (
          <p className={`${error ? 'text-red-600' : validated ? 'text-green-600' : 'text-gray-500'}`}>{hint}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {policyBlocked && !loading && (
            <button
              type="button"
              className="underline text-blue-600 hover:text-blue-700"
              onClick={() => window.open(window.location.href, '_blank', 'noopener')}
            >
              Open this app in a new tab
            </button>
          )}
          {validated && isValidLatLng(validated.lat, validated.lng) && (
            <a
              href={`https://www.google.com/maps?q=${validated.lat},${validated.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
              aria-label="View selected location on Google Maps"
              title="View on Google Maps"
            >
              View on Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

