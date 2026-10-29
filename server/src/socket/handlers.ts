import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ErrorCode,
  ServerToClientEvents,
} from '../../../shared/types/index.ts';
import { buildClientState } from '../game/view.ts';
import type { Result, RoomManager } from '../rooms/RoomManager.ts';
import type { Room } from '../rooms/types.ts';
import { TOKEN_PATTERN } from '../sessions/tokens.ts';
import { TokenBucket } from '../utils/rateLimit.ts';
import { isRecord, parseActionId, parseCardId, parseRoomCode, parseSuit } from '../utils/validate.ts';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AnyAck = (response: unknown) => void;

const channel = (code: string) => `room:${code}`;

export function broadcastRoom(io: IO, room: Room): void {
  const now = Date.now();
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit('state', buildClientState(room, p.id, now));
  }
}

export function registerSocketHandlers(io: IO, rooms: RoomManager): void {
  rooms.on((event) => {
    if (event.type === 'changed') {
      const room = rooms.getRoom(event.code);
      if (room) broadcastRoom(io, room);
      return;
    }
    if (event.socketId) {
      const s = io.sockets.sockets.get(event.socketId);
      if (s) {
        void s.leave(channel(event.code));
        if (event.reason !== 'left') s.emit('session:ended', { reason: 'removed' });
      }
    }
  });

  io.on('connection', (socket: ClientSocket) => {
    const bucket = new TokenBucket(20, 8);

    /** Wraps a handler: rate limiting, payload shape check, ack safety, error isolation. */
    const handle = (event: keyof ClientToServerEvents, fn: (payload: Record<string, unknown>) => Result<object>) => {
      socket.on(event, ((payload: unknown, ack: unknown) => {
        const reply: AnyAck = typeof ack === 'function' ? (ack as AnyAck) : () => {};
        if (!bucket.take()) return reply({ ok: false, error: 'RATE_LIMITED' satisfies ErrorCode });
        if (payload !== undefined && !isRecord(payload)) return reply({ ok: false, error: 'INVALID_INPUT' satisfies ErrorCode });
        try {
          reply(fn(payload ?? {}));
        } catch (err) {
          console.error(`[socket] ${event} failed`, err);
          reply({ ok: false, error: 'INVALID_INPUT' satisfies ErrorCode });
        }
      }) as never);
    };

    /** Optional `roomCode` in a payload must match the socket's room. */
    const roomMatches = (p: Record<string, unknown>): boolean => {
      if (p.roomCode === undefined) return true;
      const b = rooms.getBinding(socket.id);
      return !!b && parseRoomCode(p.roomCode) === b.room.code;
    };

    const sessionReply = (r: Result<{ room: Room; player: { id: string; token: string } }>) => {
      if (!r.ok) return r;
      void socket.join(channel(r.room.code));
      return {
        ok: true as const,
        roomCode: r.room.code,
        playerId: r.player.id,
        token: r.player.token,
        state: buildClientState(r.room, r.player.id),
      };
    };

    handle('room:create', (p) => sessionReply(rooms.createRoom(p.name, p.settings, socket.id)));

    handle('room:join', (p) => {
      const code = parseRoomCode(p.roomCode);
      if (!code) return { ok: false, error: 'ROOM_NOT_FOUND' };
      return sessionReply(rooms.joinRoom(code, p.name, socket.id));
    });

    handle('room:resume', (p) => {
      if (typeof p.token !== 'string' || !TOKEN_PATTERN.test(p.token)) return { ok: false, error: 'INVALID_SESSION' };
      const r = rooms.resume(p.token, socket.id);
      if (r.ok && r.replacedSocketId) {
        const old = io.sockets.sockets.get(r.replacedSocketId);
        if (old) {
          void old.leave(channel(r.room.code));
          old.emit('session:ended', { reason: 'replaced' });
        }
      }
      return sessionReply(r);
    });

    handle('room:leave', () => {
      const b = rooms.getBinding(socket.id);
      const r = rooms.leave(socket.id);
      if (b) void socket.leave(channel(b.room.code));
      return r;
    });

    handle('room:update-settings', (p) => {
      if (!roomMatches(p)) return { ok: false, error: 'NOT_IN_ROOM' };
      return rooms.updateSettings(socket.id, p.settings);
    });

    handle('room:set-ready', (p) => {
      if (!roomMatches(p)) return { ok: false, error: 'NOT_IN_ROOM' };
      return rooms.setReady(socket.id, p.ready);
    });

    handle('room:return-lobby', (p) => (roomMatches(p) ? rooms.returnToLobby(socket.id) : { ok: false, error: 'NOT_IN_ROOM' }));
    handle('game:start', (p) => (roomMatches(p) ? rooms.startGame(socket.id) : { ok: false, error: 'NOT_IN_ROOM' }));
    handle('game:restart', (p) => (roomMatches(p) ? rooms.restartGame(socket.id) : { ok: false, error: 'NOT_IN_ROOM' }));

    handle('game:play-card', (p) => {
      if (!roomMatches(p)) return { ok: false, error: 'NOT_IN_ROOM' };
      const cardId = parseCardId(p.cardId);
      const suit = parseSuit(p.chosenSuit);
      const actionId = parseActionId(p.actionId);
      if (!cardId) return { ok: false, error: 'CARD_NOT_IN_HAND' };
      if (suit === null || actionId === null) return { ok: false, error: 'INVALID_INPUT' };
      return rooms.playCard(socket.id, cardId, suit, actionId);
    });

    handle('game:draw', (p) => {
      const actionId = parseActionId(p.actionId);
      if (!roomMatches(p)) return { ok: false, error: 'NOT_IN_ROOM' };
      if (actionId === null) return { ok: false, error: 'INVALID_INPUT' };
      return rooms.draw(socket.id, actionId);
    });

    handle('game:pass', (p) => {
      const actionId = parseActionId(p.actionId);
      if (!roomMatches(p)) return { ok: false, error: 'NOT_IN_ROOM' };
      if (actionId === null) return { ok: false, error: 'INVALID_INPUT' };
      return rooms.pass(socket.id, actionId);
    });

    socket.on('disconnect', () => rooms.handleDisconnect(socket.id));
  });
}
