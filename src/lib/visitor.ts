import 'server-only';
import { createHash } from 'node:crypto';

/* The anonymous code a visitor is counted by in the analytics: the day, their address and browser and a secret
   (ANALYTICS_SALT), hashed. A visitor counts once a day and can't be followed from one day to the next.
   Null while the secret isn't set, so nothing is recorded. */
export function visitorHash(ip: string, ua: string): string | null {
  const salt = process.env.ANALYTICS_SALT ?? '';
  if (salt.length < 32) return null;
  return createHash('sha256').update(`${salt}|${new Date().toISOString().slice(0, 10)}|${ip}|${ua}`).digest('hex');
}
