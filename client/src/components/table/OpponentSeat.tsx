import { AnimatePresence, motion } from 'framer-motion';
import type { PublicPlayer } from '../../../../shared/types/index.ts';
import { uz } from '../../i18n/uz.ts';
import type { Point } from '../../utils/seats.ts';
import { Avatar } from '../Avatar.tsx';
import { CardBack } from '../PlayingCard.tsx';

export interface Bubble {
  id: number;
  text: string;
  tone: 'bad' | 'info';
}

export function OpponentSeat({ player, pos, isTurn, bubble }: { player: PublicPlayer; pos: Point; isTurn: boolean; bubble?: Bubble }) {
  const count = player.cardCount ?? 0;
  const shown = Math.min(count, 8);
  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      data-seat={player.id}
    >
      <div className="relative flex h-10 items-end justify-center sm:h-14" aria-hidden>
        {Array.from({ length: shown }, (_, i) => {
          const off = i - (shown - 1) / 2;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: Math.abs(off) * 1.2, rotate: off * 6 }}
              className="origin-bottom"
              style={{ marginLeft: i === 0 ? 0 : '-1.55rem' }}
            >
              <CardBack size="sm" className="shadow-md max-sm:h-10 max-sm:w-7 max-sm:text-[5px]" />
            </motion.div>
          );
        })}
      </div>

      <div
        className={`flex max-w-[9.5rem] items-center gap-2 rounded-full py-1 pl-1 pr-3 ring-1 backdrop-blur-sm transition sm:max-w-[12rem] ${
          isTurn ? 'bg-gold-500/20 ring-gold-400 shadow-[0_0_24px_rgba(230,195,92,0.45)]' : 'bg-black/45 ring-white/10'
        }`}
      >
        <Avatar name={player.name} avatar={player.avatar} size="sm" active={isTurn} offline={!player.connected} host={player.isHost} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-white">{player.name}</div>
          <div className="text-xs text-gold-200/80">{uz.game.cardsLeft(count)}</div>
        </div>
      </div>

      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble.id}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0, y: -18 }}
            className={`pointer-events-none absolute -top-5 rounded-full px-3 py-1 text-sm font-bold shadow-lg ${
              bubble.tone === 'bad' ? 'bg-card-red text-white' : 'bg-gold-400 text-wood-900'
            }`}
          >
            {bubble.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
