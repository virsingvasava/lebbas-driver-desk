'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmSheet from '@/components/ConfirmSheet';
import Icon, { type IconName } from '@/components/Icon';
import Logo from '@/components/Logo';
import type { MapCommand } from '@/components/RouteMap';
import RejectSheet from '@/components/RejectSheet';
import StopCard from '@/components/StopCard';
import { EMIRATES } from '@/lib/emirates';
import type { RoadInfo, RouteResponse, Stop } from '@/lib/types';
import { addDays, fmtDate, fmtDuration, hasPos, mapsRouteUrl, mapsStopUrl, plural, todayDubai } from '@/lib/util';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-brand-50" />,
});

const DAYS = [
  { label: 'Yesterday', off: -1 },
  { label: 'Today', off: 0 },
  { label: 'Tomorrow', off: 1 },
];

type ActionName = 'picked_up' | 'reject' | 'set_time';

function Tile({
  icon,
  label,
  value,
  sub,
  tone = 'normal',
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  tone?: 'normal' | 'warn';
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <Icon name={icon} className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-lg font-extrabold leading-tight ${tone === 'warn' ? 'text-red-600' : 'text-brand-800'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

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
  const [mapBig, setMapBig] = useState(false);
  const [command, setCommand] = useState<MapCommand>(null);

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
        if (silent) flash('Connection problem — showing the last saved route');
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

  // ---- derived ----
  const stops = useMemo<Stop[]>(() => route?.stops ?? [], [route]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    stops.forEach((s) => {
      if (s.emirate) c[s.emirate] = (c[s.emirate] || 0) + 1;
    });
    return c;
  }, [stops]);
  useEffect(() => {
    setRoad(undefined); // new stops -> road distance is being calculated again
  }, [stops]);

  const pinnedCount = stops.filter(hasPos).length;
  const etas = stops.map((s) => s.eta).filter(Boolean) as string[];
  const lateCount = stops.filter((s) => s.late).length;
  const next = stops[0];
  const nextUrl = next ? mapsStopUrl(next) : null;
  const allUrl = mapsRouteUrl(stops);
  const isPreset = DAYS.some((x) => addDays(todayDubai(), x.off) === date);

  // ---- invalid link ----
  if (error === 'invalid') {
    return (
      <div className="flex h-dvh items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex justify-center">
            <Logo size={64} />
          </div>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon name="lock" className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-extrabold">Link not valid</h1>
          <p className="mt-1 text-sm text-slate-500">
            Please open the <b>Driver Desk</b> link from your Lebas WhatsApp chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* ================= header ================= */}
      <header className="relative z-20 shrink-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white shadow-lg">
        <div className="flex items-center gap-3 px-4 pb-2 pt-3">
          <Logo size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-100/80">Lebas UAE · Driver desk</p>
            <h1 className="truncate text-xl font-extrabold leading-tight">{route?.driver ?? 'Driver'}</h1>
          </div>
          <button
            type="button"
            onClick={() => load()}
            aria-label="Refresh"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
          >
            <Icon name="refresh" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="flex rounded-full bg-black/25 p-1">
            {DAYS.map(({ label, off }) => {
              const iso = addDays(todayDubai(), off);
              const active = iso === date;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDate(iso)}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    active ? 'bg-white text-brand-800 shadow' : 'text-white/90'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <label
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isPreset ? 'bg-white/15 text-white' : 'bg-white text-brand-800'
            }`}
          >
            <Icon name="calendar" className="h-5 w-5" />
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Choose a date"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          <span className="ml-auto text-sm font-semibold text-brand-100">{fmtDate(date)}</span>
        </div>
        <div className="h-1 bg-leaf-500" />
      </header>

      {/* ================= body ================= */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* map */}
        <section
          className={`relative shrink-0 bg-brand-50 transition-[height] duration-300 lg:order-2 lg:h-auto lg:flex-1 ${
            mapBig ? 'h-[64dvh]' : 'h-[34dvh]'
          }`}
        >
          <RouteMap stops={stops} selectedId={selectedId} onSelect={setSelectedId} me={me} command={command} onRoad={setRoad} />

          {/* floating controls */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000] flex items-end justify-between gap-2">
            {nextUrl && next ? (
              <a
                href={nextUrl}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto flex min-w-0 max-w-[68%] items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-extrabold text-white shadow-xl active:bg-brand-800"
              >
                <Icon name="navigation" className="h-4 w-4 shrink-0" />
                <span className="truncate">Next: {next.name ?? next.order_id}</span>
              </a>
            ) : (
              <span />
            )}

            <div className="pointer-events-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCommand({ type: 'fit', n: Date.now() })}
                aria-label="Show all stops"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-800 shadow-lg active:bg-brand-50"
              >
                <Icon name="route" className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={!me}
                onClick={() => setCommand({ type: 'me', n: Date.now() })}
                aria-label="My location"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg active:bg-blue-50 disabled:text-slate-300"
              >
                <Icon name="locate" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setMapBig((v) => !v)}
                aria-label={mapBig ? 'Smaller map' : 'Bigger map'}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg active:bg-slate-100 lg:hidden"
              >
                <Icon name={mapBig ? 'shrink' : 'expand'} className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* list */}
        <aside className="min-h-0 flex-1 overflow-y-auto bg-canvas lg:order-1 lg:w-[440px] lg:flex-none lg:border-r lg:border-slate-200">
          {stops.length > 0 && (
            <div className="space-y-3 px-3 pt-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                <Tile
                  icon="box"
                  label="Stops"
                  value={String(stops.length)}
                  sub={route && route.max > 0 ? `of ${route.max} max` : undefined}
                  tone={route && route.max > 0 && stops.length > route.max ? 'warn' : 'normal'}
                />
                <Tile icon="clock" label="Timeline" value={etas.length ? `${etas[0]} → ${etas[etas.length - 1]}` : '—'} />
                <Tile
                  icon="route"
                  label="Road"
                  value={pinnedCount < 2 ? '—' : road ? `${Math.round(road.km)} km` : road === null ? 'n/a' : '…'}
                  sub={
                    pinnedCount < 2
                      ? 'needs 2+ stops'
                      : road
                        ? fmtDuration(road.minutes)
                        : road === null
                          ? 'straight line only'
                          : 'calculating'
                  }
                />
                <Tile
                  icon="alert"
                  label="Late"
                  value={String(lateCount)}
                  sub={lateCount ? 'outside time slot' : 'all on time'}
                  tone={lateCount ? 'warn' : 'normal'}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {Object.keys(counts).map((code) => (
                  <span
                    key={code}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold"
                  >
                    <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: EMIRATES[code]?.color }} />
                    {EMIRATES[code]?.name ?? code}
                    <span className="text-slate-400">{counts[code]}</span>
                  </span>
                ))}
              </div>

              {allUrl && (
                <a
                  href={allUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-brand-600 bg-white text-sm font-extrabold text-brand-700 active:bg-brand-50"
                >
                  <Icon name="navigation" className="h-4 w-4" />
                  Open first {Math.min(10, stops.length)} in Google Maps
                </a>
              )}
            </div>
          )}

          <div className="px-3 pb-28 pt-3">
            {loading && !route && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            )}

            {error === 'network' && !route && (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="font-extrabold">Can’t reach the server</p>
                <p className="mt-1 text-sm text-slate-500">Check your internet connection and try again.</p>
                <button
                  type="button"
                  onClick={() => load()}
                  className="mt-4 h-11 rounded-xl bg-brand-600 px-6 font-bold text-white active:bg-brand-700"
                >
                  Try again
                </button>
              </div>
            )}

            {route && stops.length === 0 && (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf-100 text-brand-700">
                  <Icon name="party" className="h-7 w-7" />
                </div>
                <p className="mt-3 text-lg font-extrabold">No pending pickups</p>
                <p className="text-sm text-slate-500">{fmtDate(date)}</p>
              </div>
            )}

            {stops.length > 0 && (
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">
                  Pickups · {plural(stops.length, 'stop')}
                </h2>
                <span className="text-xs text-slate-400">Tap a stop for actions</span>
              </div>
            )}

            <ul className="space-y-3">
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
      </div>

      {confirming && (
        <ConfirmSheet
          title={`Picked up ${confirming.order_id}?`}
          text={`${confirming.name ?? 'Customer'} — the order will be marked as completed.`}
          confirmLabel="Yes, picked up"
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
        <div className="fixed bottom-6 left-1/2 z-[3000] flex w-[92%] max-w-sm -translate-x-1/2 items-center gap-2 rounded-2xl bg-brand-900 px-4 py-3 text-sm font-bold text-white shadow-2xl">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-500 text-brand-900">
            <Icon name="check" className="h-4 w-4" />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700">
          <Logo size={72} />
        </div>
      }
    >
      <Desk />
    </Suspense>
  );
}
