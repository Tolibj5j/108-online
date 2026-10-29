import { DEFAULT_SETTINGS, MAX_HAND_SIZE, MAX_PLAYERS, MIN_HAND_SIZE, MIN_PLAYERS } from '../constants/index.ts';
import type { RoomSettings } from '../types/index.ts';

/**
 * Merges untrusted partial settings onto a base. Returns null if any provided field is invalid.
 * Unknown fields are ignored.
 */
export function mergeSettings(base: RoomSettings, input: unknown): RoomSettings | null {
  if (input === undefined || input === null) return { ...base };
  if (typeof input !== 'object' || Array.isArray(input)) return null;
  const p = input as Record<string, unknown>;
  const out: RoomSettings = { ...base };

  if (p.maxPlayers !== undefined) {
    if (!Number.isInteger(p.maxPlayers)) return null;
    const v = p.maxPlayers as number;
    if (v < MIN_PLAYERS || v > MAX_PLAYERS) return null;
    out.maxPlayers = v;
  }
  if (p.deckCount !== undefined) {
    if (p.deckCount !== 1 && p.deckCount !== 2) return null;
    out.deckCount = p.deckCount;
  }
  if (p.handSize !== undefined) {
    if (!Number.isInteger(p.handSize)) return null;
    const v = p.handSize as number;
    if (v < MIN_HAND_SIZE || v > MAX_HAND_SIZE) return null;
    out.handSize = v;
  }
  if (p.queenRule !== undefined) {
    if (p.queenRule !== 'free-next' && p.queenRule !== 'choose-suit') return null;
    out.queenRule = p.queenRule;
  }
  if (p.matchRule !== undefined) {
    if (p.matchRule !== 'rank-or-suit' && p.matchRule !== 'suit-only') return null;
    out.matchRule = p.matchRule;
  }
  if (p.mixPenaltyChains !== undefined) {
    if (typeof p.mixPenaltyChains !== 'boolean') return null;
    out.mixPenaltyChains = p.mixPenaltyChains;
  }
  return out;
}

export function defaultSettings(): RoomSettings {
  return { ...DEFAULT_SETTINGS };
}
