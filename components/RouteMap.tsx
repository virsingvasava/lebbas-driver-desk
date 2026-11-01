'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { colorOf } from '@/lib/emirates';
import { roadRoute } from '@/lib/osrm';
import type { RoadInfo, Stop } from '@/lib/types';

type Me = { lat: number; lng: number } | null;
type Pinned = Stop & { lat: number; lng: number };

type Props = {
  stops: Stop[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  me: Me;
  onRoad?: (info: RoadInfo | null) => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { L: any; map: any; layer: any; markers: Map<number, any>; meMarker: any };

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export default function RouteMap({ stops, selectedId, onSelect, me, onRoad }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const [ready, setReady] = useState(false);

  // keep the latest callbacks without re-drawing the map
  const onSelectRef = useRef(onSelect);
  const onRoadRef = useRef(onRoad);
  onSelectRef.current = onSelect;
  onRoadRef.current = onRoad;

  // 1) create the map once
  useEffect(() => {
    let dead = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (dead || !box.current) return;

      const map = L.map(box.current, { zoomControl: false }).setView([25.2, 55.27], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      ctx.current = { L, map, layer: L.layerGroup().addTo(map), markers: new Map(), meMarker: null };
      setReady(true);
    })();

    return () => {
      dead = true;
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
      onRoadRef.current?.(null);
      return;
    }

    const latlngs = pts.map((p) => [p.lat, p.lng]);

    // dashed straight line shown until the real road route arrives
    const fallback = L.polyline(latlngs, { color: '#64748b', weight: 3, dashArray: '6 8' }).addTo(layer);

    pts.forEach((p, i) => {
      const icon = L.divIcon({
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        html: `<div style="background:${colorOf(p.emirate)};color:#fff;width:34px;height:34px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45)">${i + 1}</div>`,
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(layer);
      m.bindPopup(`<b>${i + 1}. ${esc(p.name)}</b><br>${esc(p.order_id)}${p.eta ? '<br>ETA ' + esc(p.eta) : ''}`);
      m.on('click', () => onSelectRef.current(p.id));
      markers.set(p.id, m);
    });

    map.fitBounds(latlngs, { padding: [36, 36], maxZoom: 15 });

    let dead = false;
    roadRoute(pts).then((r) => {
      if (dead) return;
      onRoadRef.current?.(r ? { km: r.km, minutes: r.minutes } : null);
      if (!r) return;
      layer.removeLayer(fallback);
      L.polyline(r.line, { color: '#ffffff', weight: 10, opacity: 0.95 }).addTo(layer);   // casing
      L.polyline(r.line, { color: '#1e293b', weight: 5, opacity: 0.95 }).addTo(layer);    // road line
      markers.forEach((m: any) => m.setZIndexOffset(1000));
    });

    return () => {
      dead = true;
    };
  }, [ready, stops]);

  // 3) selected stop -> fly there
  useEffect(() => {
    const c = ctx.current;
    if (!ready || !c || selectedId == null) return;
    const m = c.markers.get(selectedId);
    if (!m) return;
    c.map.flyTo(m.getLatLng(), Math.max(c.map.getZoom(), 14), { duration: 0.6 });
    m.openPopup();
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
        radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
      }).addTo(c.map);
    } else {
      c.meMarker.setLatLng([me.lat, me.lng]);
    }
  }, [me, ready]);

  return <div ref={box} className="h-full w-full" />;
}
