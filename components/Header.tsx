'use client';

import Icon from '@/components/Icon';
import Logo from '@/components/Logo';
import { addDays, fmtDate, todayDubai } from '@/lib/util';

const DAYS = [
  { label: 'Yesterday', off: -1 },
  { label: 'Today', off: 0 },
  { label: 'Tomorrow', off: 1 },
];

interface HeaderProps {
  driverName?: string;
  date: string;
  setDate: (date: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onOpenCalendar: () => void;
}

export default function Header({ driverName, date, setDate, loading, onRefresh, onOpenCalendar }: HeaderProps) {
  const isPresetDate = DAYS.some((x) => addDays(todayDubai(), x.off) === date);

  return (
    <header className="relative z-35 shrink-0 bg-emerald-900 text-white shadow-md">
      {/* Top Row: Logo, Driver Name & Refresh */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo size={36} />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/80">Lebas Logistics</p>
            <h1 className="truncate text-sm font-extrabold leading-tight text-white">{driverName ?? 'Driver Desk'}</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh route"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-200 transition hover:bg-emerald-950 active:scale-95 shadow-xs"
        >
          <Icon name="refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Bottom Row: Uniform Tabs for Yesterday, Today, Tomorrow & Custom Calendar */}
      <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-0.5 border-t border-emerald-800/60">
        {DAYS.map(({ label, off }) => {
          const iso = addDays(todayDubai(), off);
          const active = iso === date;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setDate(iso)}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-all ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-emerald-950/30 text-emerald-100/80 hover:bg-emerald-950/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}

        {/* Custom Calendar Modal Trigger Button */}
        <button
          type="button"
          onClick={onOpenCalendar}
          title="Select custom date"
          className={`flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
            !isPresetDate
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-emerald-950/50 text-emerald-200 hover:bg-emerald-950'
          }`}
        >
          <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px] max-w-[65px] truncate">
            {!isPresetDate ? fmtDate(date).slice(0, 6) : 'More'}
          </span>
        </button>
      </div>
    </header>
  );
}

