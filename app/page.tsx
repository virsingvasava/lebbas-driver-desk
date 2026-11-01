'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import RejectSheet from '@/components/RejectSheet';
import StopCard from '@/components/StopCard';
import { EMIRATES } from '@/lib/emirates';
import type { RoadInfo, RouteResponse, Stop } from '@/lib/types';
import { addDays, fmtDate, fmtDuration, mapsRouteUrl, mapsStopUrl, todayDubai } from '@/lib/util';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-200" />,
});

const DAYS = [
  { label: 'Yesterday', off: -1 },
  { label: 'Today', off: 0 },
  { label: 'Tomorrow', off: 1 },
];

type ActionName = 'picked_up' | 'reject' | 'set_time';

function Desk() {
  const params = useSearchParams();
  const d = params.get('d') ?? '';
  const t = params.get('t') ?? '';

  const [date, setDate] = useState<string>(todayDubai());
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<'invalid' | 'network' | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Stop | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [road, setRoad] = useState<RoadInfo | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ---- load the route ----
  const load = useCallback(
    async (silent = false) => {
      if (!d || !t) {
        setError('invalid');
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `/api/route?d=${encodeURIComponent(d)}&t=${encodeURIComponent(t)}&date=${date}`,
          { cache: 'no-store' },
        );
        if (res.status === 401) {
          setError('invalid');
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        setRoute((await res.json()) as RouteResponse);
        setError(null);
      } catch {
        if (silent) flash('⚠️ Connection problem — showing the last saved route');
        else setError('network');
      } finally {
        setLoading(false);
      }
    },
    [d, t, date, flash],
  );

  useEffect(() => {
    load();
  }, [load]);

  // refresh every minute + when the phone comes back to the page
  useEffect(() => {
    const id = setInterval(() => load(true), 60000);
    const onVis = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  // driver's GPS position
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const w = navigator.geolocation.watchPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  // keep the selected card in view
  useEffect(() => {
    if (selectedId != null) {
      document.getElementById(`stop-${selectedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  // ---- actions ----
  const act = useCallback(
    async (stop: Stop, action: ActionName, extra: Record<string, string> = {}) => {
      setBusyId(stop.id);
      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ d, t, order: stop.id, action, ...extra }),
        });
        if (!res.ok) throw new Error(String(res.status));

        flash(
          action === 'picked_up'
            ? `✅ ${stop.order_id} picked up`
            : action === 'reject'
              ? `❌ ${stop.order_id} rejected`
              : `🕒 Time saved for ${stop.order_id}`,
        );
        setRejecting(null);
        if (action !== 'set_time') setSelectedId(null);
        await load(true);
      } catch {
        flash('⚠️ Could not save. Check your connection and try again.');
      } finally {
        setBusyId(null);
      }
    },
    [d, t, load, flash],
  );

  // ---- derived ----
  const stops = useMemo<Stop[]>(() => route?.stops ?? [], [route]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    stops.forEach((s) => {
      if (s.emirate) c[s.emirate] = (c[s.emirate] || 0) + 1;
    });
    return c;
  }, [stops]);
  const etas = stops.map((s) => s.eta).filter(Boolean) as string[];
  const lateCount = stops.filter((s) => s.late).length;
  const next = stops[0];
  const nextUrl = next ? mapsStopUrl(next) : null;
  const allUrl = mapsRouteUrl(stops);

  // ---- screens ----
  if (error === 'invalid') {
    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow">
          <p className="text-4xl">🔒</p>
          <h1 className="mt-2 text-lg font-bold">Link not valid</h1>
          <p className="mt-1 text-sm text-slate-500">
            Please open the <b>Driver Desk</b> link from your Lebas WhatsApp chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* header */}
      <header className="bg-amber-500 px-4 pb-3 pt-3 text-white shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-90">Lebas UAE • Driver desk</p>
            <h1 className="text-lg font-bold leading-tight">{route?.driver ?? 'Driver'}</h1>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-full bg-white/20 px-3 py-2 text-sm font-semibold active:bg-white/30"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto">
          {DAYS.map(({ label, off }) => {
            const iso = addDays(todayDubai(), off);
            const active = iso === date;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setDate(iso)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  active ? 'bg-white text-amber-600' : 'bg-white/20 text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="ml-auto shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white [color-scheme:dark]"
          />
        </div>
      </header>

      {/* map */}
      <div className="relative h-[40dvh] shrink-0 bg-slate-200">
        <RouteMap stops={stops} selectedId={selectedId} onSelect={setSelectedId} me={me} onRoad={setRoad} />
        {nextUrl && next && (
          <a
            href={nextUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 left-3 z-[1000] max-w-[70%] truncate rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg active:bg-blue-700"
          >
            🧭 Next: {next.name ?? next.order_id}
          </a>
        )}
      </div>

      {/* summary */}
      {stops.length > 0 && (
        <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-bold">📦 {stops.length} stops</span>
            {route && route.max > 0 && stops.length > route.max && (
              <span className="font-semibold text-red-600">over {route.max}</span>
            )}
            {etas.length > 0 && (
              <span className="text-slate-600">
                🕒 {etas[0]} → {etas[etas.length - 1]}
              </span>
            )}
            {road && (
              <span className="text-slate-600">
                🛣️ {Math.round(road.km)} km · {fmtDuration(road.minutes)}
              </span>
            )}
            {lateCount > 0 && <span className="font-semibold text-amber-600">⚠️ {lateCount} late</span>}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {Object.keys(counts).map((code) => (
              <span
                key={code}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold"
              >
                <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: EMIRATES[code]?.color }} />
                {EMIRATES[code]?.name ?? code} {counts[code]}
              </span>
            ))}
            {allUrl && (
              <a
                href={allUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-white"
              >
                Open first {Math.min(10, stops.length)} in Google Maps
              </a>
            )}
          </div>
        </div>
      )}

      {/* stops */}
      <main className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
        {loading && !route && <p className="py-10 text-center text-slate-500">Loading route…</p>}

        {error === 'network' && !route && (
          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <p className="font-semibold">Can’t reach the server</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-3 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {route && stops.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow">
            <p className="text-4xl">🎉</p>
            <p className="mt-2 font-bold">No pending pickups</p>
            <p className="text-sm text-slate-500">{fmtDate(date)}</p>
          </div>
        )}

        <ul className="space-y-3">
          {stops.map((s, i) => (
            <StopCard
              key={s.id}
              stop={s}
              index={i}
              selected={selectedId === s.id}
              busy={busyId === s.id}
              onSelect={() => setSelectedId(selectedId === s.id ? null : s.id)}
              onPicked={() => {
                if (window.confirm(`Mark ${s.order_id} as picked up?`)) act(s, 'picked_up');
              }}
              onReject={() => setRejecting(s)}
              onSetTime={(time) => act(s, 'set_time', { time })}
            />
          ))}
        </ul>
      </main>

      {rejecting && (
        <RejectSheet
          stop={rejecting}
          busy={busyId === rejecting.id}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => act(rejecting, 'reject', { reason })}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[3000] w-[90%] max-w-sm -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading…</div>}>
      <Desk />
    </Suspense>
  );
}
