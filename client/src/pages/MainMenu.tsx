import { motion } from 'framer-motion';
import { BookOpen, DoorOpen, PlusCircle, RotateCcw, Settings } from 'lucide-react';
import { useState } from 'react';
import type { Card } from '../../../shared/types/index.ts';
import { CardFace } from '../components/PlayingCard.tsx';
import { Button, SuitRow } from '../components/ui.tsx';
import { uz } from '../i18n/uz.ts';
import { resume } from '../socket/actions.ts';
import { sessions } from '../socket/session.ts';
import { goTo, useApp } from '../store/appStore.ts';

const HERO: Card[] = [
  { id: 'h1', rank: '6', suit: 'H', deckIndex: 0 },
  { id: 'h2', rank: 'K', suit: 'S', deckIndex: 0 },
  { id: 'h3', rank: 'A', suit: 'D', deckIndex: 0 },
  { id: 'h4', rank: 'Q', suit: 'C', deckIndex: 0 },
];

export function MainMenu() {
  const [remembered, setRemembered] = useState(() => sessions.remembered());
  const resuming = useApp((s) => s.resuming);
  const connected = useApp((s) => s.connection === 'connected');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="relative mb-8 h-36 w-72 sm:h-44 sm:w-96" aria-hidden>
        {HERO.map((card, i) => (
          <motion.div
            key={card.id}
            className="absolute top-2 -translate-x-1/2 origin-bottom"
            style={{ left: `calc(50% + ${(i - 1.5) * 34}px)` }}
            initial={{ opacity: 0, y: 60, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: (i - 1.5) * 14 }}
            transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 160, damping: 16 }}
          >
            <CardFace card={card} size="pile" className="shadow-2xl" />
          </motion.div>
        ))}
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="title-gold text-center font-display text-5xl font-black tracking-[0.08em] sm:text-7xl"
      >
        108 ONLINE
      </motion.h1>
      <p className="mt-3 text-center text-base text-gold-100/80 sm:text-lg">{uz.subtitle}</p>
      <SuitRow className="mt-4" />

      {remembered && (
        <div className="mt-8 w-full max-w-sm rounded-2xl bg-black/30 p-4 ring-1 ring-gold-500/30">
          <div className="text-xs uppercase tracking-wider text-gold-400">{uz.menu.resumeTitle}</div>
          <div className="mt-2 flex gap-2">
            <Button
              className="flex-1 py-2.5 text-sm"
              icon={<RotateCcw className="h-4 w-4" />}
              disabled={resuming || !connected}
              onClick={async () => {
                const r = await resume(remembered.token, true);
                if (!r.ok) setRemembered(sessions.remembered());
              }}
            >
              {uz.menu.resume(remembered.name, remembered.roomCode)}
            </Button>
            <Button
              variant="ghost"
              className="py-2.5 text-sm"
              onClick={() => {
                sessions.clear(remembered.token);
                setRemembered(null);
              }}
            >
              {uz.menu.forget}
            </Button>
          </div>
        </div>
      )}

      <nav className="mt-8 grid w-full max-w-sm gap-3">
        <Button className="py-4 text-lg" icon={<PlusCircle className="h-5 w-5" />} onClick={() => goTo('create')}>
          {uz.menu.create}
        </Button>
        <Button variant="felt" className="py-4 text-lg" icon={<DoorOpen className="h-5 w-5" />} onClick={() => goTo('join')}>
          {uz.menu.join}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" icon={<BookOpen className="h-5 w-5" />} onClick={() => goTo('rules')}>
            {uz.menu.rules}
          </Button>
          <Button variant="ghost" icon={<Settings className="h-5 w-5" />} onClick={() => goTo('settings')}>
            {uz.menu.settings}
          </Button>
        </div>
      </nav>
    </div>
  );
}
