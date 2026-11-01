'use client';

import { useState } from 'react';
import type { Stop } from '@/lib/types';

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
    <div className="fixed inset-0 z-[2000] flex items-end bg-black/50" onClick={onCancel}>
      <div
        className="w-full rounded-t-3xl bg-white p-4 pb-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
        <h2 className="text-lg font-bold">Reject {stop.order_id}</h2>
        <p className="mb-3 text-sm text-slate-500">{stop.name ?? 'Customer'} — choose a reason</p>

        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm ${
                reason === r ? 'border-red-500 bg-red-50 font-semibold' : 'border-slate-200 bg-white'
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

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 py-3 font-semibold">
            Keep order
          </button>
          <button
            type="button"
            disabled={!reason || busy}
            onClick={() => onConfirm(reason)}
            className="rounded-xl bg-red-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
