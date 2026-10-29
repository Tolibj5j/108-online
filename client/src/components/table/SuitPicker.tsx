import { SUITS } from '../../../../shared/constants/index.ts';
import type { CardSuit } from '../../../../shared/types/index.ts';
import { uz } from '../../i18n/uz.ts';
import { isRed, suitSymbol } from '../../utils/cards.ts';
import { Modal } from '../ui.tsx';

export function SuitPicker({ open, onPick, onClose }: { open: boolean; onPick: (s: CardSuit) => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={uz.game.chooseSuit}>
      <div className="grid grid-cols-2 gap-3">
        {SUITS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white py-5 shadow-lg ring-2 ring-transparent transition hover:-translate-y-0.5 hover:ring-gold-400 focus-visible:ring-gold-400"
          >
            <span className={`text-5xl leading-none ${isRed(s) ? 'text-card-red' : 'text-card-black'}`}>{suitSymbol(s)}</span>
            <span className="text-sm font-semibold text-wood-900">{uz.suits[s]}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
