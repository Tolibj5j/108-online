// Exercises server/src/socket/handlers.ts through an in-memory fake of the Socket.IO server API (no network).
import { describe, expect, it } from 'vitest';
import { RoomManager } from '../server/src/rooms/RoomManager.ts';
import { registerSocketHandlers } from '../server/src/socket/handlers.ts';
import { canPlayCard } from '../shared/rules/index.ts';

type Fn = (...a: any[]) => void;

class FakeSocket {
  id: string;
  handlers = new Map<string, Fn>();
  received: { ev: string; data: any }[] = [];
  constructor(id: string) { this.id = id; }
  on(ev: string, fn: Fn) { this.handlers.set(ev, fn); }
  emit(ev: string, data: any) { this.received.push({ ev, data }); }
  join() {}
  leave() {}
  call(ev: string, payload: any): Promise<any> {
    return new Promise((resolve) => this.handlers.get(ev)!(payload, resolve));
  }
  lastState() { return [...this.received].reverse().find((r) => r.ev === 'state')?.data; }
}

class FakeIO {
  sockets = { sockets: new Map<string, FakeSocket>() };
  private onConn: Fn = () => {};
  on(_ev: string, fn: Fn) { this.onConn = fn; }
  to(id: string) { return { emit: (ev: string, data: any) => this.sockets.sockets.get(id)?.emit(ev, data) }; }
  connect(id: string) { const s = new FakeSocket(id); this.sockets.sockets.set(id, s); this.onConn(s); return s; }
  disconnect(s: FakeSocket) { this.sockets.sockets.delete(s.id); s.handlers.get('disconnect')!(); }
}

function setup() {
  const rooms = new RoomManager({ reconnectGraceMs: 10_000, disconnectedTurnMs: 10_000, roomIdleTtlMs: 60_000 });
  const io = new FakeIO();
  registerSocketHandlers(io as any, rooms);
  return { rooms, io };
}

describe('socket handlers (fake transport)', () => {
  it('full flow: create, join, ready, start, play, draw, privacy, resume, errors', async () => {
    const { rooms, io } = setup();
    const a = io.connect('A');
    const b = io.connect('B');

    expect(await a.call('room:create', 'bad')).toEqual({ ok: false, error: 'INVALID_INPUT' });
    const created = await a.call('room:create', { name: 'Ali', settings: { maxPlayers: 2 } });
    expect(created.ok).toBe(true);
    expect(created.token.length).toBe(43);

    expect(await b.call('room:join', { roomCode: 'xx', name: 'Vali' })).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
    const joined = await b.call('room:join', { roomCode: created.roomCode.toLowerCase(), name: 'Vali' });
    expect(joined.ok).toBe(true);
    expect(a.lastState().room.players.length).toBe(2);

    expect(await b.call('game:start', {})).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(await a.call('game:start', {})).toEqual({ ok: false, error: 'PLAYERS_NOT_READY' });
    expect(await b.call('room:set-ready', { ready: 'yes' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await b.call('room:set-ready', { ready: true })).toEqual({ ok: true });
    expect(await a.call('game:start', { roomCode: 'ZZZZZZ' })).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
    expect(await a.call('game:start', {})).toEqual({ ok: true });

    const sa = a.lastState();
    const sb = b.lastState();
    expect(sa.room.status).toBe('playing');
    expect(sa.game.hand.length).toBe(5);
    // privacy
    const jsonB = JSON.stringify(sb);
    for (const c of sa.game.hand) expect(jsonB).not.toContain(`"${c.id}"`);
    expect(jsonB).not.toContain(created.token);
    expect(jsonB).not.toContain(joined.token);

    const [mover, moverState, waiter] = sa.game.isYourTurn ? [a, sa, b] : [b, sb, a];
    expect(await waiter.call('game:draw', {})).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });
    expect(await mover.call('game:play-card', { cardId: '<x>' })).toEqual({ ok: false, error: 'CARD_NOT_IN_HAND' });
    expect(await mover.call('game:play-card', { cardId: moverState.game.hand[0].id, chosenSuit: 'Z' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await mover.call('game:draw', { actionId: 'bad id!' })).toEqual({ ok: false, error: 'INVALID_INPUT' });

    const g = moverState.game;
    const ctx = { topCard: g.topCard, activeSuit: g.activeSuit, pendingPenalty: g.pendingPenalty };
    const legal = g.hand.find((c: any) => canPlayCard(c, ctx, moverState.room.settings));
    const illegal = g.hand.find((c: any) => !canPlayCard(c, ctx, moverState.room.settings));
    if (illegal) expect(await mover.call('game:play-card', { cardId: illegal.id })).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
    if (legal) {
      const r = await mover.call('game:play-card', { cardId: legal.id, actionId: 'x1', chosenSuit: 'H' });
      expect(r).toEqual({ ok: true });
      expect(waiter.lastState().game.topCard.id).toBe(legal.id);
      expect(await mover.call('game:play-card', { cardId: legal.id, actionId: 'x1' })).toEqual({ ok: true, duplicate: true });
    } else {
      expect(await mover.call('game:draw', {})).toEqual({ ok: true });
    }

    // reconnection
    const handB = b.lastState().game.hand.map((c: any) => c.id).sort();
    io.disconnect(b);
    expect(a.lastState().room.players.find((p: any) => p.name === 'Vali').connected).toBe(false);
    const b2 = io.connect('B2');
    expect(await b2.call('room:resume', { token: 'nope' })).toEqual({ ok: false, error: 'INVALID_SESSION' });
    const resumed = await b2.call('room:resume', { token: joined.token });
    expect(resumed.ok).toBe(true);
    expect(resumed.playerId).toBe(joined.playerId);
    expect(resumed.state.game.hand.map((c: any) => c.id).sort()).toEqual(handB);
    expect(a.lastState().room.players.find((p: any) => p.name === 'Vali').connected).toBe(true);

    // second tab takes over: old socket is told
    const b3 = io.connect('B3');
    await b3.call('room:resume', { token: joined.token });
    expect(b2.received.some((r) => r.ev === 'session:ended' && r.data.reason === 'replaced')).toBe(true);
    expect(await b2.call('game:draw', {})).toEqual({ ok: false, error: 'NOT_IN_ROOM' });

    // leaving mid-game ends it
    expect(await b3.call('room:leave', {})).toEqual({ ok: true });
    expect(a.lastState().room.status).toBe('finished');
    expect(a.lastState().game.winnerId).toBe(created.playerId);
    expect(a.lastState().game.results[0].isWinner).toBe(true);
    rooms.dispose();
  });

  it('rate limits floods', async () => {
    const { rooms, io } = setup();
    const a = io.connect('A');
    const results = await Promise.all(Array.from({ length: 40 }, () => a.call('game:draw', {})));
    expect(results.filter((r) => r.error === 'RATE_LIMITED').length).toBeGreaterThan(10);
    rooms.dispose();
  });
});
