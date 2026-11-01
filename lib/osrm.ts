import type { Stop } from './types';

export type RoadRoute = { line: [number, number][]; km: number; minutes: number };

/**
 * Real road geometry through the stops, in order (OSRM).
 * The public demo server is only for testing - set NEXT_PUBLIC_OSRM_URL to your own server in production.
 */
export async function roadRoute(stops: (Stop & { lat: number; lng: number })[]): Promise<RoadRoute | null> {
  if (stops.length < 2) return null;

  const base = (process.env.NEXT_PUBLIC_OSRM_URL || 'https://router.project-osrm.org').replace(/\/+$/, '');
  const coords = stops.map((s) => `${s.lng.toFixed(6)},${s.lat.toFixed(6)}`).join(';');

  try {
    const res = await fetch(`${base}/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    if (!res.ok) return null;

    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route?.geometry?.coordinates) return null;

    const line = (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
    return { line, km: route.distance / 1000, minutes: route.duration / 60 };
  } catch {
    return null;
  }
}
