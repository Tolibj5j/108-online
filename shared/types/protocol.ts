import type { CardSuit, ClientState, RoomSettings } from './index.ts';

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'MATCH_IN_PROGRESS'
  | 'NAME_TAKEN'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'PLAYERS_NOT_READY'
  | 'NOT_ENOUGH_CARDS'
  | 'INVALID_SETTINGS'
  | 'WRONG_STATUS'
  | 'GAME_NOT_ACTIVE'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'ILLEGAL_MOVE'
  | 'MUST_RESPOND_TO_PENALTY'
  | 'SUIT_REQUIRED'
  | 'ALREADY_DRAWN'
  | 'MUST_DRAW_FIRST'
  | 'INVALID_SESSION';

export type AckFailure = { ok: false; error: ErrorCode };
export type Ack<T extends object = object> = ({ ok: true } & T) | AckFailure;
export type AckFn<T extends object = object> = (response: Ack<T>) => void;

export interface SessionInfo {
  roomCode: string;
  playerId: string;
  token: string;
  state: ClientState;
}

export interface ActionPayload {
  /** Optional, used to drop duplicated deliveries of the same action. */
  actionId?: string;
  /** Optional, checked against the socket's room when present. */
  roomCode?: string;
}

export interface ClientToServerEvents {
  'room:create': (p: { name: string; settings?: Partial<RoomSettings> }, ack: AckFn<SessionInfo>) => void;
  'room:join': (p: { roomCode: string; name: string }, ack: AckFn<SessionInfo>) => void;
  'room:resume': (p: { token: string }, ack: AckFn<SessionInfo>) => void;
  'room:leave': (p: ActionPayload, ack: AckFn) => void;
  'room:update-settings': (p: ActionPayload & { settings: Partial<RoomSettings> }, ack: AckFn) => void;
  'room:set-ready': (p: ActionPayload & { ready: boolean }, ack: AckFn) => void;
  'room:return-lobby': (p: ActionPayload, ack: AckFn) => void;
  'game:start': (p: ActionPayload, ack: AckFn) => void;
  'game:restart': (p: ActionPayload, ack: AckFn) => void;
  'game:play-card': (p: ActionPayload & { cardId: string; chosenSuit?: CardSuit }, ack: AckFn<{ duplicate?: boolean }>) => void;
  'game:draw': (p: ActionPayload, ack: AckFn<{ duplicate?: boolean }>) => void;
  'game:pass': (p: ActionPayload, ack: AckFn<{ duplicate?: boolean }>) => void;
}

export type SessionEndReason = 'replaced' | 'removed';

export interface ServerToClientEvents {
  state: (state: ClientState) => void;
  'session:ended': (p: { reason: SessionEndReason }) => void;
}
