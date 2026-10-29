import { RANKS, SUITS } from '../constants/index.ts';
import type { Card } from '../types/index.ts';

export function createDeck(deckCount: number): Card[] {
  const cards: Card[] = [];
  for (let deckIndex = 0; deckIndex < deckCount; deckIndex++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${deckIndex}-${rank}${suit}`, rank, suit, deckIndex });
      }
    }
  }
  return cards;
}

export type RandomInt = (maxExclusive: number) => number;

/** Uniform integer in [0, maxExclusive) from the Web Crypto API, using rejection sampling to avoid modulo bias. */
export const secureRandomInt: RandomInt = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new RangeError(`maxExclusive out of range: ${maxExclusive}`);
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);
  return value % maxExclusive;
};

/** Fisher–Yates shuffle. Returns a new array. */
export function shuffle<T>(items: readonly T[], randomInt: RandomInt = secureRandomInt): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
