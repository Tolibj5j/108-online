import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../shared/constants/index.ts';
import { canPlayCard, checkPlay, mergeSettings } from '../shared/rules/index.ts';
import type { PlayContext } from '../shared/types/index.ts';
import { card } from './helpers.ts';

const S = DEFAULT_SETTINGS;
const ctx = (top: string, extra: Partial<PlayContext> = {}): PlayContext => ({
  topCard: card(top),
  activeSuit: null,
  pendingPenalty: null,
  ...extra,
});

describe('card matching', () => {
  it('rank-or-suit (default): same suit or same rank is playable', () => {
    expect(canPlayCard(card('9H'), ctx('8H'), S)).toBe(true);
    expect(canPlayCard(card('8S'), ctx('8H'), S)).toBe(true);
    expect(canPlayCard(card('9S'), ctx('8H'), S)).toBe(false);
  });

  it('suit-only: rank match is not enough', () => {
    const s = { ...S, matchRule: 'suit-only' as const };
    expect(canPlayCard(card('8S'), ctx('8H'), s)).toBe(false);
    expect(canPlayCard(card('JH'), ctx('8H'), s)).toBe(true);
  });

  it('Jack is a normal card', () => {
    expect(canPlayCard(card('9S'), ctx('JH'), S)).toBe(false);
    expect(canPlayCard(card('JS'), ctx('JH'), S)).toBe(true);
  });

  it('Queen mode A: anything may follow a Queen', () => {
    expect(canPlayCard(card('9S'), ctx('QH'), S)).toBe(true);
    expect(canPlayCard(card('6C'), ctx('QD'), S)).toBe(true);
  });

  it('Queen mode B: the chosen suit must be followed', () => {
    const s = { ...S, queenRule: 'choose-suit' as const };
    expect(canPlayCard(card('9C'), ctx('QH', { activeSuit: 'C' }), s)).toBe(true);
    expect(canPlayCard(card('9H'), ctx('QH', { activeSuit: 'C' }), s)).toBe(false);
    expect(canPlayCard(card('QS'), ctx('QH', { activeSuit: 'C' }), s)).toBe(true); // rank match
  });

  it('pending 6 chain only accepts sixes; pending 7 only sevens', () => {
    const six = ctx('6H', { pendingPenalty: { kind: '6', amount: 1, chainLength: 1 } });
    expect(canPlayCard(card('6S'), six, S)).toBe(true);
    expect(checkPlay(card('7H'), six, S)).toEqual({ ok: false, reason: 'MUST_RESPOND_TO_PENALTY' });
    expect(checkPlay(card('9H'), six, S)).toEqual({ ok: false, reason: 'MUST_RESPOND_TO_PENALTY' });
    const seven = ctx('7H', { pendingPenalty: { kind: '7', amount: 2, chainLength: 1 } });
    expect(canPlayCard(card('7C'), seven, S)).toBe(true);
    expect(canPlayCard(card('6H'), seven, S)).toBe(false);
  });

  it('mixPenaltyChains lets 6 and 7 answer each other', () => {
    const s = { ...S, mixPenaltyChains: true };
    const seven = ctx('7H', { pendingPenalty: { kind: '7', amount: 2, chainLength: 1 } });
    expect(canPlayCard(card('6S'), seven, s)).toBe(true);
  });
});

describe('settings validation', () => {
  it('accepts valid values and rejects invalid ones', () => {
    expect(mergeSettings(S, { deckCount: 2, handSize: 7, queenRule: 'choose-suit' })).toMatchObject({ deckCount: 2, handSize: 7, queenRule: 'choose-suit' });
    expect(mergeSettings(S, { deckCount: 3 })).toBeNull();
    expect(mergeSettings(S, { maxPlayers: 7 })).toBeNull();
    expect(mergeSettings(S, { maxPlayers: 1 })).toBeNull();
    expect(mergeSettings(S, { handSize: 2 })).toBeNull();
    expect(mergeSettings(S, { queenRule: 'x' })).toBeNull();
    expect(mergeSettings(S, 'nope')).toBeNull();
    expect(mergeSettings(S, undefined)).toEqual(S);
  });
});
