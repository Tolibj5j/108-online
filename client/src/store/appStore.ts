import type { ClientState } from '../../../shared/types/index.ts';
import { createStore, useStore } from './createStore.ts';

export type Screen = 'menu' | 'create' | 'join' | 'rules' | 'settings';
export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface Toast {
  id: number;
  text: string;
  tone: 'error' | 'info' | 'success';
}

export interface AppState {
  connection: ConnectionState;
  /** True once the socket has connected at least once. */
  everConnected: boolean;
  screen: Screen;
  /** Room code from the invite link or typed by the user. */
  joinCode: string;
  /** True while an automatic session resume is in progress. */
  resuming: boolean;
  state: ClientState | null;
  toasts: Toast[];
}

export const appStore = createStore<AppState>({
  connection: 'connecting',
  everConnected: false,
  screen: 'menu',
  joinCode: '',
  resuming: false,
  state: null,
  toasts: [],
});

export const useApp = <R,>(selector: (s: AppState) => R): R => useStore(appStore, selector);

let toastSeq = 0;
export function toast(text: string, tone: Toast['tone'] = 'error', ms = 3200): void {
  const id = ++toastSeq;
  appStore.set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
  setTimeout(() => appStore.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
}

export function goTo(screen: Screen): void {
  appStore.set({ screen });
}
