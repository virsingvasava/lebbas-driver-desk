'use client';

import Icon from '@/components/Icon';
import Logo from '@/components/Logo';
import { addDays, todayDubai } from '@/lib/util';

const DAYS = [
  { label: 'Yes', full: 'Yesterday', off: -1 },
  { label: 'Tod', full: 'Today', off: 0 },
  { label: 'Tom', full: 'Tomorrow', off: 1 },
];

interface HeaderProps {
  driverName?: string;
  date: string;
  setDate: (date: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

export default function Header({ driverName, date, setDate, loading, onRefresh }: HeaderProps) {
  const isPreset = DAYS.some((x) => addDays(todayDubai(), x.off) === date);

  return (
    <header className="relative z-30 shrink-0 bg-emerald-900 text-white shadow-md">
      <div className="flex items-center justify-between px-3 py-2.5">
        {/* Logo & Driver info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo size={36} />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/80">Lebas Logistics</p>
            <h1 className="truncate text-sm font-extrabold leading-tight text-white">{driverName ?? 'Driver Desk'}</h1>
          </div>
        </div>

        {/* Mobile Date Switcher & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex rounded-lg bg-emerald-950/40 p-0.5">
            {DAYS.map(({ label, off }) => {
              const iso = addDays(todayDubai(), off);
              const active = iso === date;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDate(iso)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    active ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-emerald-100/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Enhanced Date Picker Icon Button */}
          <label
            title="Pick custom date"
            className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition ${
              isPreset ? 'bg-emerald-950/40 text-emerald-200' : 'bg-emerald-500 text-slate-950'
            }`}
          >
            <Icon name="calendar" className="h-3.5 w-3.5" />
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            />
          </label>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh route"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950/40 text-emerald-200 transition active:scale-95"
          >
            <Icon name="refresh" className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}