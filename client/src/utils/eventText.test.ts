import { describe, expect, it } from 'vitest';
import { eventText } from './eventText.ts';
import { sortHand } from './cards.ts';
import type { Card } from '../../../shared/types/index.ts';

const names: Record<string, string> = { a: 'Ali', b: 'Vali' };
const nameOf = (id: string) => names[id] ?? '?';
const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ id: `0-${rank}${suit}`, rank, suit, deckIndex: 0 });

describe('eventText (Uzbek log lines)', () => {
  it('describes plays, penalties and skips', () => {
    expect(eventText({ seq: 1, type: 'play', playerId: 'b', card: c('7', 'H') }, nameOf, 'a')).toBe('Vali: 7♥');
    expect(eventText({ seq: 2, type: 'penalty', playerId: 'a', count: 4, reason: 'seven' }, nameOf, 'a')).toBe('Siz 4 ta karta oldingiz (7)');
    expect(eventText({ seq: 3, type: 'skip', playerId: 'b' }, nameOf, 'a')).toBe('Vali: navbat o‘tkazildi');
    expect(eventText({ seq: 4, type: 'win', playerId: 'a', reason: 'empty-hand' }, nameOf, 'a')).toBe('Siz g‘alaba qozondingiz!');
    expect(eventText({ seq: 5, type: 'play', playerId: 'b', card: c('Q', 'S'), chosenSuit: 'D' }, nameOf, 'a')).toContain('G‘isht');
  });
});

describe('sortHand', () => {
  it('sorts by suit then rank, or by rank then suit', () => {
    const hand = [c('A', 'H'), c('6', 'S'), c('10', 'H'), c('6', 'H')];
    expect(sortHand(hand, 'suit').map((x) => x.id)).toEqual(['0-6S', '0-6H', '0-10H', '0-AH']);
    expect(sortHand(hand, 'rank').map((x) => x.id)).toEqual(['0-6S', '0-6H', '0-10H', '0-AH']);
    expect(sortHand(hand, 'none')).toBe(hand);
  });
});
