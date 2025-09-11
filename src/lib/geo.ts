/**
 * Geo utilities for coordinate normalization and map URL generation
 * Handles mixed coordinate sources: numbers, strings, objects, Decimals, nulls
 */

export type LatLngInput =
  | number
  | string
  | null
  | undefined
  | { lat?: any; lng?: any }
  | { latitude?: any; longitude?: any }
  | { value?: any } // e.g., select, Decimal
  | { x?: any; y?: any }; // odd shapes

/**
 * Convert any value to a valid number or null
 * Handles Supabase Decimals, form objects, strings, etc.
 */
export function toNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return isFinite(n) ? n : null;
  }
  // Supabase Decimal or select-like objects
  if (typeof v === 'object') {
    // common decimal: { value: '-3.41847573' }
    if ('value' in v) return toNumber(v.value);
    // nested coords: { lat, lng } or { latitude, longitude }
    if ('lat' in v || 'lng' in v) return null; // handled by outer call
    if ('latitude' in v || 'longitude' in v) return null;
  }
  return null;
}

/**
 * Normalize mixed coordinate inputs to valid lat/lng numbers
 * Handles all common coordinate formats from forms, DB, APIs
 */
export function normalizeLatLng(inputLat: LatLngInput, inputLng: LatLngInput):
  | { lat: number; lng: number }
  | null {
  // Unwrap common shapes first
  const unwrap = (v: LatLngInput) => {
    if (v && typeof v === 'object') {
      // {lat,lng}
      if ('lat' in v || 'lng' in v) return { lat: toNumber((v as any).lat), lng: toNumber((v as any).lng) };
      // {latitude,longitude}
      if ('latitude' in v || 'longitude' in v) return { lat: toNumber((v as any).latitude), lng: toNumber((v as any).longitude) };
      // {value:{lat,lng}}
      if ('value' in v) return unwrap((v as any).value);
    }
    return { lat: toNumber(v), lng: undefined as any };
  };

  const latObj = unwrap(inputLat);
  const lngObj = unwrap(inputLng);

  const lat = toNumber(latObj?.lat ?? inputLat);
  const lng =
    toNumber(lngObj?.lng ?? inputLng) ??
    // handle when both come in one object
    (typeof inputLat === 'object' && inputLat && 'lng' in inputLat ? toNumber((inputLat as any).lng) : null) ??
    (typeof inputLat === 'object' && inputLat && 'longitude' in inputLat ? toNumber((inputLat as any).longitude) : null);

  if (lat == null || lng == null) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Build Google Maps URL with coordinates and optional label
 */
export function buildGoogleMapsUrl(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(`${lat},${lng}${label ? ` (${label})` : ''}`);
  return `https://www.google.com/maps?q=${q}`;
}

/**
 * Build Google Maps URL for a property with coordinates or address fallback
 * Prioritizes exact coordinates over address search
 */
export function buildPropertyMapsUrl(property: {
  lat?: number | null;
  lng?: number | null;
  physical_address?: string | null;
  location?: string | null;
  name?: string;
}) {
  // First try to use exact coordinates
  if (property.lat && property.lng) {
    const coords = normalizeLatLng(property.lat, property.lng);
    if (coords) {
      return buildGoogleMapsUrl(coords.lat, coords.lng, property.name);
    }
  }

  // Fallback to address search
  const address = property.physical_address || property.location;
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  return null;
}

/**
 * Coerce Supabase numeric/decimal columns to numbers
 * Use this right after fetching from DB
 */
export function coerceSupabaseCoords<T extends Record<string, any>>(
  rows: T[],
  latField: keyof T = 'latitude',
  lngField: keyof T = 'longitude'
): T[] {
  return rows.map(row => ({
    ...row,
    [latField]: toNumber(row[latField]),
    [lngField]: toNumber(row[lngField])
  }));
}

/**
 * Validate coordinates with Zod-like schema (optional)
 */
export function validateLatLng(lat: any, lng: any): { lat: number; lng: number } | null {
  const normLat = toNumber(lat);
  const normLng = toNumber(lng);
  
  if (normLat == null || normLng == null) return null;
  if (normLat < -90 || normLat > 90) return null;
  if (normLng < -180 || normLng > 180) return null;
  
  return { lat: normLat, lng: normLng };
}
