import { NextRequest, NextResponse } from 'next/server';
import { laravel } from '@/lib/laravel';
import { verifyToken } from '@/lib/token';

export const dynamic = 'force-dynamic';

// POST /api/action   { d, t, order, action: 'picked_up' | 'reject' | 'set_time', time?, reason? }
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const d = String(b?.d ?? '');
  const t = String(b?.t ?? '');
  const order = String(b?.order ?? '');

  if (!/^\d+$/.test(d) || !/^\d+$/.test(order) || !verifyToken(d, t)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const time = typeof b?.time === 'string' && /^\d{2}:\d{2}$/.test(b.time) ? b.time : undefined;

  switch (b?.action) {
    case 'picked_up':
      return laravel('POST', `/drivers/${d}/orders/${order}/picked-up`, time ? { time } : {});

    case 'set_time':
      if (!time) return NextResponse.json({ error: 'time_required' }, { status: 422 });
      return laravel('POST', `/drivers/${d}/orders/${order}/pickup-time`, { time });

    case 'reject': {
      const reason = String(b?.reason ?? '').slice(0, 255);
      if (!reason) return NextResponse.json({ error: 'reason_required' }, { status: 422 });
      return laravel('POST', `/drivers/${d}/orders/${order}/reject`, { reason });
    }

    default:
      return NextResponse.json({ error: 'unknown_action' }, { status: 422 });
  }
}
