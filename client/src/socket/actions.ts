import type { Ack, CardSuit, ClientToServerEvents, RoomSettings, SessionInfo } from '../../../shared/types/index.ts';
import { errorText, type ClientErrorCode } from '../i18n/uz.ts';
import { uz } from '../i18n/uz.ts';
import { appStore, toast } from '../store/appStore.ts';
import { socket } from './client.ts';
import { sessions } from './session.ts';
import { playSound } from './sounds.ts';

export type Response<T extends object = object> = ({ ok: true } & T) | { ok: false; error: ClientErrorCode };

type LooseEmitter = { emit: (event: string, payload: unknown, cb: (err: Error | null, res: unknown) => void) => void };

/** Emits with an acknowledgement and a timeout. Fails fast when offline. */
export function request<T extends object = object>(
  event: keyof ClientToServerEvents,
  payload: object,
  timeoutMs = 8000,
): Promise<Response<T>> {
  if (!socket.connected) return Promise.resolve({ ok: false, error: 'DISCONNECTED' });
  return new Promise((resolve) => {
    (socket.timeout(timeoutMs) as unknown as LooseEmitter).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, error: 'TIMEOUT' });
      else resolve(res as Ack<T>);
    });
  });
}

function report<T extends object>(r: Response<T>): Response<T> {
  if (!r.ok) {
    toast(errorText(r.error));
    playSound('error');
  }
  return r;
}

const actionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ---------- URL ----------

export function setRoomInUrl(code: string | null): void {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

export function inviteLink(code: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', code);
  return url.toString();
}

// ---------- session lifecycle ----------

function enterRoom(info: SessionInfo): void {
  sessions.save({ token: info.token, roomCode: info.roomCode, playerId: info.playerId, name: info.state.you.name });
  appStore.set({ state: info.state, joinCode: info.roomCode });
  setRoomInUrl(info.roomCode);
}

export function exitRoom(): void {
  const token = sessions.tab()?.token;
  sessions.clear(token);
  appStore.set({ state: null, screen: 'menu' });
  setRoomInUrl(null);
}

export async function createRoom(name: string, settings: Partial<RoomSettings>) {
  const r = report(await request<SessionInfo>('room:create', { name, settings }));
  if (r.ok) enterRoom(r);
  return r;
}

export async function joinRoom(roomCode: string, name: string) {
  const r = report(await request<SessionInfo>('room:join', { roomCode, name }));
  if (r.ok) {
    enterRoom(r);
    playSound('join');
  }
  return r;
}

/** Resumes a stored session. Silent on failure unless `announce` is set. */
export async function resume(token: string, announce = false) {
  appStore.set({ resuming: true });
  const r = await request<SessionInfo>('room:resume', { token });
  appStore.set({ resuming: false });
  if (r.ok) {
    enterRoom(r);
  } else if (r.error === 'INVALID_SESSION') {
    sessions.clear(token);
    if (appStore.get().state) {
      // We were in a room but the server no longer knows it (e.g. it restarted).
      appStore.set({ state: null, screen: 'menu' });
      setRoomInUrl(null);
      toast(uz.sessionEnded.roomGone, 'info', 6000);
    } else if (announce) toast(errorText(r.error));
  } else if (announce) {
    toast(errorText(r.error));
  }
  return r;
}

export async function leaveRoom() {
  const r = await request('room:leave', {});
  exitRoom();
  return r;
}

export const setReady = async (ready: boolean) => report(await request('room:set-ready', { ready }));
export const updateSettings = async (settings: Partial<RoomSettings>) => report(await request('room:update-settings', { settings }));
export const startGame = async () => report(await request('game:start', {}));
export const restartGame = async () => report(await request('game:restart', {}));
export const returnToLobby = async () => report(await request('room:return-lobby', {}));

export const playCard = async (cardId: string, chosenSuit?: CardSuit) =>
  report(await request<{ duplicate?: boolean }>('game:play-card', { cardId, chosenSuit, actionId: actionId() }));
export const drawCard = async () => report(await request<{ duplicate?: boolean }>('game:draw', { actionId: actionId() }));
export const passTurn = async () => report(await request<{ duplicate?: boolean }>('game:pass', { actionId: actionId() }));

// ---------- wiring ----------

let wired = false;

/** Connects the socket and keeps the store in sync. Call once at start-up. */
export function initConnection(): void {
  if (wired) return;
  wired = true;

  const code = new URL(window.location.href).searchParams.get('room');
  if (code) appStore.set({ joinCode: code.toUpperCase().slice(0, 6), screen: 'join' });

  socket.on('connect', () => {
    const wasEver = appStore.get().everConnected;
    appStore.set({ connection: 'connected', everConnected: true });
    if (wasEver) toast(uz.connection.restored, 'success', 1800);
    // Auto-resume only this tab's own session; a remembered session from another tab is offered on screen instead.
    const own = sessions.tab();
    if (own) void resume(own.token);
  });

  socket.on('disconnect', () => appStore.set({ connection: 'disconnected' }));
  socket.io.on('reconnect_attempt', () => {
    if (appStore.get().connection !== 'connected') appStore.set({ connection: 'disconnected' });
  });

  socket.on('state', (state) => {
    // Ignore stray updates that arrive after leaving.
    if (!sessions.tab()) return;
    appStore.set({ state });
  });

  socket.on('session:ended', ({ reason }) => {
    sessions.clear(sessions.tab()?.token);
    appStore.set({ state: null, screen: 'menu' });
    setRoomInUrl(null);
    toast(uz.sessionEnded[reason], 'info', 5000);
  });

  socket.connect();
}
