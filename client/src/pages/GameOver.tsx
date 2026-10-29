import { motion } from 'framer-motion';
import { LogOut, RotateCcw, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import type { ClientState } from '../../../shared/types/index.ts';
import { Avatar } from '../components/Avatar.tsx';
import { Confetti } from '../components/Confetti.tsx';
import { Button } from '../components/ui.tsx';
import { uz } from '../i18n/uz.ts';
import { leaveRoom, restartGame, returnToLobby } from '../socket/actions.ts';

export function GameOver({ state }: { state: ClientState }) {
  const { room, game, you } = state;
  const [busy, setBusy] = useState(false);
  if (!game) return null;
  const isHost = room.hostId === you.playerId;
  const winnerId = game.winnerId;
  const youWon = winnerId === you.playerId;
  const winnerName = game.results?.find((r) => r.isWinner)?.name ?? '';
  const playerById = (id: string) => room.players.find((p) => p.id === id);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Confetti />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
        className="wood-frame relative z-50 w-full max-w-md"
        initial={{ scale: 0.7, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.15 }}
      >
        <div className="felt-panel rounded-[1.1rem] p-6 text-center">
          <motion.div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-b from-gold-300 to-gold-600 shadow-[0_0_40px_rgba(230,195,92,0.6)]"
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', delay: 0.35 }}
          >
            <Trophy className="h-10 w-10 text-wood-900" />
          </motion.div>
          <div className="mt-4 text-xs uppercase tracking-[0.3em] text-gold-400">{uz.over.title}</div>
          <h2 id="game-over-title" className="title-gold mt-1 font-display text-3xl font-black">
            {youWon ? uz.over.youWon : uz.over.winner(winnerName)}
          </h2>
          {game.winReason && <p className="mt-1 text-sm text-white/65">{uz.over.reasons[game.winReason]}</p>}

          <div className="mt-5 text-left">
            <div className="mb-2 text-sm font-semibold text-gold-200">{uz.over.results}</div>
            <ol className="space-y-1.5">
              {(game.results ?? []).map((r, i) => {
                const p = playerById(r.playerId);
                return (
                  <li key={r.playerId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ${r.isWinner ? 'bg-gold-500/15 ring-gold-400/60' : 'bg-black/25 ring-white/10'}`}>
                    <span className="w-5 text-center font-display font-bold text-gold-300">{i + 1}</span>
                    <Avatar name={r.name} avatar={p?.avatar ?? i} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">
                        {r.name} {r.playerId === you.playerId && <span className="text-xs text-gold-300">({uz.common.you})</span>}
                      </div>
                      <div className="text-xs text-white/55">
                        {uz.over.cardsLeft(r.cardsLeft)}
                        {p && p.wins > 0 && ` · ${uz.lobby.wins(p.wins)}`}
                      </div>
                    </div>
                    {r.isWinner && <Trophy className="h-5 w-5 text-gold-400" />}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-6 grid gap-2">
            {isHost ? (
              <>
                <Button className="w-full py-3.5" icon={<RotateCcw className="h-5 w-5" />} disabled={busy || room.players.length < 2} onClick={() => run(restartGame)}>
                  {uz.over.playAgain}
                </Button>
                <Button variant="felt" className="w-full" icon={<Users className="h-5 w-5" />} disabled={busy} onClick={() => run(returnToLobby)}>
                  {uz.over.toLobby}
                </Button>
              </>
            ) : (
              <p className="py-2 text-sm text-white/70">{uz.over.waitHost}</p>
            )}
            <Button variant="ghost" className="w-full" icon={<LogOut className="h-4 w-4" />} onClick={() => void leaveRoom()}>
              {uz.lobby.leave}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
