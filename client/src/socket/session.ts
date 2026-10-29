export interface StoredSession {
  token: string;
  roomCode: string;
  playerId: string;
  name: string;
}

const KEY = '108online.session';

function read(storage: Storage): StoredSession | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    return typeof s.token === 'string' && typeof s.roomCode === 'string' ? s : null;
  } catch {
    return null;
  }
}

/**
 * The tab's own session lives in sessionStorage (survives refresh, separate per tab so two tabs
 * can be two players). A copy in localStorage lets a player return after closing the browser.
 */
export const sessions = {
  tab: (): StoredSession | null => read(sessionStorage),
  remembered: (): StoredSession | null => read(localStorage),
  save(s: StoredSession): void {
    try {
      const raw = JSON.stringify(s);
      sessionStorage.setItem(KEY, raw);
      localStorage.setItem(KEY, raw);
    } catch {
      /* ignore */
    }
  },
  clear(token?: string): void {
    try {
      for (const st of [sessionStorage, localStorage]) {
        const cur = read(st);
        if (!token || cur?.token === token) st.removeItem(KEY);
      }
    } catch {
      /* ignore */
    }
  },
};
