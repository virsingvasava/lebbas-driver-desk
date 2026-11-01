'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmSheet from '@/components/ConfirmSheet';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Icon from '@/components/Icon';
import Logo from '@/components/Logo';
import type { MapCommand } from '@/components/RouteMap';
import RejectSheet from '@/components/RejectSheet';
import StopCard from '@/components/StopCard';
import { EMIRATES } from '@/lib/emirates';
import type { RoadInfo, RouteResponse, Stop } from '@/lib/types';
import { addDays, fmtDate, hasPos, mapsRouteUrl, mapsStopUrl, plural, todayDubai } from '@/lib/util';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
});

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
  const [confirming, setConfirming] = useState<Stop | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [road, setRoad] = useState<RoadInfo | null | undefined>(undefined);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [command, setCommand] = useState<MapCommand>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

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
        if (silent) flash('Connection problem — showing last saved route');
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

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const w = navigator.geolocation.watchPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  useEffect(() => {
    if (selectedId != null) {
      document.getElementById(`stop-${selectedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

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
            ? `${stop.order_id} marked as picked up`
            : action === 'reject'
              ? `${stop.order_id} rejected`
              : `Time saved for ${stop.order_id}`,
        );
        setRejecting(null);
        setConfirming(null);
        if (action !== 'set_time') setSelectedId(null);
        await load(true);
      } catch {
        flash('Could not save. Check your connection and try again.');
      } finally {
        setBusyId(null);
      }
    },
    [d, t, load, flash],
  );

  const stops = useMemo<Stop[]>(() => route?.stops ?? [], [route]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    stops.forEach((s) => {
      if (s.emirate) c[s.emirate] = (c[s.emirate] || 0) + 1;
    });
    return c;
  }, [stops]);

  useEffect(() => {
    setRoad(undefined);
  }, [stops]);

  const pinnedCount = stops.filter(hasPos).length;
  const etas = stops.map((s) => s.eta).filter(Boolean) as string[];
  const lateCount = stops.filter((s) => s.late).length;
  const next = stops[0];
  const nextUrl = next ? mapsStopUrl(next) : null;
  const allUrl = mapsRouteUrl(stops);

  const dateList = Array.from({ length: 25 }, (_, i) => {
    const off = i - 7;
    const iso = addDays(todayDubai(), off);
    return { iso, label: fmtDate(iso) };
  });

  if (error === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <Logo size={56} className="mx-auto mb-4" />
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Icon name="lock" className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Link Expired or Invalid</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Please open your personalized <b>Driver Desk</b> link sent via WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Modular Header Component */}
      <Header
        driverName={route?.driver}
        date={date}
        setDate={setDate}
        loading={loading}
        onRefresh={() => load()}
        onOpenCalendar={() => setIsCalendarOpen(true)}
      />

      {/* Workspace Body */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Interactive Map Section */}
        <section
          className={`relative shrink-0 bg-slate-200 transition-all duration-300 lg:order-2 lg:h-auto lg:flex-1 ${
            mapExpanded ? 'h-[65dvh]' : 'h-[42dvh]'
          }`}
        >
          <RouteMap
            stops={stops}
            selectedId={selectedId}
            onSelect={setSelectedId}
            me={me}
            command={command}
            onRoad={setRoad}
          />

          {/* Map Overlay Floating Bar */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-2">
            {nextUrl && next ? (
              <a
                href={nextUrl}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto flex max-w-[72%] items-center gap-2 rounded-full bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition active:scale-95"
              >
                <Icon name="navigation" className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="truncate">Next: {next.name ?? next.order_id}</span>
              </a>
            ) : (
              <span />
            )}

            {/* Floating Map Utilities */}
            <div className="pointer-events-auto flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setCommand({ type: 'fit', n: Date.now() })}
                aria-label="Fit map"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition"
              >
                <Icon name="route" className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!me}
                onClick={() => setCommand({ type: 'me', n: Date.now() })}
                aria-label="My location"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-md transition disabled:text-slate-300"
              >
                <Icon name="locate" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMapExpanded((v) => !v)}
                aria-label="Toggle map size"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition lg:hidden"
              >
                <Icon name={mapExpanded ? 'shrink' : 'expand'} className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Stops & Condensed Metrics Panel */}
        <aside className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100/70 lg:order-1 lg:w-[440px] lg:flex-none lg:border-r lg:border-slate-200">
          {stops.length > 0 && (
            <div className="space-y-2.5 p-3">
              {/* Compact Inline Stats Bar for Mobile */}
              <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stops</p>
                  <p className="text-sm font-extrabold text-slate-900">{stops.length}</p>
                </div>
                <div className="border-l border-slate-100 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</p>
                  <p className="text-sm font-extrabold text-slate-900">{pinnedCount < 2 ? '—' : road ? `${Math.round(road.km)}km` : '...'}</p>
                </div>
                <div className="border-l border-slate-100 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delayed</p>
                  <p className={`text-sm font-extrabold ${lateCount ? 'text-rose-600' : 'text-slate-900'}`}>{lateCount}</p>
                </div>
                <div className="border-l border-slate-100 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timeline</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{etas.length ? etas[0] : '—'}</p>
                </div>
              </div>

              {/* Emirate Filter Pills */}
              <div className="flex flex-wrap items-center gap-1">
                {Object.keys(counts).map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EMIRATES[code]?.color || '#94a3b8' }} />
                    {EMIRATES[code]?.name ?? code} ({counts[code]})
                  </span>
                ))}
              </div>

              {allUrl && (
                <a
                  href={allUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs transition active:scale-[0.99]"
                >
                  <Icon name="navigation" className="h-3.5 w-3.5 text-emerald-400" />
                  Open Route in Google Maps (Top {Math.min(10, stops.length)})
                </a>
              )}
            </div>
          )}

          {/* Stops List */}
          <div className="flex-1 px-3 pb-24 pt-1">
            {loading && !route && (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
                ))}
              </div>
            )}

            {error === 'network' && !route && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-2xs">
                <p className="font-bold text-slate-800 text-sm">Connection Interrupted</p>
                <button
                  type="button"
                  onClick={() => load()}
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Retry Loading
                </button>
              </div>
            )}

            {route && stops.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon name="party" className="h-5 w-5" />
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900">All Done!</h3>
                <p className="text-xs text-slate-500">No pending pickups for {fmtDate(date)}.</p>
              </div>
            )}

            {stops.length > 0 && (
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {plural(stops.length, 'Pickup')}
                </h2>
                <span className="text-[10px] text-slate-400">Tap card for options</span>
              </div>
            )}

            <ul className="space-y-2.5">
              {stops.map((s, i) => (
                <StopCard
                  key={s.id}
                  stop={s}
                  index={i}
                  isNext={i === 0}
                  selected={selectedId === s.id}
                  busy={busyId === s.id}
                  onSelect={() => setSelectedId(selectedId === s.id ? null : s.id)}
                  onPicked={() => setConfirming(s)}
                  onReject={() => setRejecting(s)}
                  onSetTime={(time) => act(s, 'set_time', { time })}
                />
              ))}
            </ul>
          </div>
        </aside>
      </main>

      {/* Modular Footer Component */}
      <Footer date={date} />

      {confirming && (
        <ConfirmSheet
          title={`Confirm Pickup: ${confirming.order_id}`}
          text={`Customer: ${confirming.name ?? 'Unknown'}. Proceeding will complete this stop.`}
          confirmLabel="Mark Complete"
          busy={busyId === confirming.id}
          onCancel={() => setConfirming(null)}
          onConfirm={() => act(confirming, 'picked_up')}
        />
      )}

      {rejecting && (
        <RejectSheet
          stop={rejecting}
          busy={busyId === rejecting.id}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => act(rejecting, 'reject', { reason })}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
            <Icon name="check" className="h-3 w-3" />
          </span>
          {toast}
        </div>
      )}

      {/* Root-Level Full-Screen Date Picker Modal (Guaranteed never to be hidden by map) */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xs rounded-3xl bg-emerald-950 border border-emerald-800 p-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Select Route Date</h3>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-3 max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {dateList.map(({ iso, label }) => {
                const isSelected = iso === date;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setDate(iso);
                      setIsCalendarOpen(false);
                    }}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                        : 'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900'
                    }`}
                  >
                    <span>{label}</span>
                    {iso === todayDubai() && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase font-extrabold ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-800 text-emerald-200'}`}>
                        Today
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="w-full mt-1 rounded-xl bg-emerald-900/60 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900">
          <Logo size={64} />
        </div>
      }
    >
      <Desk />
    </Suspense>
  );
}

