export type CardSuit = 'S' | 'H' | 'D' | 'C';
export type CardRank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  rank: CardRank;
  suit: CardSuit;
  deckIndex: number;
}

/** Mode A: any card may follow a Queen. Mode B: the Queen's player picks the suit to follow. */
export type QueenRule = 'free-next' | 'choose-suit';
export type MatchRule = 'rank-or-suit' | 'suit-only';

export interface RoomSettings {
  maxPlayers: number;
  deckCount: 1 | 2;
  handSize: number;
  queenRule: QueenRule;
  matchRule: MatchRule;
  /** When true a 6 may answer a 7 chain and vice versa. Off by default. */
  mixPenaltyChains: boolean;
}

export type PenaltyKind = '6' | '7';

export interface PendingPenalty {
  kind: PenaltyKind;
  amount: number;
  chainLength: number;
}

export interface PlayContext {
  topCard: Card | null;
  activeSuit: CardSuit | null;
  pendingPenalty: PendingPenalty | null;
}

export type PenaltyReason = 'six' | 'seven' | 'king-spades';
export type WinReason = 'empty-hand' | 'last-player' | 'stalemate';

export type GameEvent =
  | { seq: number; type: 'deal'; handSize: number; startCard: Card }
  | { seq: number; type: 'play'; playerId: string; card: Card; chosenSuit?: CardSuit }
  | { seq: number; type: 'draw'; playerId: string; count: number }
  | { seq: number; type: 'penalty'; playerId: string; count: number; reason: PenaltyReason }
  | { seq: number; type: 'skip'; playerId: string }
  | { seq: number; type: 'pass'; playerId: string; auto: boolean }
  | { seq: number; type: 'reshuffle'; count: number }
  | { seq: number; type: 'player-left'; playerId: string; returnedCards: number }
  | { seq: number; type: 'win'; playerId: string; reason: WinReason };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type GameEventInput = DistributiveOmit<GameEvent, 'seq'>;

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  /** null when the player is not part of the current match. */
  cardCount: number | null;
  wins: number;
}

export interface PlayerResult {
  playerId: string;
  name: string;
  cardsLeft: number;
  isWinner: boolean;
}

export interface PublicGameState {
  matchId: number;
  hand: Card[];
  playableCardIds: string[];
  seatOrder: string[];
  turnPlayerId: string | null;
  isYourTurn: boolean;
  topCard: Card | null;
  discardCount: number;
  drawCount: number;
  pendingPenalty: PendingPenalty | null;
  activeSuit: CardSuit | null;
  hasDrawnThisTurn: boolean;
  canPass: boolean;
  canDraw: boolean;
  turnNumber: number;
  turnStartedAt: number;
  totalCards: number;
  events: GameEvent[];
  lastEventSeq: number;
  winnerId: string | null;
  winReason: WinReason | null;
  results: PlayerResult[] | null;
}

export interface PublicRoom {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: PublicPlayer[];
}

export interface ClientState {
  you: { playerId: string; name: string };
  room: PublicRoom;
  game: PublicGameState | null;
  serverTime: number;
}

export * from './protocol.ts';
