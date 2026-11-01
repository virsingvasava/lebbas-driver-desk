import type { Stop } from './types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today's date in the UAE (UTC+4), as YYYY-MM-DD */
export function todayDubai(): string {
  return new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export const hasPos = (s: Stop): boolean => s.lat != null && s.lng != null;

const ll = (s: Stop): string => `${Number(s.lat).toFixed(6)},${Number(s.lng).toFixed(6)}`;

/** Google Maps link for ONE stop */
export function mapsStopUrl(s: Stop): string | null {
  return hasPos(s) ? `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${ll(s)}` : null;
}

/** Google Maps link for up to 10 stops in order, starting from the driver's location */
export function mapsRouteUrl(stops: Stop[]): string | null {
  const p = stops.filter(hasPos).slice(0, 10);
  if (!p.length) return null;
  const dest = p[p.length - 1];
  const via = p.slice(0, -1);
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${ll(dest)}`;
  if (via.length) url += `&waypoints=${via.map(ll).join('%7C')}`;
  return url;
}

export const digitsOnly = (s: string | null): string => (s ?? '').replace(/\D/g, '');

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
