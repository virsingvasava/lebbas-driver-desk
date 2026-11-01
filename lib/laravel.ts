import { NextResponse } from 'next/server';

/** Server-side call to the Laravel API (the token never reaches the phone). */
export async function laravel(method: 'GET' | 'POST', path: string, body?: unknown): Promise<NextResponse> {
  const base = (process.env.LARAVEL_API_BASE ?? '').replace(/\/+$/, '');
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (process.env.LARAVEL_API_TOKEN) headers.Authorization = `Bearer ${process.env.LARAVEL_API_TOKEN}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'api_unreachable' }, { status: 502 });
  }
}
