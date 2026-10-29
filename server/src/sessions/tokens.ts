import { randomBytes, timingSafeEqual } from 'node:crypto';

/** 256-bit random session token, URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Public player id. Random so ids can't be guessed or linked to tokens. */
export function generatePlayerId(): string {
  return `p_${randomBytes(9).toString('base64url')}`;
}

export function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
