import { motion } from 'framer-motion';
import { CardBack } from '../PlayingCard.tsx';

export interface Flyer {
  id: number;
  from: { x: number; y: number }; // percent of table box
  to: { x: number; y: number }; // percent of table box
  delay: number;
}

/** Face-down cards flying from the draw pile to a seat. Purely visual; state comes from the server. */
export function Flyers({ flyers, size, onDone }: { flyers: Flyer[]; size: { width: number; height: number }; onDone: (id: number) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-visible" aria-hidden>
      {flyers.map((f) => {
        const dx = ((f.to.x - f.from.x) / 100) * size.width;
        const dy = ((f.to.y - f.from.y) / 100) * size.height;
        return (
          <motion.div
            key={f.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${f.from.x}%`, top: `${f.from.y}%` }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={{ x: dx, y: dy, scale: 0.55, opacity: [1, 1, 0], rotate: 20 }}
            transition={{ duration: 0.6, delay: f.delay, ease: 'easeInOut' }}
            onAnimationComplete={() => onDone(f.id)}
          >
            <CardBack size="md" className="shadow-2xl" />
          </motion.div>
        );
      })}
    </div>
  );
}
