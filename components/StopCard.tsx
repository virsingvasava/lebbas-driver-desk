'use client';

import { useState } from 'react';
import { colorOf, nameOf } from '@/lib/emirates';
import type { Stop } from '@/lib/types';
import { digitsOnly, mapsStopUrl } from '@/lib/util';
import Icon from './Icon';

type Props = {
  stop: Stop;
  index: number;
  isNext: boolean;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onPicked: () => void;
  onReject: () => void;
  onSetTime: (time: string) => void;
};

const BTN =
  'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition active:scale-[.98] disabled:opacity-40';

export default function StopCard({ stop, index, isNext, selected, busy, onSelect, onPicked, onReject, onSetTime }: Props) {
  const [time, setTime] = useState<string>((stop.eta ?? '09:00').slice(0, 5));
  const color = colorOf(stop.emirate);
  const nav = mapsStopUrl(stop);
  const phone = digitsOnly(stop.phone);

  return (
    <li
      id={`stop-${stop.id}`}
      className={`rounded-2xl border bg-white transition ${
        selected ? 'border-brand-500 shadow-lg ring-2 ring-brand-200' : 'border-slate-200 shadow-sm'
      }`}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 p-3 text-left">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-sm"
          style={{ background: color }}
        >
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[15px] font-extrabold leading-tight">{stop.name ?? 'Customer'}</span>
            {isNext && (
              <span className="rounded-full bg-leaf-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-900">
                Next
              </span>
            )}
          </span>

          {stop.area && (
            <span dir="auto" className="mt-0.5 block truncate text-xs text-slate-500 [unicode-bidi:plaintext]">
              {stop.area}
            </span>
          )}

          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {stop.slot && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{stop.slot}</span>
            )}
            {stop.emirate && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: color + '1f', color }}>
                {nameOf(stop.emirate)}
              </span>
            )}
          </span>
        </span>

        {stop.eta && (
          <span className="shrink-0 text-right">
            <span className={`block font-mono text-base font-extrabold ${stop.late ? 'text-red-600' : 'text-brand-700'}`}>
              {stop.eta}
            </span>
            {stop.late && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                <Icon name="alert" className="h-3 w-3" /> Late
              </span>
            )}
          </span>
        )}
      </button>

      {selected && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold">{stop.order_id}</span>
            {stop.phone && <span dir="ltr">{stop.phone}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {nav ? (
              <a href={nav} target="_blank" rel="noreferrer" className={`${BTN} bg-blue-600 text-white active:bg-blue-700`}>
                <Icon name="navigation" className="h-4 w-4" /> Navigate
              </a>
            ) : (
              <span className={`${BTN} bg-slate-100 text-slate-400`}>No pin</span>
            )}
            {stop.phone ? (
              <a href={`tel:+${phone}`} className={`${BTN} border border-slate-200 bg-white text-slate-800`}>
                <Icon name="phone" className="h-4 w-4" /> Call
              </a>
            ) : (
              <span className={`${BTN} bg-slate-100 text-slate-400`}>Call</span>
            )}
            {stop.phone ? (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noreferrer"
                className={`${BTN} border border-slate-200 bg-white text-brand-700`}
              >
                <Icon name="message" className="h-4 w-4" /> Chat
              </a>
            ) : (
              <span className={`${BTN} bg-slate-100 text-slate-400`}>Chat</span>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
            <Icon name="clock" className="ml-1 h-5 w-5 shrink-0 text-slate-400" />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="Pickup time"
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
            />
            <button
              type="button"
              disabled={busy || !time}
              onClick={() => onSetTime(time)}
              className="h-10 rounded-lg bg-slate-800 px-4 text-sm font-bold text-white active:bg-slate-900 disabled:opacity-40"
            >
              Save time
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onPicked}
              className={`${BTN} col-span-3 h-14 bg-brand-600 text-base text-white shadow-md active:bg-brand-700`}
            >
              <Icon name="check" className="h-5 w-5" /> Picked up
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className={`${BTN} col-span-2 h-14 border border-red-200 bg-red-50 text-red-600 active:bg-red-100`}
            >
              <Icon name="x" className="h-5 w-5" /> Reject
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
