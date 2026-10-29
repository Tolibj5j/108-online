import { Crown, Gem, Swords } from 'lucide-react';
import type { Card, RoomSettings } from '../../../shared/types/index.ts';
import { uz } from '../i18n/uz.ts';
import { isRed, specialBadge, suitSymbol } from '../utils/cards.ts';

export type CardSize = 'xs' | 'sm' | 'md' | 'hand' | 'pile';

/** Width/height and the base font size that every inner element scales from (em units). */
const SIZE_CLASSES: Record<CardSize, string> = {
  xs: 'w-7 h-10 text-[5px]',
  sm: 'w-10 h-14 text-[7px]',
  md: 'w-14 h-20 text-[9.5px]',
  hand: 'w-[4.1rem] h-[5.8rem] text-[9.5px] sm:w-[5.4rem] sm:h-[7.6rem] sm:text-[12.5px]',
  pile: 'w-[4.4rem] h-[6.2rem] text-[10px] sm:w-[6rem] sm:h-[8.4rem] sm:text-[13.5px]',
};

/** Pip positions (percent of the inner area) for number cards. */
const PIPS: Record<string, [number, number][]> = {
  '6': [[25, 12], [75, 12], [25, 50], [75, 50], [25, 88], [75, 88]],
  '7': [[25, 12], [75, 12], [50, 31], [25, 50], [75, 50], [25, 88], [75, 88]],
  '8': [[25, 12], [75, 12], [50, 31], [25, 50], [75, 50], [50, 69], [25, 88], [75, 88]],
  '9': [[25, 10], [75, 10], [25, 37], [75, 37], [50, 50], [25, 63], [75, 63], [25, 90], [75, 90]],
  '10': [[25, 10], [75, 10], [50, 24], [25, 37], [75, 37], [25, 63], [75, 63], [50, 76], [25, 90], [75, 90]],
};

const RANK_NAMES: Record<string, string> = { J: 'Valet', Q: 'Dama', K: 'Qirol', A: 'Tuz' };

export function cardAriaLabel(card: Card): string {
  const rank = RANK_NAMES[card.rank] ?? card.rank;
  return `${rank} ${uz.suits[card.suit]}`;
}

interface FaceProps {
  card: Card;
  size?: CardSize;
  settings?: Pick<RoomSettings, 'queenRule'>;
  className?: string;
}

export function CardFace({ card, size = 'md', settings, className = '' }: FaceProps) {
  const red = isRed(card.suit);
  const sym = suitSymbol(card.suit);
  const detailed = size !== 'xs' && size !== 'sm';
  const badge = specialBadge(card, settings);
  const isFace = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
  const kingOfSpades = card.rank === 'K' && card.suit === 'S';

  return (
    <div
      role="img"
      aria-label={cardAriaLabel(card)}
      data-card-id={card.id}
      className={`card-face relative select-none overflow-hidden rounded-[0.7em] ${SIZE_CLASSES[size]} ${
        red ? 'text-card-red' : 'text-card-black'
      } ${className}`}
    >
      {/* corners */}
      <div className="absolute left-[0.45em] top-[0.35em] flex flex-col items-center leading-none">
        <span className="font-display text-[1.55em] font-bold tracking-tighter">{card.rank}</span>
        <span className="text-[1.3em] -mt-[0.05em]">{sym}</span>
      </div>
      {detailed && (
        <div className="absolute bottom-[0.35em] right-[0.45em] flex rotate-180 flex-col items-center leading-none">
          <span className="font-display text-[1.55em] font-bold tracking-tighter">{card.rank}</span>
          <span className="text-[1.3em] -mt-[0.05em]">{sym}</span>
        </div>
      )}
      {badge && detailed && (
        <span
          className={`absolute right-[0.4em] top-[0.4em] rounded-full px-[0.45em] py-[0.1em] text-[0.95em] font-bold leading-none ${
            kingOfSpades || card.rank === '7' || card.rank === '6' ? 'bg-card-red text-white' : 'bg-gold-500 text-wood-900'
          }`}
        >
          {badge}
        </span>
      )}

      {/* centre */}
      {!detailed ? (
        <div className="absolute inset-0 flex items-end justify-end p-[0.5em]">
          <span className="text-[2.6em] leading-none">{sym}</span>
        </div>
      ) : PIPS[card.rank] ? (
        <div className="absolute inset-x-[24%] inset-y-[17%]">
          {PIPS[card.rank]!.map(([x, y], i) => (
            <span
              key={i}
              className="absolute text-[1.75em] leading-none"
              style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%)${y > 55 ? ' rotate(180deg)' : ''}` }}
            >
              {sym}
            </span>
          ))}
        </div>
      ) : isFace ? (
        <div
          className={`absolute inset-x-[19%] inset-y-[16%] flex flex-col items-center justify-center rounded-[0.4em] border-[0.12em] border-gold-500/80 ${
            red ? 'bg-linear-to-b from-rose-50 to-amber-50' : 'bg-linear-to-b from-slate-50 to-amber-50'
          } shadow-[inset_0_0_0_0.2em_rgba(255,255,255,0.8)]`}
        >
          {card.rank === 'K' ? (
            <Crown className="h-[2em] w-[2em] text-gold-600" strokeWidth={1.6} />
          ) : card.rank === 'Q' ? (
            <Gem className="h-[1.8em] w-[1.8em] text-gold-600" strokeWidth={1.6} />
          ) : (
            <Swords className="h-[1.8em] w-[1.8em] text-gold-600" strokeWidth={1.6} />
          )}
          <span className="font-display text-[2.6em] font-bold leading-none">{card.rank}</span>
          <span className="text-[1.6em] leading-none">{sym}</span>
        </div>
      ) : (
        // Ace
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`leading-none ${card.suit === 'S' ? 'text-[5em]' : 'text-[4.2em]'} drop-shadow-sm`}>{sym}</span>
        </div>
      )}
    </div>
  );
}

export function CardBack({ size = 'md', className = '' }: { size?: CardSize; className?: string }) {
  return (
    <div aria-hidden className={`card-back relative select-none overflow-hidden rounded-[0.7em] ${SIZE_CLASSES[size]} ${className}`}>
      <div className="absolute inset-[0.35em] rounded-[0.45em] border-[0.1em] border-gold-400/70" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full border-[0.12em] border-gold-400/80 bg-wood-900/70 px-[0.5em] py-[0.25em] font-display text-[1.2em] font-bold text-gold-300">
          108
        </span>
      </div>
    </div>
  );
}
