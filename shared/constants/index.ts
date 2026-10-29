import type { CardRank, CardSuit, RoomSettings } from '../types/index.ts';

export const SUITS: readonly CardSuit[] = ['S', 'H', 'D', 'C'];
export const RANKS: readonly CardRank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const CARDS_PER_DECK = SUITS.length * RANKS.length; // 36

export const SUIT_SYMBOLS: Record<CardSuit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RED_SUITS: readonly CardSuit[] = ['H', 'D'];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const MIN_HAND_SIZE = 3;
export const MAX_HAND_SIZE = 10;
export const MAX_NAME_LENGTH = 20;

export const SIX_PENALTY = 1;
export const SEVEN_PENALTY = 2;
export const KING_OF_SPADES_PENALTY = 5;

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export const AVATAR_COUNT = 12;

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 4,
  deckCount: 1,
  handSize: 5,
  queenRule: 'free-next',
  matchRule: 'rank-or-suit',
  mixPenaltyChains: false,
};

export function totalCardsFor(deckCount: number): number {
  return CARDS_PER_DECK * deckCount;
}

/** Cards needed to deal every hand plus one starting discard card. */
export function hasEnoughCards(players: number, handSize: number, deckCount: number): boolean {
  return players * handSize + 1 <= totalCardsFor(deckCount);
}
