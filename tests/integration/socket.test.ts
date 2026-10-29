import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { canPlayCard } from '../../shared/rules/index.ts';
import type {
  Ack,
  ClientState,
  ClientToServerEvents,
  ServerToClientEvents,
  SessionInfo,
} from '../../shared/types/index.ts';
import { createAppServer, type AppServer } from '../../server/src/app.ts';
import type { Card } from '../../shared/types/index.ts';
import { card } from '../helpers.ts';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Deterministic deal for two players: host gets 9H 8C 9C 10D JS, guest 10S JD 8S 9D 10C, start card 8H.
 * The host moves first; its first legal card in hand order is 9H and 9C is illegal.
 */
const RIG = ['9H', '10S', '8C', 'JD', '9C', '8S', '10D', '9D', 'JS', '10C', '8H'].map((c) => card(c).id);
function riggedShuffle(cards: Card[]): Card[] {
  const picked = RIG.map((id) => cards.find((c) => c.id === id)).filter((c): c is Card => !!c);
  if (picked.length !== RIG.length) return cards.slice();
  return [...cards.filter((c) => !RIG.includes(c.id)), ...picked.reverse()];
}

let server: AppServer;
let url: string;
const clients: Client[] = [];

beforeAll(async () => {
  server = createAppServer({ shuffle: riggedShuffle, reconnectGraceMs: 5_000, disconnectedTurnMs: 60_000 });
  await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await server.close();
});

afterEach(() => {
  for (const c of clients.splice(0)) c.disconnect();
});

function client(): Promise<Client> {
  const c: Client = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(c);
  return new Promise((resolve, reject) => {
    c.once('connect', () => resolve(c));
    c.once('connect_error', reject);
  });
}

function call<T extends object = object>(c: Client, event: keyof ClientToServerEvents, payload: object): Promise<Ack<T>> {
  return new Promise((resolve) => {
    (c as unknown as { emit: (e: string, p: object, cb: (r: Ack<T>) => void) => void }).emit(event, payload, resolve);
  });
}

/** Resolves with the next `state` that satisfies the predicate. */
function nextState(c: Client, pred: (s: ClientState) => boolean = () => true): Promise<ClientState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('state timeout')), 4000);
    const onState = (s: ClientState) => {
      if (!pred(s)) return;
      clearTimeout(timer);
      c.off('state', onState);
      resolve(s);
    };
    c.on('state', onState);
  });
}

async function setupMatch() {
  const host = await client();
  const guest = await client();
  const created = await call<SessionInfo>(host, 'room:create', { name: 'Ali', settings: { maxPlayers: 2 } });
  if (!created.ok) throw new Error(created.error);
  const joined = await call<SessionInfo>(guest, 'room:join', { roomCode: created.roomCode, name: 'Vali' });
  if (!joined.ok) throw new Error(joined.error);
  await call(guest, 'room:set-ready', { ready: true });
  const hostState = nextState(host, (s) => s.room.status === 'playing');
  const guestState = nextState(guest, (s) => s.room.status === 'playing');
  const started = await call(host, 'game:start', {});
  expect(started).toEqual({ ok: true });
  return { host, guest, created, joined, hostState: await hostState, guestState: await guestState };
}

describe('Socket.IO multiplayer', () => {
  it('creates a room and returns a code, token and lobby state', async () => {
    const c = await client();
    const r = await call<SessionInfo>(c, 'room:create', { name: 'Ali', settings: { deckCount: 2 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.roomCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(r.token.length).toBe(43);
    expect(r.state.room.status).toBe('lobby');
    expect(r.state.room.settings.deckCount).toBe(2);
    expect(r.state.room.players[0]).toMatchObject({ name: 'Ali', isHost: true });
  });

  it('lets a second client join and broadcasts the player list to both', async () => {
    const host = await client();
    const guest = await client();
    const created = await call<SessionInfo>(host, 'room:create', { name: 'Ali' });
    if (!created.ok) throw new Error(created.error);
    const hostSees = nextState(host, (s) => s.room.players.length === 2);
    const joined = await call<SessionInfo>(guest, 'room:join', { roomCode: created.roomCode.toLowerCase(), name: 'Vali' });
    expect(joined.ok).toBe(true);
    const s = await hostSees;
    expect(s.room.players.map((p) => p.name)).toEqual(['Ali', 'Vali']);
    expect(await call(guest, 'room:join', { roomCode: 'NOPE00', name: 'X' })).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
  });

  it('starts a game for both players with private hands', async () => {
    const { hostState, guestState } = await setupMatch();
    expect(hostState.game!.hand).toHaveLength(5);
    expect(guestState.game!.hand).toHaveLength(5);
    const hostIds = new Set(hostState.game!.hand.map((c) => c.id));
    expect(guestState.game!.hand.some((c) => hostIds.has(c.id))).toBe(false);
    // privacy: the guest payload must not contain any host card id
    const guestJson = JSON.stringify(guestState);
    for (const id of hostIds) expect(guestJson).not.toContain(`"${id}"`);
    expect(guestState.room.players.find((p) => p.name === 'Ali')!.cardCount).toBe(5);
    expect(guestJson).not.toContain('token');
  });

  it('plays a legal card, rejects an illegal card and out-of-turn actions', async () => {
    const { host, guest, hostState, guestState } = await setupMatch();
    const [mover, moverState, waiter] = hostState.game!.isYourTurn
      ? [host, hostState, guest]
      : [guest, guestState, host];
    const g = moverState.game!;
    const ctx = { topCard: g.topCard, activeSuit: g.activeSuit, pendingPenalty: g.pendingPenalty };
    const legal = g.hand.find((c) => canPlayCard(c, ctx, moverState.room.settings));
    const illegal = g.hand.find((c) => !canPlayCard(c, ctx, moverState.room.settings));

    // out of turn
    const waiterState = waiter === host ? hostState : guestState;
    expect(await call(waiter, 'game:play-card', { cardId: waiterState.game!.hand[0]!.id })).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });
    expect(await call(waiter, 'game:draw', {})).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });

    expect(mover).toBe(host);
    expect(legal?.id).toBe(card('9H').id);
    expect(illegal).toBeDefined();
    expect(await call(mover, 'game:play-card', { cardId: illegal!.id })).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
    // someone else's card / bogus ids
    expect(await call(mover, 'game:play-card', { cardId: waiterState.game!.hand[0]!.id })).toEqual({ ok: false, error: 'CARD_NOT_IN_HAND' });
    expect(await call(mover, 'game:play-card', { cardId: '<script>' })).toEqual({ ok: false, error: 'CARD_NOT_IN_HAND' });

    expect(legal).toBeDefined();
    const waiterUpdate = nextState(waiter, (s) => s.game!.topCard?.id === legal!.id);
    const r = await call(mover, 'game:play-card', { cardId: legal!.id, chosenSuit: 'H', actionId: 'act-1' });
    expect(r).toEqual({ ok: true });
    const seen = await waiterUpdate;
    expect(seen.game!.events.some((e) => e.type === 'play' && e.card.id === legal!.id)).toBe(true);
    // duplicate delivery is ignored
    expect(await call(mover, 'game:play-card', { cardId: legal!.id, actionId: 'act-1' })).toEqual({ ok: true, duplicate: true });
  });

  it('draws a card and synchronises the count to the opponent', async () => {
    const { host, guest, hostState } = await setupMatch();
    const [mover, waiter] = hostState.game!.isYourTurn ? [host, guest] : [guest, host];
    const moverName = mover === host ? 'Ali' : 'Vali';
    const waiterSees = nextState(waiter, (s) => s.game!.events.some((e) => e.type === 'draw'));
    expect(await call(mover, 'game:draw', {})).toEqual({ ok: true });
    const s = await waiterSees;
    expect(s.room.players.find((p) => p.name === moverName)!.cardCount).toBe(6);
  });

  it('reconnects with the session token and restores the same hand', async () => {
    const { guest, joined, guestState } = await setupMatch();
    const hand = guestState.game!.hand.map((c) => c.id).sort();
    guest.disconnect();
    const again = await client();
    const r = await call<SessionInfo>(again, 'room:resume', { token: joined.ok ? joined.token : '' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.playerId).toBe(joined.ok ? joined.playerId : '');
    expect(r.state.game!.hand.map((c) => c.id).sort()).toEqual(hand);
    expect(r.state.room.players.find((p) => p.name === 'Vali')!.connected).toBe(true);
    expect(await call(again, 'room:resume', { token: 'bogus' })).toEqual({ ok: false, error: 'INVALID_SESSION' });
  });

  it('rejects host-only actions from guests and malformed payloads', async () => {
    const host = await client();
    const guest = await client();
    const created = await call<SessionInfo>(host, 'room:create', { name: 'Ali' });
    if (!created.ok) throw new Error();
    await call(guest, 'room:join', { roomCode: created.roomCode, name: 'Vali' });
    expect(await call(guest, 'game:start', {})).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(await call(guest, 'room:update-settings', { settings: { deckCount: 2 } })).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(await call(host, 'room:create', { name: 42 })).toEqual({ ok: false, error: 'INVALID_INPUT' });
  });
});
