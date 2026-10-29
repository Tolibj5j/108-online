import { describe, expect, it } from 'vitest';
import { CARDS_PER_DECK, RANKS, SUITS } from '../shared/constants/index.ts';
import { createDeck, secureRandomInt, shuffle } from '../shared/rules/index.ts';

describe('deck generation', () => {
  it('builds 36 cards for one deck: 4 suits × ranks 6..A', () => {
    const deck = createDeck(1);
    expect(deck).toHaveLength(36);
    expect(CARDS_PER_DECK).toBe(36);
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(deck.filter((c) => c.suit === suit && c.rank === rank)).toHaveLength(1);
      }
    }
    expect(deck.some((c) => (c.rank as string) === '2' || (c.rank as string) === '5')).toBe(false);
  });

  it('builds 72 cards for two decks with unique ids and distinguishable duplicates', () => {
    const deck = createDeck(2);
    expect(deck).toHaveLength(72);
    expect(new Set(deck.map((c) => c.id)).size).toBe(72);
    const kings = deck.filter((c) => c.rank === 'K' && c.suit === 'S');
    expect(kings).toHaveLength(2);
    expect(kings[0]!.id).not.toBe(kings[1]!.id);
    expect(kings.map((k) => k.deckIndex).sort()).toEqual([0, 1]);
  });
});

describe('shuffle', () => {
  it('returns a permutation and does not mutate the input', () => {
    const deck = createDeck(2);
    const before = deck.map((c) => c.id);
    const shuffled = shuffle(deck);
    expect(deck.map((c) => c.id)).toEqual(before);
    expect(shuffled).toHaveLength(72);
    expect([...shuffled.map((c) => c.id)].sort()).toEqual([...before].sort());
  });

  it('changes the order (probability of identical order is negligible)', () => {
    const deck = createDeck(1);
    expect(shuffle(deck).map((c) => c.id)).not.toEqual(deck.map((c) => c.id));
  });

  it('secureRandomInt stays in range and rejects invalid bounds', () => {
    for (let i = 0; i < 2000; i++) {
      const v = secureRandomInt(7);
      expect(v >= 0 && v < 7 && Number.isInteger(v)).toBe(true);
    }
    expect(() => secureRandomInt(0)).toThrow();
    expect(() => secureRandomInt(1.5)).toThrow();
  });

  it('is roughly uniform over permutations of 3 items', () => {
    const counts = new Map<string, number>();
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const key = shuffle(['a', 'b', 'c']).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const n of counts.values()) {
      expect(n).toBeGreaterThan(800); // expected 1000
      expect(n).toBeLessThan(1200);
    }
  });
});
