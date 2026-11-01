import { NextRequest, NextResponse } from 'next/server';
import { laravel } from '@/lib/laravel';
import { verifyToken } from '@/lib/token';

export const dynamic = 'force-dynamic';

// GET /api/route?d=3&t=<token>&date=2026-11-02
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const d = p.get('d') ?? '';
  const t = p.get('t') ?? '';
  const date = p.get('date') ?? '';

  if (!/^\d+$/.test(d) || !verifyToken(d, t)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'bad_date' }, { status: 422 });
  }

  return laravel('GET', `/drivers/${d}/route?date=${date}`);
}
