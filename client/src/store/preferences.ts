import type { SortMode } from '../utils/cards.ts';
import { createStore, useStore } from './createStore.ts';

export interface Preferences {
  name: string;
  sound: boolean;
  reducedMotion: boolean;
  sortHand: SortMode;
}

const KEY = '108online.prefs';
const DEFAULTS: Preferences = { name: '', sound: true, reducedMotion: false, sortHand: 'suit' };

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Preferences>;
    return {
      name: typeof p.name === 'string' ? p.name.slice(0, 20) : '',
      sound: typeof p.sound === 'boolean' ? p.sound : true,
      reducedMotion: typeof p.reducedMotion === 'boolean' ? p.reducedMotion : false,
      sortHand: p.sortHand === 'rank' || p.sortHand === 'none' ? p.sortHand : 'suit',
    };
  } catch {
    return DEFAULTS;
  }
}

export const prefsStore = createStore<Preferences>(load());

prefsStore.subscribe(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefsStore.get()));
  } catch {
    /* storage may be unavailable (private mode) */
  }
});

export const usePrefs = <R,>(selector: (p: Preferences) => R): R => useStore(prefsStore, selector);
export const setPrefs = (patch: Partial<Preferences>) => prefsStore.set(patch);
