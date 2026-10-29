import type { RoomSettings, RoomStatus } from '../../../shared/types/index.ts';
import type { EngineState } from '../game/engine.ts';

export interface RoomPlayer {
  id: string;
  name: string;
  /** Secret. Never include in client payloads. */
  token: string;
  avatar: number;
  ready: boolean;
  connected: boolean;
  socketId: string | null;
  disconnectedAt: number | null;
  wins: number;
}

export interface Room {
  code: string;
  hostId: string;
  settings: RoomSettings;
  players: RoomPlayer[];
  status: RoomStatus;
  game: EngineState | null;
  /** Seat order and names captured at match start (players may leave later). */
  gameSeatOrder: string[];
  gameNames: Record<string, string>;
  matchCount: number;
  createdAt: number;
  lastActivityAt: number;
  /** `${playerId}:${actionId}` of recently applied actions. */
  processedActions: Set<string>;
}
