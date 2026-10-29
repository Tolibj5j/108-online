import { afterEach, describe, expect, it } from 'vitest';
import { buildClientState } from '../server/src/game/view.ts';
import { RoomManager, type RoomEvent } from '../server/src/rooms/RoomManager.ts';
import { identityShuffle, sleep } from './helpers.ts';

let manager: RoomManager;
afterEach(() => manager?.dispose());

function make(opts: Partial<ConstructorParameters<typeof RoomManager>[0]> = {}) {
  manager = new RoomManager({
    reconnectGraceMs: 10_000,
    disconnectedTurnMs: 10_000,
    roomIdleTtlMs: 60_000,
    shuffle: identityShuffle,
    ...opts,
  });
  return manager;
}

function roomWith(m: RoomManager, names: string[], settings: object = {}) {
  const created = m.createRoom(names[0], settings, 's0');
  if (!created.ok) throw new Error(created.error);
  const code = created.room.code;
  names.slice(1).forEach((n, i) => {
    const r = m.joinRoom(code, n, `s${i + 1}`);
    if (!r.ok) throw new Error(r.error);
    m.setReady(`s${i + 1}`, true);
  });
  return created.room;
}

describe('room creation and joining', () => {
  it('creates a room with a 6-character code; the creator is host', () => {
    const m = make();
    const r = m.createRoom('Ali', { maxPlayers: 3, deckCount: 2 }, 's0');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(r.room.hostId).toBe(r.player.id);
    expect(r.room.settings).toMatchObject({ maxPlayers: 3, deckCount: 2 });
    expect(r.player.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('rejects bad names and settings', () => {
    const m = make();
    expect(m.createRoom('   ', {}, 's0')).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(m.createRoom('x'.repeat(21), {}, 's0')).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(m.createRoom('Ali', { deckCount: 5 }, 's0')).toEqual({ ok: false, error: 'INVALID_SETTINGS' });
  });

  it('rejects unknown rooms, duplicate names and full rooms', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali'], { maxPlayers: 2 });
    expect(m.joinRoom('ZZZZZZ', 'Gani', 'x1')).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
    expect(m.joinRoom(room.code, 'Gani', 'x1')).toEqual({ ok: false, error: 'ROOM_FULL' });
    m.updateSettings('s0', { maxPlayers: 3 });
    expect(m.joinRoom(room.code, 'vali', 'x1')).toEqual({ ok: false, error: 'NAME_TAKEN' });
  });

  it('rejects joining a match in progress', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali']);
    expect(m.startGame('s0')).toEqual({ ok: true });
    expect(m.joinRoom(room.code, 'Gani', 'x1')).toEqual({ ok: false, error: 'MATCH_IN_PROGRESS' });
  });
});

describe('lobby rules', () => {
  it('only the host may start, and not alone or with unready players', () => {
    const m = make();
    const created = m.createRoom('Ali', {}, 's0');
    if (!created.ok) throw new Error();
    expect(m.startGame('s0')).toEqual({ ok: false, error: 'NOT_ENOUGH_PLAYERS' });
    m.joinRoom(created.room.code, 'Vali', 's1');
    expect(m.startGame('s1')).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(m.startGame('s0')).toEqual({ ok: false, error: 'PLAYERS_NOT_READY' });
    m.setReady('s1', true);
    expect(m.startGame('s0')).toEqual({ ok: true });
    expect(created.room.status).toBe('playing');
  });

  it('only the host may change settings; changes reset readiness', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali']);
    expect(m.updateSettings('s1', { handSize: 7 })).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(m.updateSettings('s0', { handSize: 7 })).toEqual({ ok: true });
    expect(room.settings.handSize).toBe(7);
    expect(room.players[1]!.ready).toBe(false);
    expect(m.updateSettings('s0', { maxPlayers: 1 })).toEqual({ ok: false, error: 'INVALID_SETTINGS' });
  });

  it('refuses to start when there are not enough cards', () => {
    const m = make();
    roomWith(m, ['A', 'B', 'C', 'D', 'E'], { maxPlayers: 6, handSize: 10 });
    expect(m.startGame('s0')).toEqual({ ok: false, error: 'NOT_ENOUGH_CARDS' });
    m.updateSettings('s0', { deckCount: 2 });
    for (let i = 1; i < 5; i++) m.setReady(`s${i}`, true);
    expect(m.startGame('s0')).toEqual({ ok: true });
  });
});

describe('privacy of client payloads', () => {
  it('contains only the viewer cards, never tokens', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali', 'Gani']);
    m.startGame('s0');
    const [ali, vali, gani] = room.players;
    const view = buildClientState(room, vali!.id);
    const json = JSON.stringify(view);

    expect(view.game!.hand.map((c) => c.id).sort()).toEqual(room.game!.players[1]!.hand.map((c) => c.id).sort());
    for (const other of [room.game!.players[0]!, room.game!.players[2]!]) {
      for (const c of other.hand) expect(json).not.toContain(`"${c.id}"`);
    }
    for (const c of room.game!.drawPile) expect(json).not.toContain(`"${c.id}"`);
    for (const p of [ali!, vali!, gani!]) expect(json).not.toContain(p.token);
    expect(view.room.players.map((p) => p.cardCount)).toEqual([5, 5, 5]);
  });
});

describe('game actions through the manager', () => {
  it('ignores duplicated actions with the same actionId', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali']);
    m.startGame('s0');
    const g = room.game!;
    const current = room.players.find((p) => p.id === g.players[g.currentIndex]!.id)!;
    const sid = current.socketId!;
    const before = g.players[g.currentIndex]!.hand.length;
    expect(m.draw(sid, 'a1')).toEqual({ ok: true });
    expect(m.draw(sid, 'a1')).toEqual({ ok: true, duplicate: true });
    expect(g.players.find((p) => p.id === current.id)!.hand.length).toBe(before + 1);
  });

  it('rejects actions from sockets that are not in a room', () => {
    const m = make();
    roomWith(m, ['Ali', 'Vali']);
    m.startGame('s0');
    expect(m.draw('stranger')).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
    expect(m.pass('stranger')).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
  });

  it('leaving mid-match returns cards; the last player wins', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali']);
    m.startGame('s0');
    const vali = room.players[1]!;
    expect(m.leave('s1')).toEqual({ ok: true });
    expect(room.status).toBe('finished');
    expect(room.game!.winnerId).toBe(room.players[0]!.id);
    expect(room.players[0]!.wins).toBe(1);
    expect(room.players.includes(vali)).toBe(false);
  });

  it('restart and return to lobby are host-only and only after a match', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali', 'Gani']);
    expect(m.restartGame('s0')).toEqual({ ok: false, error: 'WRONG_STATUS' });
    m.startGame('s0');
    m.leave('s2');
    m.leave('s1');
    expect(room.status).toBe('finished');
    const joined = m.joinRoom(room.code, 'Vali', 's3');
    expect(joined.ok).toBe(true);
    expect(m.restartGame('s3')).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(m.restartGame('s0')).toEqual({ ok: true });
    expect(room.status).toBe('playing');
    expect(room.matchCount).toBe(2);
  });

  it('returnToLobby clears the game and readiness', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali', 'Gani']);
    m.startGame('s0');
    m.leave('s2');
    m.leave('s1');
    expect(m.returnToLobby('s0')).toEqual({ ok: true });
    expect(room.status).toBe('lobby');
    expect(room.game).toBeNull();
  });
});

describe('reconnection, host transfer and cleanup', () => {
  it('resume restores identity, hand and state on a new socket', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali']);
    m.startGame('s0');
    const vali = room.players[1]!;
    const hand = room.game!.players[1]!.hand.map((c) => c.id);
    m.handleDisconnect('s1');
    expect(vali.connected).toBe(false);
    const r = m.resume(vali.token, 's9');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.player.id).toBe(vali.id);
    expect(vali.connected).toBe(true);
    const view = buildClientState(room, vali.id);
    expect(view.game!.hand.map((c) => c.id)).toEqual(hand);
    expect(m.resume('x'.repeat(43), 's8')).toEqual({ ok: false, error: 'INVALID_SESSION' });
  });

  it('a second tab replaces the first socket', () => {
    const m = make();
    const room = roomWith(m, ['Ali', 'Vali']);
    const r = m.resume(room.players[1]!.token, 's7');
    expect(r.ok && r.replacedSocketId).toBe('s1');
    expect(m.getBinding('s1')).toBeNull();
    m.handleDisconnect('s1'); // the old socket closing must not mark the player offline
    expect(room.players[1]!.connected).toBe(true);
  });

  it('removes a player after the grace period and passes host to a connected player', async () => {
    const m = make({ reconnectGraceMs: 30 });
    const room = roomWith(m, ['Ali', 'Vali', 'Gani']);
    const events: RoomEvent[] = [];
    m.on((e) => events.push(e));
    m.handleDisconnect('s0');
    expect(room.hostId).toBe(room.players[0]!.id); // host keeps the room while briefly offline
    await sleep(80);
    expect(room.players.map((p) => p.name)).toEqual(['Vali', 'Gani']);
    expect(room.hostId).toBe(room.players[0]!.id);
    expect(events.some((e) => e.type === 'player-removed' && e.reason === 'timeout')).toBe(true);
  });

  it('auto-resolves the turn of a disconnected current player', async () => {
    const m = make({ disconnectedTurnMs: 30 });
    const room = roomWith(m, ['Ali', 'Vali']);
    m.startGame('s0');
    const g = room.game!;
    const current = g.players[g.currentIndex]!.id;
    const sid = room.players.find((p) => p.id === current)!.socketId!;
    const turn = g.turnNumber;
    m.handleDisconnect(sid);
    await sleep(80);
    expect(g.turnNumber).toBeGreaterThan(turn);
    expect(g.players[g.currentIndex]!.id).not.toBe(current);
  });

  it('deletes the room when the last player leaves', () => {
    const m = make();
    const room = roomWith(m, ['Ali']);
    expect(m.roomCount).toBe(1);
    m.leave('s0');
    expect(m.roomCount).toBe(0);
    expect(m.getRoom(room.code)).toBeUndefined();
  });

  it('sweeps idle rooms', () => {
    let now = 0;
    const m = make({ roomIdleTtlMs: 1000, now: () => now });
    roomWith(m, ['Ali', 'Vali']);
    now = 5000;
    m.sweepIdleRooms();
    expect(m.roomCount).toBe(0);
  });
});
