import { DEFAULT_SETTINGS } from '../shared/constants/index.ts';
import { createDeck } from '../shared/rules/index.ts';
import type { Card, CardRank, CardSuit, RoomSettings } from '../shared/types/index.ts';
import { createGame, type EngineState } from '../server/src/game/engine.ts';

/** `card('10H')`, `card('KS@1')` (second deck). */
export function card(code: string): Card {
  const [face, deck] = code.split('@') as [string, string | undefined];
  const suit = face.slice(-1) as CardSuit;
  const rank = face.slice(0, -1) as CardRank;
  const deckIndex = deck ? Number(deck) : 0;
  return { id: `${deckIndex}-${rank}${suit}`, rank, suit, deckIndex };
}

export const identityShuffle = (cards: Card[]): Card[] => cards.slice();

export interface SetupOptions {
  hands: string[][];
  top: string;
  /** Cards drawn next, in draw order. Other unused cards go below them. */
  draw?: string[];
  /** Put unused cards under the top discard instead of in the draw pile (draw pile empty except `draw`). */
  restToDiscard?: boolean;
  settings?: Partial<RoomSettings>;
  current?: number;
}

/**
 * Builds an exact engine position while keeping every card of the deck(s) somewhere,
 * so card-conservation checks stay meaningful.
 */
export function setupGame(opts: SetupOptions): EngineState {
  const settings: RoomSettings = { ...DEFAULT_SETTINGS, handSize: 3, maxPlayers: 6, ...opts.settings };
  const ids = opts.hands.map((_, i) => `p${i + 1}`);
  const state = createGame(ids, settings, { shuffle: identityShuffle, now: () => 1000 });

  const pool = new Map(createDeck(settings.deckCount).map((c) => [c.id, c]));
  const take = (code: string): Card => {
    const c = card(code);
    if (!pool.delete(c.id)) throw new Error(`card used twice or missing: ${code}`);
    return c;
  };
  state.players.forEach((p, i) => {
    p.hand = opts.hands[i]!.map(take);
  });
  const top = take(opts.top);
  const draw = (opts.draw ?? []).map(take);
  const rest = [...pool.values()];
  state.discardPile = opts.restToDiscard ? [...rest, top] : [top];
  state.drawPile = opts.restToDiscard ? [...draw].reverse() : [...rest, ...[...draw].reverse()];
  state.currentIndex = opts.current ?? 0;
  state.pendingPenalty = null;
  state.activeSuit = null;
  state.hasDrawnThisTurn = false;
  return state;
}

export const handOf = (s: EngineState, id: string): string[] =>
  s.players.find((p) => p.id === id)!.hand.map((c) => `${c.rank}${c.suit}`);

export const turnOf = (s: EngineState): string => s.players[s.currentIndex]!.id;

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
