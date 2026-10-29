import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Card, RoomSettings } from '../../../../shared/types/index.ts';
import { useElementSize, useMediaQuery } from '../../hooks/useElementSize.ts';
import { CardFace, cardAriaLabel } from '../PlayingCard.tsx';

interface HandProps {
  cards: Card[];
  playableIds: ReadonlySet<string>;
  selectedId: string | null;
  isYourTurn: boolean;
  settings: Pick<RoomSettings, 'queenRule'>;
  onCardClick: (card: Card) => void;
  /** Stagger the cards in as if dealt (first render of a match). */
  animateDeal?: boolean;
}

export function Hand({ cards, playableIds, selectedId, isYourTurn, settings, onCardClick, animateDeal = true }: HandProps) {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const wide = useMediaQuery('(min-width: 640px)');
  const cardW = wide ? 86 : 66;

  // Cards present on the first render get the dealing stagger; later draws fly in immediately.
  const initialIds = useRef<Set<string> | null>(null);
  if (initialIds.current === null) initialIds.current = new Set(animateDeal ? cards.map((c) => c.id) : []);
  const [dealing, setDealing] = useState(animateDeal);
  useEffect(() => {
    if (!dealing) return;
    const t = setTimeout(() => setDealing(false), 400 + cards.length * 70);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = cards.length;
  const usable = Math.max(cardW, width - 16);
  const step = n > 1 ? Math.min(cardW + 8, (usable - cardW) / (n - 1)) : 0;
  const spread = Math.min(4, 30 / Math.max(n, 1));

  return (
    <div ref={ref} className="relative flex h-[7.4rem] w-full items-end justify-center sm:h-[9.4rem]" role="group" aria-label="Sizning kartalaringiz">
      <div className="flex items-end pb-2">
        {cards.map((card, i) => {
          const playable = isYourTurn && playableIds.has(card.id);
          const selected = selectedId === card.id;
          const offset = i - (n - 1) / 2;
          const delay = dealing && initialIds.current!.has(card.id) ? i * 0.07 : 0;
          return (
            <motion.button
              key={card.id}
              layoutId={card.id}
              type="button"
              aria-pressed={selected}
              aria-label={`${cardAriaLabel(card)}${playable ? ' — tashlash mumkin' : ''}`}
              data-playable={playable || undefined}
              onClick={() => onCardClick(card)}
              className="relative shrink-0 cursor-pointer rounded-[0.8rem] outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
              style={{ marginLeft: i === 0 ? 0 : step - cardW, zIndex: selected ? 50 : i }}
              initial={{ opacity: 0, y: -240, scale: 0.6, rotate: -12 }}
              animate={{
                opacity: 1,
                y: selected ? -28 : Math.abs(offset) * 1.6,
                scale: selected ? 1.04 : 1,
                rotate: offset * spread,
              }}
              whileHover={{ y: selected ? -32 : -14 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26, delay }}
            >
              <CardFace
                card={card}
                size="hand"
                settings={settings}
                className={`${playable ? 'card-playable' : ''} ${selected ? 'card-selected' : ''} ${isYourTurn && !playable ? 'card-dim' : ''}`}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
