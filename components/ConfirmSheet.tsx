'use client';

import Icon from './Icon';

type Props = {
  title: string;
  text: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmSheet({ title, text, confirmLabel, busy, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-7 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Icon name="check" className="h-7 w-7" />
        </div>
        <h2 className="text-center text-lg font-extrabold">{title}</h2>
        <p className="mt-1 text-center text-sm text-slate-500">{text}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="h-12 rounded-xl border border-slate-300 font-bold text-slate-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-12 rounded-xl bg-brand-600 font-bold text-white active:bg-brand-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
