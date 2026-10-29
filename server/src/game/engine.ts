import { hasEnoughCards, KING_OF_SPADES_PENALTY, MAX_PLAYERS, MIN_PLAYERS, SUITS, totalCardsFor } from '../../../shared/constants/index.ts';
import { checkPlay, createDeck, isKingOfSpades, penaltyKindOf, penaltyValue, shuffle as secureShuffle } from '../../../shared/rules/index.ts';
import type {
  Card,
  CardSuit,
  ErrorCode,
  GameEvent,
  GameEventInput,
  PendingPenalty,
  PlayContext,
  RoomSettings,
  WinReason,
} from '../../../shared/types/index.ts';

export type ShuffleFn = (cards: Card[]) => Card[];

export interface EnginePlayer {
  id: string;
  hand: Card[];
}

export interface EngineResult {
  playerId: string;
  cardsLeft: number;
}

export interface EngineState {
  settings: RoomSettings;
  players: EnginePlayer[];
  /** Top of the draw pile is the last element. */
  drawPile: Card[];
  /** Top of the discard pile is the last element. */
  discardPile: Card[];
  currentIndex: number;
  pendingPenalty: PendingPenalty | null;
  /** Suit chosen with a Queen in "choose-suit" mode. */
  activeSuit: CardSuit | null;
  hasDrawnThisTurn: boolean;
  /** Consecutive turns that ended with no card played and no card drawn. */
  idleTurnStreak: number;
  status: 'playing' | 'finished';
  winnerId: string | null;
  winReason: WinReason | null;
  results: EngineResult[] | null;
  turnNumber: number;
  turnStartedAt: number;
  eventSeq: number;
  events: GameEvent[];
  totalCards: number;
  shuffle: ShuffleFn;
  now: () => number;
}

export type ActionResult = { ok: true } | { ok: false; error: ErrorCode };

export interface CreateGameOptions {
  shuffle?: ShuffleFn;
  startIndex?: number;
  now?: () => number;
}

const MAX_EVENTS = 40;
const OK: ActionResult = { ok: true };
const fail = (error: ErrorCode): ActionResult => ({ ok: false, error });

export function createGame(playerIds: string[], settings: RoomSettings, options: CreateGameOptions = {}): EngineState {
  if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
    throw new Error(`Player count must be ${MIN_PLAYERS}-${MAX_PLAYERS}`);
  }
  if (new Set(playerIds).size !== playerIds.length) throw new Error('Duplicate player ids');
  if (!hasEnoughCards(playerIds.length, settings.handSize, settings.deckCount)) {
    throw new Error('Not enough cards for this configuration');
  }
  const shuffleFn = options.shuffle ?? ((cards: Card[]) => secureShuffle(cards));
  const now = options.now ?? Date.now;
  const drawPile = shuffleFn(createDeck(settings.deckCount));
  const players: EnginePlayer[] = playerIds.map((id) => ({ id, hand: [] }));

  for (let round = 0; round < settings.handSize; round++) {
    for (const p of players) p.hand.push(drawPile.pop()!);
  }
  const startCard = drawPile.pop()!;
  const startIndex = options.startIndex ?? 0;

  const state: EngineState = {
    settings: { ...settings },
    players,
    drawPile,
    discardPile: [startCard],
    currentIndex: ((startIndex % players.length) + players.length) % players.length,
    pendingPenalty: null,
    activeSuit: null,
    hasDrawnThisTurn: false,
    idleTurnStreak: 0,
    status: 'playing',
    winnerId: null,
    winReason: null,
    results: null,
    turnNumber: 1,
    turnStartedAt: now(),
    eventSeq: 0,
    events: [],
    totalCards: totalCardsFor(settings.deckCount),
    shuffle: shuffleFn,
    now,
  };
  // The starting card's effect is never applied (no penalty, skip or Queen suit choice).
  emit(state, { type: 'deal', handSize: settings.handSize, startCard });
  return state;
}

// ---------- queries ----------

export function currentPlayer(state: EngineState): EnginePlayer {
  return state.players[state.currentIndex]!;
}

export function topCard(state: EngineState): Card | null {
  return state.discardPile[state.discardPile.length - 1] ?? null;
}

export function playContext(state: EngineState): PlayContext {
  return { topCard: topCard(state), activeSuit: state.activeSuit, pendingPenalty: state.pendingPenalty };
}

export function findPlayer(state: EngineState, playerId: string): EnginePlayer | undefined {
  return state.players.find((p) => p.id === playerId);
}

export function playableCardIds(state: EngineState, playerId: string): string[] {
  if (state.status !== 'playing' || currentPlayer(state).id !== playerId) return [];
  const ctx = playContext(state);
  return currentPlayer(state).hand.filter((c) => checkPlay(c, ctx, state.settings).ok).map((c) => c.id);
}

export function canPass(state: EngineState, playerId: string): boolean {
  if (state.status !== 'playing' || currentPlayer(state).id !== playerId) return false;
  if (state.pendingPenalty) return false;
  return state.hasDrawnThisTurn || availableToDraw(state) === 0;
}

export function canDraw(state: EngineState, playerId: string): boolean {
  if (state.status !== 'playing' || currentPlayer(state).id !== playerId) return false;
  return state.pendingPenalty !== null || !state.hasDrawnThisTurn;
}

export function countAllCards(state: EngineState): number {
  return state.players.reduce((n, p) => n + p.hand.length, 0) + state.drawPile.length + state.discardPile.length;
}

function availableToDraw(state: EngineState): number {
  return state.drawPile.length + Math.max(0, state.discardPile.length - 1);
}

// ---------- actions ----------

function checkTurn(state: EngineState, playerId: string): ActionResult {
  if (state.status !== 'playing') return fail('GAME_NOT_ACTIVE');
  if (!findPlayer(state, playerId)) return fail('NOT_IN_ROOM');
  if (currentPlayer(state).id !== playerId) return fail('NOT_YOUR_TURN');
  return OK;
}

export function playCard(state: EngineState, playerId: string, cardId: string, chosenSuit?: CardSuit): ActionResult {
  const turn = checkTurn(state, playerId);
  if (!turn.ok) return turn;
  const player = currentPlayer(state);
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex < 0) return fail('CARD_NOT_IN_HAND');
  const card = player.hand[cardIndex]!;

  const check = checkPlay(card, playContext(state), state.settings);
  if (!check.ok) return fail(check.reason);

  const isLastCard = player.hand.length === 1;
  const needsSuit = card.rank === 'Q' && state.settings.queenRule === 'choose-suit';
  if (chosenSuit !== undefined && !SUITS.includes(chosenSuit)) return fail('INVALID_INPUT');
  if (needsSuit && !chosenSuit && !isLastCard) return fail('SUIT_REQUIRED');

  // --- validated; mutate ---
  player.hand.splice(cardIndex, 1);
  state.discardPile.push(card);
  state.idleTurnStreak = 0;
  state.activeSuit = needsSuit ? (chosenSuit ?? card.suit) : null;
  emit(state, needsSuit && chosenSuit ? { type: 'play', playerId, card, chosenSuit } : { type: 'play', playerId, card });

  if (player.hand.length === 0) {
    // A winning card ends the match immediately; its effect is not applied.
    finish(state, playerId, 'empty-hand');
    return OK;
  }

  const kind = penaltyKindOf(card);
  if (kind) {
    const value = penaltyValue(kind);
    const prev = state.pendingPenalty;
    state.pendingPenalty = prev
      ? { kind, amount: prev.amount + value, chainLength: prev.chainLength + 1 }
      : { kind, amount: value, chainLength: 1 };
    advance(state, 1);
  } else if (isKingOfSpades(card)) {
    const victim = state.players[nextIndex(state, 1)]!;
    const drawn = drawInto(state, victim, KING_OF_SPADES_PENALTY);
    emit(state, { type: 'penalty', playerId: victim.id, count: drawn, reason: 'king-spades' });
    advance(state, 2);
  } else if (card.rank === 'A') {
    const skipped = state.players[nextIndex(state, 1)]!;
    emit(state, { type: 'skip', playerId: skipped.id });
    advance(state, 2);
  } else {
    advance(state, 1);
  }
  return OK;
}

/**
 * Draw action. With a pending 6/7 penalty the player takes the whole penalty and the turn ends.
 * Otherwise the player draws one card (once per turn); if nothing is playable afterwards the turn passes.
 */
export function drawCard(state: EngineState, playerId: string): ActionResult {
  const turn = checkTurn(state, playerId);
  if (!turn.ok) return turn;
  const player = currentPlayer(state);

  if (state.pendingPenalty) {
    const { kind, amount } = state.pendingPenalty;
    const drawn = drawInto(state, player, amount);
    state.pendingPenalty = null;
    emit(state, { type: 'penalty', playerId, count: drawn, reason: kind === '6' ? 'six' : 'seven' });
    endIdleTurn(state, drawn === 0);
    return OK;
  }

  if (state.hasDrawnThisTurn) return fail('ALREADY_DRAWN');

  const drawn = drawInto(state, player, 1);
  state.hasDrawnThisTurn = true;
  if (drawn === 0) {
    emit(state, { type: 'pass', playerId, auto: true });
    endIdleTurn(state, true);
    return OK;
  }
  emit(state, { type: 'draw', playerId, count: drawn });
  if (playableCardIds(state, playerId).length === 0) {
    emit(state, { type: 'pass', playerId, auto: true });
    endIdleTurn(state, false);
  }
  return OK;
}

export function passTurn(state: EngineState, playerId: string): ActionResult {
  const turn = checkTurn(state, playerId);
  if (!turn.ok) return turn;
  if (state.pendingPenalty) return fail('MUST_RESPOND_TO_PENALTY');
  const pileEmpty = availableToDraw(state) === 0;
  if (!state.hasDrawnThisTurn && !pileEmpty) return fail('MUST_DRAW_FIRST');
  emit(state, { type: 'pass', playerId, auto: false });
  endIdleTurn(state, pileEmpty && !state.hasDrawnThisTurn);
  return OK;
}

/**
 * Used when the current player is disconnected for too long.
 * Takes the pending penalty or draws one card, then passes. Never plays a card for the player.
 */
export function autoResolveTurn(state: EngineState): ActionResult {
  if (state.status !== 'playing') return fail('GAME_NOT_ACTIVE');
  const player = currentPlayer(state);
  const turnBefore = state.turnNumber;
  if (state.pendingPenalty || !state.hasDrawnThisTurn) {
    const r = drawCard(state, player.id);
    if (!r.ok) return r;
  }
  if (state.status === 'playing' && state.turnNumber === turnBefore) {
    emit(state, { type: 'pass', playerId: player.id, auto: true });
    endIdleTurn(state, false);
  }
  return OK;
}

/** Removes a player mid-match. Their cards go back into the draw pile. */
export function removePlayer(state: EngineState, playerId: string): void {
  if (state.status !== 'playing') return;
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return;
  const wasCurrent = idx === state.currentIndex;
  const [removed] = state.players.splice(idx, 1);
  const returned = removed!.hand.length;
  state.drawPile = state.shuffle([...state.drawPile, ...removed!.hand]);
  removed!.hand = [];
  emit(state, { type: 'player-left', playerId, returnedCards: returned });

  if (state.players.length === 1) {
    finish(state, state.players[0]!.id, 'last-player');
    return;
  }
  if (idx < state.currentIndex) state.currentIndex -= 1;
  if (wasCurrent) {
    state.currentIndex %= state.players.length;
    // The penalty was aimed at the player who left; it is dropped rather than passed to an innocent player.
    state.pendingPenalty = null;
    state.hasDrawnThisTurn = false;
    state.turnNumber += 1;
    state.turnStartedAt = state.now();
  }
}

// ---------- internals ----------

function emit(state: EngineState, event: GameEventInput): void {
  state.eventSeq += 1;
  state.events.push({ ...event, seq: state.eventSeq } as GameEvent);
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}

function nextIndex(state: EngineState, steps: number): number {
  return (state.currentIndex + steps) % state.players.length;
}

function advance(state: EngineState, steps: number): void {
  state.currentIndex = nextIndex(state, steps);
  state.hasDrawnThisTurn = false;
  state.turnNumber += 1;
  state.turnStartedAt = state.now();
}

function endIdleTurn(state: EngineState, idle: boolean): void {
  state.idleTurnStreak = idle ? state.idleTurnStreak + 1 : 0;
  if (state.idleTurnStreak >= state.players.length) {
    // Nobody can play or draw: the player with the fewest cards wins.
    const best = state.players.reduce((a, b) => (b.hand.length < a.hand.length ? b : a));
    finish(state, best.id, 'stalemate');
    return;
  }
  advance(state, 1);
}

function reshuffle(state: EngineState): boolean {
  if (state.discardPile.length <= 1) return false;
  const top = state.discardPile.pop()!;
  const rest = state.discardPile;
  state.discardPile = [top];
  state.drawPile = state.shuffle([...state.drawPile, ...rest]);
  emit(state, { type: 'reshuffle', count: rest.length });
  return true;
}

function drawInto(state: EngineState, player: EnginePlayer, count: number): number {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0 && !reshuffle(state)) break;
    player.hand.push(state.drawPile.pop()!);
    drawn++;
  }
  return drawn;
}

function finish(state: EngineState, winnerId: string, reason: WinReason): void {
  state.status = 'finished';
  state.winnerId = winnerId;
  state.winReason = reason;
  state.pendingPenalty = null;
  state.results = state.players
    .map((p) => ({ playerId: p.id, cardsLeft: p.hand.length }))
    .sort((a, b) => (a.playerId === winnerId ? -1 : b.playerId === winnerId ? 1 : a.cardsLeft - b.cardsLeft));
  emit(state, { type: 'win', playerId: winnerId, reason });
}
