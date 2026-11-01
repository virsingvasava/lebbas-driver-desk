'use client';

import { useState } from 'react';
import { colorOf, nameOf } from '@/lib/emirates';
import type { Stop } from '@/lib/types';
import { digitsOnly, mapsStopUrl } from '@/lib/util';

type Props = {
  stop: Stop;
  index: number;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onPicked: () => void;
  onReject: () => void;
  onSetTime: (time: string) => void;
};

export default function StopCard({ stop, index, selected, busy, onSelect, onPicked, onReject, onSetTime }: Props) {
  const [time, setTime] = useState<string>((stop.eta ?? '09:00').slice(0, 5));
  const color = colorOf(stop.emirate);
  const nav = mapsStopUrl(stop);
  const phone = digitsOnly(stop.phone);

  return (
    <li
      id={`stop-${stop.id}`}
      className={`rounded-2xl border bg-white shadow-sm ${
        selected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'
      }`}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 p-3 text-left">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: color }}
        >
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{stop.name ?? 'Customer'}</span>
          <span className="block truncate text-xs text-slate-500">
            {[stop.area, stop.slot].filter(Boolean).join(' · ')}
          </span>
          {stop.emirate && (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: color + '22', color }}
            >
              {nameOf(stop.emirate)}
            </span>
          )}
        </span>

        {stop.eta && (
          <span className={`font-mono text-sm font-bold ${stop.late ? 'text-red-600' : 'text-slate-700'}`}>
            {stop.eta}
            {stop.late ? ' ⚠' : ''}
          </span>
        )}
      </button>

      {selected && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          <p className="text-xs text-slate-500">
            {stop.order_id}
            {stop.phone ? ` · ${stop.phone}` : ''}
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
            {stop.phone ? (
              <a href={`tel:+${phone}`} className="rounded-xl bg-slate-100 py-2.5 active:bg-slate-200">
                📞 Call
              </a>
            ) : (
              <span className="rounded-xl bg-slate-50 py-2.5 text-slate-300">📞 Call</span>
            )}
            {stop.phone ? (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-slate-100 py-2.5 active:bg-slate-200"
              >
                💬 WhatsApp
              </a>
            ) : (
              <span className="rounded-xl bg-slate-50 py-2.5 text-slate-300">💬 WhatsApp</span>
            )}
            {nav ? (
              <a href={nav} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 py-2.5 text-white active:bg-blue-700">
                🧭 Navigate
              </a>
            ) : (
              <span className="rounded-xl bg-slate-50 py-2.5 text-slate-300">🧭 No pin</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || !time}
              onClick={() => onSetTime(time)}
              className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              🕒 Save time
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onPicked}
              className="rounded-xl bg-emerald-600 py-3 font-bold text-white active:bg-emerald-700 disabled:opacity-40"
            >
              {busy ? 'Saving…' : '✅ Picked up'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="rounded-xl bg-red-50 py-3 font-bold text-red-600 active:bg-red-100 disabled:opacity-40"
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
