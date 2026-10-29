import { motion } from 'framer-motion';
import { Check, Copy, LogOut, Play, Share2, Users } from 'lucide-react';
import { useState } from 'react';
import { MIN_PLAYERS } from '../../../shared/constants/index.ts';
import type { ClientState, RoomSettings } from '../../../shared/types/index.ts';
import { Avatar } from '../components/Avatar.tsx';
import { SettingsForm } from '../components/SettingsForm.tsx';
import { Button, ScreenFrame } from '../components/ui.tsx';
import { uz } from '../i18n/uz.ts';
import { inviteLink, leaveRoom, setReady, startGame, updateSettings } from '../socket/actions.ts';
import { toast } from '../store/appStore.ts';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts (e.g. plain http on a LAN).
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function Lobby({ state }: { state: ClientState }) {
  const { room, you } = state;
  const me = room.players.find((p) => p.id === you.playerId);
  const isHost = room.hostId === you.playerId;
  const link = inviteLink(room.code);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const guestsReady = room.players.every((p) => p.isHost || (p.ready && p.connected));
  const enough = room.players.length >= MIN_PLAYERS;
  const startBlocker = !enough ? uz.lobby.needPlayers : !guestsReady ? uz.lobby.needReady : null;
  const emptySeats = Math.max(0, room.settings.maxPlayers - room.players.length);

  const onSettings = (patch: Partial<RoomSettings>) => {
    void updateSettings(patch);
  };

  return (
    <ScreenFrame wide>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-400">{uz.lobby.title}</div>
          <div className="mt-1 flex items-end gap-3">
            <h1 className="font-mono text-4xl font-bold tracking-[0.25em] text-gold-200 sm:text-5xl" aria-label={`${uz.common.roomCode}: ${room.code}`}>
              {room.code}
            </h1>
          </div>

          <div className="mt-5 rounded-2xl bg-black/25 p-4 ring-1 ring-gold-500/25">
            <div className="mb-2 text-sm font-medium text-gold-100/90">{uz.lobby.invite}</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2.5 font-mono text-sm text-white/80 ring-1 ring-white/10" />
              <div className="flex gap-2">
                <Button
                  className="flex-1 py-2.5 text-sm"
                  icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  onClick={async () => {
                    if (await copyText(link)) {
                      setCopied(true);
                      toast(uz.lobby.copied, 'success', 1800);
                      setTimeout(() => setCopied(false), 1800);
                    }
                  }}
                >
                  {uz.lobby.copyLink}
                </Button>
                {typeof navigator.share === 'function' && (
                  <Button
                    variant="felt"
                    className="py-2.5 text-sm"
                    icon={<Share2 className="h-4 w-4" />}
                    onClick={() => void navigator.share({ title: '108 ONLINE', text: uz.lobby.shareText(room.code), url: link }).catch(() => {})}
                  >
                    {uz.lobby.share}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gold-300">
                <Users className="h-5 w-5" /> {uz.lobby.players}
              </h2>
              <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-semibold text-gold-200 ring-1 ring-gold-500/30">
                {uz.lobby.capacity(room.players.length, room.settings.maxPlayers)}
              </span>
            </div>
            <ul className="space-y-2">
              {room.players.map((p, i) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ${p.id === you.playerId ? 'bg-gold-500/10 ring-gold-500/40' : 'bg-black/20 ring-white/10'}`}
                >
                  <Avatar name={p.name} avatar={p.avatar} size="sm" host={p.isHost} offline={!p.connected} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">
                      {p.name} {p.id === you.playerId && <span className="text-xs font-normal text-gold-300">({uz.common.you})</span>}
                    </div>
                    <div className="text-xs text-white/50">
                      {p.isHost ? uz.common.host : null}
                      {p.wins > 0 && <span className="ml-1">· {uz.lobby.wins(p.wins)}</span>}
                    </div>
                  </div>
                  {!p.connected ? (
                    <span className="rounded-full bg-red-900/60 px-2.5 py-1 text-xs text-red-100">{uz.lobby.offline}</span>
                  ) : p.ready ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-800/60 px-2.5 py-1 text-xs text-emerald-100">
                      <Check className="h-3.5 w-3.5" /> {uz.lobby.ready}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">{uz.lobby.notReady}</span>
                  )}
                </motion.li>
              ))}
              {Array.from({ length: emptySeats }, (_, i) => (
                <li key={`empty-${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-sm text-white/35">
                  <span className="h-9 w-9 rounded-full border border-dashed border-white/20" />
                  {uz.lobby.emptySeat}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="mb-3 font-display text-lg font-bold text-gold-300">{uz.lobby.settings}</h2>
          <div className="rounded-2xl bg-black/15 p-4 ring-1 ring-white/10">
            <SettingsForm value={room.settings} onChange={onSettings} disabled={!isHost} minPlayers={room.players.length} />
          </div>

          <div className="mt-6 space-y-3">
            {isHost ? (
              <>
                <Button
                  className="w-full py-4 text-lg"
                  icon={<Play className="h-5 w-5" />}
                  disabled={!!startBlocker || busy}
                  onClick={async () => {
                    setBusy(true);
                    await startGame();
                    setBusy(false);
                  }}
                >
                  {uz.lobby.start}
                </Button>
                {startBlocker && <p className="text-center text-sm text-white/60">{startBlocker}</p>}
              </>
            ) : (
              <>
                <Button className="w-full py-4 text-lg" variant={me?.ready ? 'felt' : 'gold'} icon={<Check className="h-5 w-5" />} onClick={() => void setReady(!me?.ready)}>
                  {me?.ready ? uz.lobby.cancelReady : uz.lobby.imReady}
                </Button>
                <p className="text-center text-sm text-white/60">{uz.lobby.waitingHost}</p>
              </>
            )}
            <Button variant="ghost" className="w-full" icon={<LogOut className="h-4 w-4" />} onClick={() => void leaveRoom()}>
              {uz.lobby.leave}
            </Button>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}
