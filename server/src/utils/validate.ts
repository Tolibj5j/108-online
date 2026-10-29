import { MAX_NAME_LENGTH, ROOM_CODE_PATTERN, SUITS } from '../../../shared/constants/index.ts';
import type { CardSuit } from '../../../shared/types/index.ts';

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Trims, collapses whitespace and removes control characters. Returns null when empty or too long. */
export function sanitizeName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < 1 || [...name].length > MAX_NAME_LENGTH) return null;
  return name;
}

export function parseRoomCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  return ROOM_CODE_PATTERN.test(code) ? code : null;
}

const ACTION_ID = /^[A-Za-z0-9_-]{1,64}$/;
const CARD_ID = /^[0-9]-(?:10|[6-9JQKA])[SHDC]$/;

/** undefined = absent, null = present but invalid. */
export function parseActionId(input: unknown): string | undefined | null {
  if (input === undefined) return undefined;
  return typeof input === 'string' && ACTION_ID.test(input) ? input : null;
}

export function parseCardId(input: unknown): string | null {
  return typeof input === 'string' && input.length <= 8 && CARD_ID.test(input) ? input : null;
}

export function parseSuit(input: unknown): CardSuit | undefined | null {
  if (input === undefined || input === null) return undefined;
  return typeof input === 'string' && (SUITS as readonly string[]).includes(input) ? (input as CardSuit) : null;
}
