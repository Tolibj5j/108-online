import { useEffect, useRef } from 'react';
import type { GameEvent, PublicGameState } from '../../../shared/types/index.ts';

/**
 * Calls `handler` with server events newer than the last ones seen.
 * The first state of a match (initial load, refresh, new match) is not replayed.
 */
export function useEventFeed(game: PublicGameState, handler: (events: GameEvent[]) => void): void {
  const last = useRef<{ match: number; seq: number } | null>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const prev = last.current;
    last.current = { match: game.matchId, seq: game.lastEventSeq };
    if (!prev || prev.match !== game.matchId) return;
    const fresh = game.events.filter((e) => e.seq > prev.seq);
    if (fresh.length) handlerRef.current(fresh);
  }, [game.matchId, game.lastEventSeq, game.events]);
}
