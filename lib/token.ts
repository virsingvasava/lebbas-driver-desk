import { createHmac, timingSafeEqual } from 'crypto';

/** Token that Laravel puts in the driver's link:  substr(hash_hmac('sha256', "driver:{id}", secret), 0, 32) */
export function makeToken(driverId: string): string {
  const secret = process.env.DESK_SECRET ?? '';
  return createHmac('sha256', secret).update(`driver:${driverId}`).digest('hex').slice(0, 32);
}

export function verifyToken(driverId: string, token: string): boolean {
  if (!process.env.DESK_SECRET || !token) return false;
  const a = Buffer.from(makeToken(driverId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
