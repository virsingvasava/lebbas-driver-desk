'use client';

import { useState } from 'react';
import type { Stop } from '@/lib/types';
import Icon from './Icon';

const REASONS = [
  'Clothes not suitable / poor quality',
  'Customer not available',
  'Wrong address / location',
  'Too few items',
  'Other reason',
];

type Props = {
  stop: Stop;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export default function RejectSheet({ stop, busy, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState<string>('');

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-7 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Icon name="x" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold leading-tight">Reject {stop.order_id}</h2>
            <p className="truncate text-sm text-slate-500">{stop.name ?? 'Customer'} — choose a reason</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm ${
                reason === r ? 'border-red-500 bg-red-50 font-bold' : 'border-slate-200 bg-white'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  reason === r ? 'border-red-500' : 'border-slate-300'
                }`}
              >
                {reason === r && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
              </span>
              {r}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="h-12 rounded-xl border border-slate-300 font-bold text-slate-700">
            Keep order
          </button>
          <button
            type="button"
            disabled={!reason || busy}
            onClick={() => onConfirm(reason)}
            className="h-12 rounded-xl bg-red-600 font-bold text-white active:bg-red-700 disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
