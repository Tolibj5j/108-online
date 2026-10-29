import type { GameEvent } from '../../../../shared/types/index.ts';
import { eventText } from '../../utils/eventText.ts';

export function GameLog({ events, nameOf, youId, limit = 8 }: { events: GameEvent[]; nameOf: (id: string) => string; youId: string; limit?: number }) {
  const items = events.slice(-limit).reverse();
  return (
    <ol className="space-y-1 text-xs text-white/75" aria-live="polite">
      {items.map((e, i) => (
        <li key={e.seq} className={`truncate rounded px-2 py-1 ${i === 0 ? 'bg-white/10 text-white' : ''}`}>
          {eventText(e, nameOf, youId)}
        </li>
      ))}
    </ol>
  );
}
