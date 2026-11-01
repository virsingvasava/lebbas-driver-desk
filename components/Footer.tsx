'use client';

import Icon from '@/components/Icon';
import { fmtDate } from '@/lib/util';

interface FooterProps {
  date: string;
}

export default function Footer({ date }: FooterProps) {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-400">
      <div className="flex items-center justify-center gap-1.5 font-medium">
        <span>Lebas UAE Driver Desk</span>
        <span>•</span>
        <span>{fmtDate(date)}</span>
      </div>
    </footer>
  );
}