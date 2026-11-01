'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { colorOf } from '@/lib/emirates';
import { roadRoute } from '@/lib/osrm';
import type { RoadInfo, Stop } from '@/lib/types';

type Me = { lat: number; lng: number } | null;
type Pinned = Stop & { lat: number; lng: number };
export type MapCommand = { type: 'me' | 'fit'; n: number } | null;

type Props = {
  stops: Stop[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  me: Me;
  command: MapCommand;
  onRoad?: (info: RoadInfo | null) => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Entry = { m: any; p: Pinned; i: number };
type Ctx = { L: any; map: any; layer: any; markers: Map<number, Entry>; meMarker: any; bounds: any[] };

// OpenStreetMap tiles (free, no key). For heavy production use, set NEXT_PUBLIC_TILES_URL to a provider with a key.
const TILES = process.env.NEXT_PUBLIC_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export default function RouteMap({ stops, selectedId, onSelect, me, command, onRoad }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const [ready, setReady] = useState(false);

  // keep the latest callbacks / selection without re-drawing the whole map
  const onSelectRef = useRef(onSelect);
  const onRoadRef = useRef(onRoad);
  const selectedRef = useRef(selectedId);
  onSelectRef.current = onSelect;
  onRoadRef.current = onRoad;
  selectedRef.current = selectedId;

  const makeIcon = (L: any, p: Pinned, i: number, selected: boolean) =>
    L.divIcon({
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      html: `<div class="lb-pin ${i === 0 ? 'is-next' : ''} ${selected ? 'is-selected' : ''}" style="--c:${colorOf(p.emirate)}">${i + 1}</div>`,
    });

  // 1) create the map once
  useEffect(() => {
    let dead = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const L = (await import('leaflet')).default;
      if (dead || !box.current) return;

      const map = L.map(box.current, { zoomControl: false }).setView([25.2, 55.27], 10);
      L.tileLayer(TILES, {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      ctx.current = { L, map, layer: L.layerGroup().addTo(map), markers: new Map(), meMarker: null, bounds: [] };

      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(box.current);

      setReady(true);
    })();

    return () => {
      dead = true;
      ro?.disconnect();
      ctx.current?.map.remove();
      ctx.current = null;
    };
  }, []);

  // 2) draw stops + the road line whenever the stops change
  useEffect(() => {
    const c = ctx.current;
    if (!ready || !c) return;

    const { L, map, layer, markers } = c;
    layer.clearLayers();
    markers.clear();

    const pts = stops.filter((s): s is Pinned => s.lat != null && s.lng != null);
    if (!pts.length) {
      c.bounds = [];
      onRoadRef.current?.(null);
      return;
    }

    const latlngs = pts.map((p) => [p.lat, p.lng]);
    c.bounds = latlngs;

    // dashed straight line shown until the real road route arrives
    const fallback = L.polyline(latlngs, { color: '#64748b', weight: 3, dashArray: '6 8' }).addTo(layer);

    pts.forEach((p, i) => {
      const m = L.marker([p.lat, p.lng], { icon: makeIcon(L, p, i, selectedRef.current === p.id), riseOnHover: true }).addTo(layer);
      m.bindPopup(
        `<b>${i + 1}. ${esc(p.name)}</b><br><span style="color:#64748b">${esc(p.order_id)}</span>${p.eta ? '<br>ETA <b>' + esc(p.eta) + '</b>' : ''}`,
        { closeButton: false },
      );
      m.on('click', () => onSelectRef.current(p.id));
      markers.set(p.id, { m, p, i });
    });

    map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 15 });

    let dead = false;
    roadRoute(pts).then((r) => {
      if (dead) return;
      onRoadRef.current?.(r ? { km: r.km, minutes: r.minutes } : null);
      if (!r) return;
      layer.removeLayer(fallback);
      L.polyline(r.line, { color: '#ffffff', weight: 11, opacity: 0.95 }).addTo(layer); // casing
      L.polyline(r.line, { color: '#065a3c', weight: 6, opacity: 0.95 }).addTo(layer); // road line (brand green)
      markers.forEach((e) => e.m.setZIndexOffset(1000));
    });

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stops]);

  // 3) selected stop -> restyle markers + fly there
  useEffect(() => {
    const c = ctx.current;
    if (!ready || !c) return;

    c.markers.forEach(({ m, p, i }, id) => m.setIcon(makeIcon(c.L, p, i, id === selectedId)));

    if (selectedId == null) return;
    const e = c.markers.get(selectedId);
    if (!e) return;
    c.map.flyTo(e.m.getLatLng(), Math.max(c.map.getZoom(), 14), { duration: 0.6 });
    e.m.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  // 4) driver's own position
  useEffect(() => {
    const c = ctx.current;
    if (!ready || !c) return;

    if (!me) {
      if (c.meMarker) {
        c.map.removeLayer(c.meMarker);
        c.meMarker = null;
      }
      return;
    }
    if (!c.meMarker) {
      c.meMarker = c.L.circleMarker([me.lat, me.lng], {
        radius: 9, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
      }).addTo(c.map);
    } else {
      c.meMarker.setLatLng([me.lat, me.lng]);
    }
  }, [me, ready]);

  // 5) buttons on the page: "my location" / "show all stops"
  useEffect(() => {
    const c = ctx.current;
    if (!ready || !c || !command) return;

    if (command.type === 'me' && me) c.map.flyTo([me.lat, me.lng], 15, { duration: 0.6 });
    if (command.type === 'fit' && c.bounds.length) c.map.fitBounds(c.bounds, { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, ready]);

  return <div ref={box} className="h-full w-full" />;
}
