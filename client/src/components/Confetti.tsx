import { motion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = ['#e6c35c', '#f3dc8a', '#c8102e', '#ffffff', '#34d399', '#60a5fa'];

export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.4 + Math.random() * 1.8,
        rotate: Math.random() * 720 - 360,
        drift: Math.random() * 120 - 60,
        color: COLORS[i % COLORS.length]!,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{ left: `${p.left}%`, width: p.w, height: p.h, background: p.color }}
          initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
