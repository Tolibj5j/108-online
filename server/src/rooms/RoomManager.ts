import { AVATAR_COUNT, hasEnoughCards, MIN_PLAYERS } from '../../../shared/constants/index.ts';
import { defaultSettings, mergeSettings } from '../../../shared/rules/index.ts';
import type { CardSuit, ErrorCode } from '../../../shared/types/index.ts';
import {
  autoResolveTurn,
  createGame,
  currentPlayer,
  drawCard,
  passTurn,
  playCard,
  removePlayer as removeFromEngine,
  type ActionResult,
  type EngineState,
  type ShuffleFn,
} from '../game/engine.ts';
import { generatePlayerId, generateToken, tokensEqual } from '../sessions/tokens.ts';
import { sanitizeName } from '../utils/validate.ts';
import { generateRoomCode } from './codes.ts';
import type { Room, RoomPlayer } from './types.ts';

export interface RoomManagerOptions {
  /** How long a disconnected player keeps their seat. */
  reconnectGraceMs: number;
  /** How long the game waits for a disconnected current player before auto-resolving their turn. */
  disconnectedTurnMs: number;
  /** Rooms without activity for this long are deleted. */
  roomIdleTtlMs: number;
  shuffle?: ShuffleFn;
  now?: () => number;
}

export type RemovalReason = 'left' | 'timeout' | 'expired';

export type RoomEvent =
  | { type: 'changed'; code: string }
  | { type: 'player-removed'; code: string; playerId: string; socketId: string | null; reason: RemovalReason };

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

interface Binding {
  code: string;
  playerId: string;
}

type Timer = ReturnType<typeof setTimeout>;

const MAX_REMEMBERED_ACTIONS = 500;

const fail = (error: ErrorCode): { ok: false; error: ErrorCode } => ({ ok: false, error });

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly sessions = new Map<string, Binding>();
  private readonly sockets = new Map<string, Binding>();
  private readonly disconnectTimers = new Map<string, Timer>();
  private readonly turnTimers = new Map<string, Timer>();
  private readonly listeners = new Set<(e: RoomEvent) => void>();
  private sweeper: ReturnType<typeof setInterval> | null = null;
  private readonly now: () => number;
  private readonly options: RoomManagerOptions;

  constructor(options: RoomManagerOptions) {
    this.options = options;
    this.now = options.now ?? Date.now;
  }

  // ---------- infrastructure ----------

  on(listener: (e: RoomEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: RoomEvent): void {
    for (const l of this.listeners) l(e);
  }

  private changed(room: Room): void {
    room.lastActivityAt = this.now();
    this.emit({ type: 'changed', code: room.code });
  }

  startSweeper(intervalMs = 60_000): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => this.sweepIdleRooms(), intervalMs);
    this.sweeper.unref?.();
  }

  sweepIdleRooms(): void {
    const cutoff = this.now() - this.options.roomIdleTtlMs;
    for (const room of [...this.rooms.values()]) {
      if (room.lastActivityAt < cutoff) {
        for (const p of [...room.players]) this.removePlayer(room, p, 'expired');
      }
    }
  }

  dispose(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
    for (const t of this.turnTimers.values()) clearTimeout(t);
    this.disconnectTimers.clear();
    this.turnTimers.clear();
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getBinding(socketId: string): { room: Room; player: RoomPlayer } | null {
    const b = this.sockets.get(socketId);
    if (!b) return null;
    const room = this.rooms.get(b.code);
    const player = room?.players.find((p) => p.id === b.playerId);
    return room && player ? { room, player } : null;
  }

  // ---------- membership ----------

  createRoom(nameInput: unknown, settingsInput: unknown, socketId: string): Result<{ room: Room; player: RoomPlayer }> {
    const name = sanitizeName(nameInput);
    if (!name) return fail('INVALID_INPUT');
    const settings = mergeSettings(defaultSettings(), settingsInput);
    if (!settings) return fail('INVALID_SETTINGS');

    this.releaseSocket(socketId);
    const code = generateRoomCode((c) => this.rooms.has(c));
    const player = this.newPlayer(name, 0, socketId);
    const now = this.now();
    const room: Room = {
      code,
      hostId: player.id,
      settings,
      players: [player],
      status: 'lobby',
      game: null,
      gameSeatOrder: [],
      gameNames: {},
      matchCount: 0,
      createdAt: now,
      lastActivityAt: now,
      processedActions: new Set(),
    };
    this.rooms.set(code, room);
    this.bind(room, player, socketId);
    this.changed(room);
    return { ok: true, room, player };
  }

  joinRoom(code: string, nameInput: unknown, socketId: string): Result<{ room: Room; player: RoomPlayer }> {
    const name = sanitizeName(nameInput);
    if (!name) return fail('INVALID_INPUT');
    const room = this.rooms.get(code);
    if (!room) return fail('ROOM_NOT_FOUND');
    if (room.status === 'playing') return fail('MATCH_IN_PROGRESS');
    if (room.players.length >= room.settings.maxPlayers) return fail('ROOM_FULL');
    const lower = name.toLocaleLowerCase();
    if (room.players.some((p) => p.name.toLocaleLowerCase() === lower)) return fail('NAME_TAKEN');

    this.releaseSocket(socketId);
    const used = new Set(room.players.map((p) => p.avatar));
    let avatar = 0;
    while (used.has(avatar) && avatar < AVATAR_COUNT - 1) avatar++;
    const player = this.newPlayer(name, avatar, socketId);
    room.players.push(player);
    this.bind(room, player, socketId);
    this.changed(room);
    return { ok: true, room, player };
  }

  resume(token: string, socketId: string): Result<{ room: Room; player: RoomPlayer; replacedSocketId: string | null }> {
    const b = this.sessions.get(token);
    const room = b && this.rooms.get(b.code);
    const player = room?.players.find((p) => p.id === b!.playerId);
    if (!room || !player || !tokensEqual(player.token, token)) return fail('INVALID_SESSION');

    const existing = this.sockets.get(socketId);
    if (existing && existing.playerId !== player.id) this.releaseSocket(socketId);

    const replacedSocketId = player.socketId && player.socketId !== socketId ? player.socketId : null;
    if (replacedSocketId) this.sockets.delete(replacedSocketId);

    this.clearDisconnectTimer(player.id);
    player.connected = true;
    player.disconnectedAt = null;
    player.socketId = socketId;
    this.sockets.set(socketId, { code: room.code, playerId: player.id });
    this.scheduleTurnTimer(room);
    this.changed(room);
    return { ok: true, room, player, replacedSocketId };
  }

  leave(socketId: string): Result {
    const ctx = this.getBinding(socketId);
    if (!ctx) return fail('NOT_IN_ROOM');
    this.removePlayer(ctx.room, ctx.player, 'left');
    return { ok: true };
  }

  handleDisconnect(socketId: string): void {
    const ctx = this.getBinding(socketId);
    this.sockets.delete(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    if (player.socketId !== socketId) return;
    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = this.now();
    this.clearDisconnectTimer(player.id);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(player.id);
      const current = this.rooms.get(room.code);
      if (current && current.players.includes(player) && !player.connected) this.removePlayer(current, player, 'timeout');
    }, this.options.reconnectGraceMs);
    timer.unref?.();
    this.disconnectTimers.set(player.id, timer);
    this.scheduleTurnTimer(room);
    this.changed(room);
  }

  // ---------- lobby ----------

  updateSettings(socketId: string, input: unknown): Result {
    const ctx = this.requireHost(socketId);
    if (!ctx.ok) return ctx;
    const { room } = ctx;
    if (room.status !== 'lobby') return fail('WRONG_STATUS');
    const merged = mergeSettings(room.settings, input);
    if (!merged || merged.maxPlayers < room.players.length) return fail('INVALID_SETTINGS');
    room.settings = merged;
    for (const p of room.players) if (p.id !== room.hostId) p.ready = false;
    this.changed(room);
    return { ok: true };
  }

  setReady(socketId: string, ready: unknown): Result {
    if (typeof ready !== 'boolean') return fail('INVALID_INPUT');
    const ctx = this.getBinding(socketId);
    if (!ctx) return fail('NOT_IN_ROOM');
    if (ctx.room.status !== 'lobby') return fail('WRONG_STATUS');
    ctx.player.ready = ready;
    this.changed(ctx.room);
    return { ok: true };
  }

  startGame(socketId: string): Result {
    const ctx = this.requireHost(socketId);
    if (!ctx.ok) return ctx;
    const { room } = ctx;
    if (room.status !== 'lobby') return fail('WRONG_STATUS');
    if (room.players.length < MIN_PLAYERS) return fail('NOT_ENOUGH_PLAYERS');
    if (room.players.some((p) => p.id !== room.hostId && (!p.ready || !p.connected))) return fail('PLAYERS_NOT_READY');
    return this.startMatch(room);
  }

  restartGame(socketId: string): Result {
    const ctx = this.requireHost(socketId);
    if (!ctx.ok) return ctx;
    if (ctx.room.status !== 'finished') return fail('WRONG_STATUS');
    if (ctx.room.players.length < MIN_PLAYERS) return fail('NOT_ENOUGH_PLAYERS');
    return this.startMatch(ctx.room);
  }

  returnToLobby(socketId: string): Result {
    const ctx = this.requireHost(socketId);
    if (!ctx.ok) return ctx;
    const { room } = ctx;
    if (room.status !== 'finished') return fail('WRONG_STATUS');
    room.status = 'lobby';
    room.game = null;
    room.gameSeatOrder = [];
    room.gameNames = {};
    for (const p of room.players) p.ready = false;
    this.changed(room);
    return { ok: true };
  }

  // ---------- game actions ----------

  playCard(socketId: string, cardId: string, chosenSuit: CardSuit | undefined, actionId?: string): Result<{ duplicate?: boolean }> {
    return this.gameAction(socketId, actionId, (game, playerId) => playCard(game, playerId, cardId, chosenSuit));
  }

  draw(socketId: string, actionId?: string): Result<{ duplicate?: boolean }> {
    return this.gameAction(socketId, actionId, drawCard);
  }

  pass(socketId: string, actionId?: string): Result<{ duplicate?: boolean }> {
    return this.gameAction(socketId, actionId, passTurn);
  }

  // ---------- internals ----------

  private gameAction(
    socketId: string,
    actionId: string | undefined,
    action: (game: EngineState, playerId: string) => ActionResult,
  ): Result<{ duplicate?: boolean }> {
    const ctx = this.getBinding(socketId);
    if (!ctx) return fail('NOT_IN_ROOM');
    const { room, player } = ctx;
    const key = actionId ? `${player.id}:${actionId}` : null;
    if (key && room.processedActions.has(key)) return { ok: true, duplicate: true };
    if (!room.game || room.status !== 'playing') return fail('GAME_NOT_ACTIVE');

    const result = action(room.game, player.id);
    if (!result.ok) return result;
    if (key) this.rememberAction(room, key);
    this.afterGameChange(room);
    return { ok: true };
  }

  private rememberAction(room: Room, key: string): void {
    room.processedActions.add(key);
    if (room.processedActions.size > MAX_REMEMBERED_ACTIONS) {
      const oldest = room.processedActions.values().next().value;
      if (oldest !== undefined) room.processedActions.delete(oldest);
    }
  }

  private startMatch(room: Room): Result {
    const { settings } = room;
    if (!hasEnoughCards(room.players.length, settings.handSize, settings.deckCount)) return fail('NOT_ENOUGH_CARDS');
    const ids = room.players.map((p) => p.id);
    room.game = createGame(ids, settings, {
      shuffle: this.options.shuffle,
      startIndex: room.matchCount % ids.length,
      now: this.now,
    });
    room.matchCount += 1;
    room.gameSeatOrder = ids;
    room.gameNames = Object.fromEntries(room.players.map((p) => [p.id, p.name]));
    room.status = 'playing';
    room.processedActions.clear();
    this.afterGameChange(room);
    return { ok: true };
  }

  private afterGameChange(room: Room): void {
    const game = room.game;
    if (game && game.status === 'finished' && room.status === 'playing') {
      room.status = 'finished';
      const winner = room.players.find((p) => p.id === game.winnerId);
      if (winner) winner.wins += 1;
    }
    this.scheduleTurnTimer(room);
    this.changed(room);
  }

  /** Arms the auto-resolve timer when the current player is offline. */
  private scheduleTurnTimer(room: Room): void {
    const existing = this.turnTimers.get(room.code);
    if (existing) clearTimeout(existing);
    this.turnTimers.delete(room.code);
    const game = room.game;
    if (!game || room.status !== 'playing' || game.status !== 'playing') return;
    const current = room.players.find((p) => p.id === currentPlayer(game).id);
    if (!current || current.connected) return;

    const turn = game.turnNumber;
    const timer = setTimeout(() => {
      this.turnTimers.delete(room.code);
      if (this.rooms.get(room.code) !== room || room.game !== game) return;
      if (game.status !== 'playing' || game.turnNumber !== turn || current.connected) return;
      autoResolveTurn(game);
      this.afterGameChange(room);
    }, this.options.disconnectedTurnMs);
    timer.unref?.();
    this.turnTimers.set(room.code, timer);
  }

  private requireHost(socketId: string): Result<{ room: Room; player: RoomPlayer }> {
    const ctx = this.getBinding(socketId);
    if (!ctx) return fail('NOT_IN_ROOM');
    if (ctx.room.hostId !== ctx.player.id) return fail('NOT_HOST');
    return { ok: true, ...ctx };
  }

  private newPlayer(name: string, avatar: number, socketId: string): RoomPlayer {
    return {
      id: generatePlayerId(),
      name,
      token: generateToken(),
      avatar,
      ready: false,
      connected: true,
      socketId,
      disconnectedAt: null,
      wins: 0,
    };
  }

  private bind(room: Room, player: RoomPlayer, socketId: string): void {
    this.sessions.set(player.token, { code: room.code, playerId: player.id });
    this.sockets.set(socketId, { code: room.code, playerId: player.id });
  }

  /** If this socket already represents a player, that player leaves their room first. */
  private releaseSocket(socketId: string): void {
    const ctx = this.getBinding(socketId);
    if (ctx) this.removePlayer(ctx.room, ctx.player, 'left');
    this.sockets.delete(socketId);
  }

  private clearDisconnectTimer(playerId: string): void {
    const t = this.disconnectTimers.get(playerId);
    if (t) clearTimeout(t);
    this.disconnectTimers.delete(playerId);
  }

  private removePlayer(room: Room, player: RoomPlayer, reason: RemovalReason): void {
    const idx = room.players.indexOf(player);
    if (idx < 0) return;
    this.clearDisconnectTimer(player.id);
    this.sessions.delete(player.token);
    const socketId = player.socketId;
    if (socketId) this.sockets.delete(socketId);
    room.players.splice(idx, 1);

    this.emit({ type: 'player-removed', code: room.code, playerId: player.id, socketId, reason });

    if (room.players.length === 0) {
      const t = this.turnTimers.get(room.code);
      if (t) clearTimeout(t);
      this.turnTimers.delete(room.code);
      this.rooms.delete(room.code);
      return;
    }

    if (room.hostId === player.id) {
      const next = room.players.find((p) => p.connected) ?? room.players[0]!;
      room.hostId = next.id;
    }

    if (room.game && room.status === 'playing') {
      removeFromEngine(room.game, player.id);
      this.afterGameChange(room);
    } else {
      this.changed(room);
    }
  }
}
