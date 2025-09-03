/**
 * ViewOnGoogleMapsButton - Clean, guarded map link component
 * Only renders when coordinates are truly valid
 * Handles all coordinate formats silently
 */

import React, { useMemo } from 'react';
import { normalizeLatLng, buildGoogleMapsUrl } from '../../lib/geo';

type Props = {
  source: 'Property List' | 'Purchase List' | 'Handover Pipeline' | string;
  name?: string; // e.g., "Vindo Block 1/3134 (0.046Ha)"
  lat: any; // mixed inputs supported
  lng: any;
  className?: string;
  compact?: boolean;
  onInvalid?: (reason: string) => void; // optional telemetry
};

export default function ViewOnGoogleMapsButton({ 
  source, 
  name, 
  lat, 
  lng, 
  className, 
  compact, 
  onInvalid 
}: Props) {
  const norm = useMemo(() => normalizeLatLng(lat, lng), [lat, lng]);

  if (!norm) {
    // Silent telemetry instead of console spam
    onInvalid?.(`${source} - ${name ?? 'Unknown'}: Missing/invalid coordinates`);
    return (
      <span 
        className={`inline-flex items-center text-xs opacity-60 ${className ?? ''}`} 
        aria-label="Map unavailable"
        title="Coordinates not available"
      >
        🗺️ N/A
      </span>
    );
  }

  const url = buildGoogleMapsUrl(norm.lat, norm.lng, name);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center rounded-lg px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors ${className ?? ''}`}
      aria-label={`Open on Google Maps: ${name ?? 'location'}`}
      title={`View ${name ?? 'location'} on Google Maps`}
    >
      🗺️ View on Maps{compact ? '' : ' ↗'}
    </a>
  );
}

/**
 * Hook for aggregating invalid coordinate telemetry
 * Use this to replace per-item console logs with summary stats
 */
export function useMapLinkTelemetry() {
  const [invalidCount, setInvalidCount] = React.useState(0);
  const [invalidReasons, setInvalidReasons] = React.useState<string[]>([]);

  const onInvalid = React.useCallback((reason: string) => {
    setInvalidCount(prev => prev + 1);
    setInvalidReasons(prev => [...prev.slice(-9), reason]); // Keep last 10
  }, []);

  const logSummary = React.useCallback((listName: string) => {
    if (invalidCount > 0 && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`${listName}: ${invalidCount} items missing/invalid coords`, {
        sample: invalidReasons.slice(0, 3)
      });
    }
  }, [invalidCount, invalidReasons]);

  const reset = React.useCallback(() => {
    setInvalidCount(0);
    setInvalidReasons([]);
  }, []);

  return { onInvalid, logSummary, reset, invalidCount };
}
