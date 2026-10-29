import { RED_SUITS, SUIT_SYMBOLS } from '../../../shared/constants/index.ts';
import type { Card, CardRank, CardSuit, RoomSettings } from '../../../shared/types/index.ts';

export const RANK_ORDER: Record<CardRank, number> = { '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, J: 5, Q: 6, K: 7, A: 8 };
/** Alternating colours read better in a fanned hand. */
const SUIT_ORDER: Record<CardSuit, number> = { S: 0, H: 1, C: 2, D: 3 };

export type SortMode = 'suit' | 'rank' | 'none';

export function sortHand(cards: Card[], mode: SortMode): Card[] {
  if (mode === 'none') return cards;
  const copy = cards.slice();
  copy.sort((a, b) => {
    const bySuit = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    const byRank = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    return mode === 'suit' ? bySuit || byRank || a.deckIndex - b.deckIndex : byRank || bySuit || a.deckIndex - b.deckIndex;
  });
  return copy;
}

export const isRed = (suit: CardSuit): boolean => RED_SUITS.includes(suit);
export const suitSymbol = (suit: CardSuit): string => SUIT_SYMBOLS[suit];
export const cardLabel = (card: Card): string => `${card.rank}${SUIT_SYMBOLS[card.suit]}`;

/** Small hint shown on special cards so new players learn the rules. */
export function specialBadge(card: Card, settings?: Pick<RoomSettings, 'queenRule'>): string | null {
  if (card.rank === '6') return '+1';
  if (card.rank === '7') return '+2';
  if (card.rank === 'K' && card.suit === 'S') return '+5';
  if (card.rank === 'A') return '⤼';
  if (card.rank === 'Q') return settings?.queenRule === 'choose-suit' ? '◈' : '★';
  return null;
}

/** Stable pseudo-random number in [-1, 1] from a string, for natural-looking pile rotation. */
export function hashUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 2001) / 1000 - 1;
}
