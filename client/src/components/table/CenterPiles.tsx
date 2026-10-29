import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Card, PublicGameState, RoomSettings } from '../../../../shared/types/index.ts';
import { uz } from '../../i18n/uz.ts';
import { hashUnit, isRed, suitSymbol } from '../../utils/cards.ts';
import { CardBack, CardFace } from '../PlayingCard.tsx';

interface Props {
  game: PublicGameState;
  settings: RoomSettings;
  myId: string;
  /** Pixel offset from the discard pile to the seat of whoever played the top card (for the fly-in). */
  playOrigin: { x: number; y: number } | null;
  onDraw: () => void;
}

function previousDiscards(game: PublicGameState): Card[] {
  const top = game.topCard?.id;
  const cards: Card[] = [];
  for (let i = game.events.length - 1; i >= 0 && cards.length < 3; i--) {
    const e = game.events[i]!;
    if (e.type === 'reshuffle') break;
    if (e.type === 'play' && e.card.id !== top) cards.push(e.card);
    if (e.type === 'deal' && e.startCard.id !== top) cards.push(e.startCard);
  }
  return cards.slice(0, Math.max(0, game.discardCount - 1)).reverse();
}

export function CenterPiles({ game, settings, myId, playOrigin, onDraw }: Props) {
  const top = game.topCard;
  const lastPlay = [...game.events].reverse().find((e) => e.type === 'play');
  const playedByMe = lastPlay?.type === 'play' && lastPlay.playerId === myId && lastPlay.card.id === top?.id;
  const under = previousDiscards(game);
  const stackLayers = Math.min(4, Math.ceil(game.drawCount / 6));
  const drawHighlight = game.isYourTurn && game.canDraw && (game.pendingPenalty !== null || game.playableCardIds.length === 0);
  const freePlay = top?.rank === 'Q' && settings.queenRule === 'free-next' && !game.pendingPenalty;

  return (
    <div className="absolute left-1/2 top-[52%] z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
      <div className="flex items-center gap-6 sm:gap-12">
        {/* draw pile */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onDraw}
            aria-label={game.pendingPenalty ? uz.game.drawPenalty(game.pendingPenalty.amount) : uz.game.draw}
            className={`relative rounded-[0.9rem] outline-none transition focus-visible:ring-2 focus-visible:ring-gold-300 ${
              game.canDraw ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'
            } ${drawHighlight ? 'pile-glow' : ''}`}
          >
            {Array.from({ length: stackLayers }, (_, i) => (
              <div key={i} className="absolute" style={{ left: -i * 1.5, top: -i * 1.5 }}>
                <CardBack size="pile" className="shadow-md" />
              </div>
            ))}
            {game.drawCount > 0 ? (
              <div className="relative" style={{ left: -stackLayers * 1.5, top: -stackLayers * 1.5 }}>
                <CardBack size="pile" className="shadow-xl" />
              </div>
            ) : (
              <div className="flex h-[6.2rem] w-[4.4rem] items-center justify-center rounded-[0.7rem] border-2 border-dashed border-white/20 text-xs text-white/40 sm:h-[8.4rem] sm:w-[6rem]">
                0
              </div>
            )}
          </button>
          <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-gold-100">
            {uz.game.deck}: {game.drawCount}
          </span>
        </div>

        {/* discard pile */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative h-[6.2rem] w-[4.4rem] sm:h-[8.4rem] sm:w-[6rem]">
            {under.map((c) => (
              <div key={c.id} className="absolute inset-0" style={{ transform: `rotate(${hashUnit(c.id) * 14}deg) translate(${hashUnit(c.id + 'x') * 6}px, ${hashUnit(c.id + 'y') * 4}px)` }}>
                <CardFace card={c} size="pile" settings={settings} className="opacity-90 shadow-md" />
              </div>
            ))}
            <AnimatePresence initial={false}>
              {top && (
                <motion.div
                  key={top.id}
                  layoutId={playedByMe ? top.id : undefined}
                  className="absolute inset-0"
                  initial={
                    playedByMe
                      ? false
                      : { opacity: 0.4, x: playOrigin?.x ?? 0, y: playOrigin?.y ?? -40, scale: 0.55, rotate: hashUnit(top.id) * 6 - 30 }
                  }
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: hashUnit(top.id) * 6 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                >
                  <CardFace card={top} size="pile" settings={settings} className="shadow-2xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-gold-100">
            {uz.game.discard}: {game.discardCount}
          </span>
        </div>
      </div>

      {/* status chips */}
      <div className="flex min-h-8 flex-wrap items-center justify-center gap-2">
        <AnimatePresence>
          {game.pendingPenalty && (
            <motion.span
              key={`pen-${game.pendingPenalty.amount}`}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="penalty-chip rounded-full px-3 py-1 text-sm font-black text-white"
              role="status"
            >
              {uz.game.pending}: +{game.pendingPenalty.amount}
            </motion.span>
          )}
          {game.activeSuit && (
            <motion.span
              key={`suit-${game.activeSuit}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-wood-900 shadow"
              role="status"
            >
              {uz.game.activeSuit}:
              <span className={`text-lg leading-none ${isRed(game.activeSuit) ? 'text-card-red' : 'text-card-black'}`}>{suitSymbol(game.activeSuit)}</span>
            </motion.span>
          )}
          {freePlay && (
            <motion.span
              key="free"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 rounded-full bg-gold-400 px-3 py-1 text-sm font-bold text-wood-900 shadow"
              role="status"
            >
              <Sparkles className="h-4 w-4" /> {uz.game.freePlay}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
