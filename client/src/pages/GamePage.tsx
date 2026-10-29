import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowDownToLine, BookOpen, Hand as HandIcon, LogOut, ScrollText, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { checkPlay, penaltyValue } from '../../../shared/rules/index.ts';
import type { Card, CardSuit, ClientState, GameEvent, PublicPlayer } from '../../../shared/types/index.ts';
import { Avatar } from '../components/Avatar.tsx';
import { RulesContent } from '../components/RulesContent.tsx';
import { CenterPiles } from '../components/table/CenterPiles.tsx';
import { Flyers, type Flyer } from '../components/table/Flyers.tsx';
import { GameLog } from '../components/table/GameLog.tsx';
import { Hand } from '../components/table/Hand.tsx';
import { OpponentSeat, type Bubble } from '../components/table/OpponentSeat.tsx';
import { SuitPicker } from '../components/table/SuitPicker.tsx';
import { Button, Modal } from '../components/ui.tsx';
import { useElementSize } from '../hooks/useElementSize.ts';
import { useEventFeed } from '../hooks/useEventFeed.ts';
import { errorText, uz } from '../i18n/uz.ts';
import { drawCard, leaveRoom, passTurn, playCard } from '../socket/actions.ts';
import { playSound } from '../socket/sounds.ts';
import { toast } from '../store/appStore.ts';
import { setPrefs, usePrefs } from '../store/preferences.ts';
import { sortHand, suitSymbol } from '../utils/cards.ts';
import { DISCARD_POS, DRAW_PILE_POS, MY_SEAT_POS, opponentsAfter, seatPositions, type Point } from '../utils/seats.ts';
import { GameOver } from './GameOver.tsx';

interface BannerState {
  id: number;
  text: string;
  tone: 'bad' | 'gold' | 'info';
}

let fxSeq = 0;

export function GamePage({ state }: { state: ClientState }) {
  const { room, you } = state;
  const game = state.game!;
  const settings = room.settings;
  const sound = usePrefs((p) => p.sound);
  const sortMode = usePrefs((p) => p.sortHand);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suitFor, setSuitFor] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [modal, setModal] = useState<'rules' | 'leave' | 'log' | null>(null);
  const [tableRef, tableSize] = useElementSize<HTMLDivElement>();

  // ----- derived -----
  const playersById = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nameOf = useCallback(
    (id: string) => playersById.get(id)?.name ?? game.results?.find((r) => r.playerId === id)?.name ?? '—',
    [playersById, game.results],
  );
  const seatOrder = game.seatOrder.filter((id) => playersById.has(id));
  const opponents = opponentsAfter(seatOrder, you.playerId)
    .map((id) => playersById.get(id))
    .filter((p): p is PublicPlayer => !!p);
  const positions = seatPositions(opponents.length);
  const seatPos = new Map<string, Point>(opponents.map((p, i) => [p.id, positions[i]!]));
  seatPos.set(you.playerId, MY_SEAT_POS);
  const me = playersById.get(you.playerId);
  const hand = useMemo(() => sortHand(game.hand, sortMode), [game.hand, sortMode]);
  const playable = useMemo(() => new Set(game.playableCardIds), [game.playableCardIds]);
  const turnPlayer = game.turnPlayerId ? playersById.get(game.turnPlayerId) : undefined;
  const finished = room.status === 'finished';

  // Where the current top card came from (for the fly-in animation).
  const lastPlay = [...game.events].reverse().find((e): e is Extract<GameEvent, { type: 'play' }> => e.type === 'play');
  const originPos = lastPlay ? seatPos.get(lastPlay.playerId) : undefined;
  const playOrigin = originPos
    ? { x: ((originPos.x - DISCARD_POS.x) / 100) * tableSize.width, y: ((originPos.y - DISCARD_POS.y) / 100) * tableSize.height }
    : null;

  // ----- effects from server events -----
  const showBanner = (text: string, tone: BannerState['tone']) => {
    const id = ++fxSeq;
    setBanner({ id, text, tone });
    setTimeout(() => setBanner((b) => (b?.id === id ? null : b)), 1600);
  };
  const showBubble = (playerId: string, text: string, tone: Bubble['tone']) => {
    const id = ++fxSeq;
    setBubbles((b) => ({ ...b, [playerId]: { id, text, tone } }));
    setTimeout(
      () =>
        setBubbles((b) => {
          if (b[playerId]?.id !== id) return b;
          const next = { ...b };
          delete next[playerId];
          return next;
        }),
      1500,
    );
  };
  const fly = (playerId: string, count: number) => {
    const to = seatPos.get(playerId);
    if (!to) return;
    const items: Flyer[] = Array.from({ length: Math.min(count, 6) }, (_, i) => ({ id: ++fxSeq, from: DRAW_PILE_POS, to, delay: i * 0.09 }));
    setFlyers((f) => [...f, ...items]);
  };

  useEventFeed(game, (events) => {
    for (const e of events) {
      switch (e.type) {
        case 'play': {
          playSound('card');
          const { card } = e;
          if (card.rank === '6' || card.rank === '7') {
            showBanner(uz.banners.plus(game.pendingPenalty?.amount ?? penaltyValue(card.rank)), 'bad');
          } else if (card.rank === 'Q') {
            showBanner(e.chosenSuit ? uz.banners.suitChosen(`${suitSymbol(e.chosenSuit)} ${uz.suits[e.chosenSuit]}`) : uz.banners.freePlay, 'gold');
          }
          break;
        }
        case 'penalty':
          playSound('penalty');
          fly(e.playerId, e.count);
          showBubble(e.playerId, `+${e.count}`, 'bad');
          showBanner(e.reason === 'king-spades' ? uz.banners.kingSpades : uz.banners.drew(e.playerId === you.playerId ? uz.common.you : nameOf(e.playerId), e.count), 'bad');
          break;
        case 'draw':
          playSound('draw');
          fly(e.playerId, e.count);
          showBubble(e.playerId, `+${e.count}`, 'info');
          break;
        case 'skip':
          showBubble(e.playerId, '⤼', 'info');
          showBanner(uz.banners.skip(e.playerId === you.playerId ? uz.common.you : nameOf(e.playerId)), 'gold');
          break;
        case 'pass':
          showBubble(e.playerId, uz.game.pass, 'info');
          break;
        case 'reshuffle':
          showBanner(uz.banners.reshuffle, 'info');
          break;
        case 'player-left':
          toast(`${nameOf(e.playerId)} o‘yindan chiqdi`, 'info');
          break;
        case 'win':
          playSound('win');
          break;
        case 'deal':
          break;
      }
    }
  });

  // Turn notification + clear stale selection.
  const prevTurn = useRef(game.isYourTurn);
  useEffect(() => {
    if (game.isYourTurn && !prevTurn.current) playSound('turn');
    prevTurn.current = game.isYourTurn;
  }, [game.isYourTurn, game.turnNumber]);
  useEffect(() => {
    if (selectedId && !game.hand.some((c) => c.id === selectedId)) setSelectedId(null);
  }, [game.hand, selectedId]);

  // ----- actions -----
  const ctx = { topCard: game.topCard, activeSuit: game.activeSuit, pendingPenalty: game.pendingPenalty };

  const send = async (cardId: string, suit?: CardSuit) => {
    setBusy(true);
    const r = await playCard(cardId, suit);
    setBusy(false);
    if (r.ok) setSelectedId(null);
  };

  const tryPlay = (card: Card) => {
    if (busy || finished) return;
    if (!game.isYourTurn) {
      toast(errorText('NOT_YOUR_TURN'));
      playSound('error');
      return;
    }
    const check = checkPlay(card, ctx, settings);
    if (!check.ok) {
      toast(errorText(check.reason));
      playSound('error');
      return;
    }
    if (card.rank === 'Q' && settings.queenRule === 'choose-suit' && game.hand.length > 1) {
      setSuitFor(card);
      return;
    }
    void send(card.id);
  };

  const onCardClick = (card: Card) => {
    if (selectedId === card.id) tryPlay(card);
    else setSelectedId(card.id);
  };

  const onDraw = async () => {
    if (busy || finished) return;
    if (!game.isYourTurn) {
      toast(errorText('NOT_YOUR_TURN'));
      return;
    }
    if (!game.canDraw) {
      toast(errorText('ALREADY_DRAWN'));
      return;
    }
    setBusy(true);
    await drawCard();
    setBusy(false);
  };

  const onPass = async () => {
    if (busy || !game.canPass) return;
    setBusy(true);
    await passTurn();
    setBusy(false);
  };

  // Keyboard: Enter plays the selected card, Escape clears the selection, D draws.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if (modal || suitFor || (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName))) return;
    if (e.key === 'Escape') setSelectedId(null);
    if (e.key === 'Enter' && selectedId) {
      const c = game.hand.find((h) => h.id === selectedId);
      if (c) tryPlay(c);
    }
    if (e.key.toLowerCase() === 'd') void onDraw();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ----- status line -----
  let status: string;
  if (finished) status = uz.over.title;
  else if (!game.isYourTurn) {
    status = turnPlayer && !turnPlayer.connected ? uz.game.offlineTurn(turnPlayer.name) : uz.game.waitingFor(turnPlayer?.name ?? '…');
  } else if (game.pendingPenalty) {
    status = uz.game.penaltyPrompt(game.pendingPenalty.amount, settings.mixPenaltyChains ? '6/7' : game.pendingPenalty.kind);
  } else if (game.playableCardIds.length === 0) {
    status = game.canPass ? uz.game.playOrPass : uz.game.noPlayable;
  } else status = game.hasDrawnThisTurn ? uz.game.playOrPass : uz.game.selectCard;

  const selected = selectedId ? game.hand.find((c) => c.id === selectedId) : undefined;

  return (
    <LayoutGroup>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* header */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-3 sm:h-14 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="title-gold font-display text-lg font-black tracking-wider sm:text-xl">108</span>
            <span className="truncate rounded-full bg-black/35 px-2.5 py-1 font-mono text-xs tracking-widest text-gold-200 ring-1 ring-gold-500/30">
              {uz.game.room}: {room.code}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <IconButton label={uz.game.log} onClick={() => setModal('log')} className="lg:hidden">
              <ScrollText className="h-5 w-5" />
            </IconButton>
            <IconButton label={uz.menu.rules} onClick={() => setModal('rules')}>
              <BookOpen className="h-5 w-5" />
            </IconButton>
            <IconButton label={uz.settings.sound} onClick={() => setPrefs({ sound: !sound })}>
              {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </IconButton>
            <IconButton label={uz.game.leave} onClick={() => setModal('leave')}>
              <LogOut className="h-5 w-5" />
            </IconButton>
          </div>
        </header>

        {/* table */}
        <div className="min-h-0 flex-1 px-2 pb-1 sm:px-6">
          <div className="wood-rim h-full">
            <div ref={tableRef} className="felt relative h-full overflow-visible">
              {opponents.map((p, i) => (
                <OpponentSeat key={p.id} player={p} pos={positions[i]!} isTurn={game.turnPlayerId === p.id && !finished} bubble={bubbles[p.id]} />
              ))}

              <CenterPiles game={game} settings={settings} myId={you.playerId} playOrigin={playOrigin} onDraw={onDraw} />

              <Flyers flyers={flyers} size={tableSize} onDone={(id) => setFlyers((f) => f.filter((x) => x.id !== id))} />

              <AnimatePresence>
                {banner && (
                  <motion.div
                    key={banner.id}
                    className="pointer-events-none absolute inset-x-0 top-[24%] z-40 flex justify-center px-4"
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  >
                    <div
                      className={`rounded-2xl px-5 py-2.5 text-center font-display text-xl font-black shadow-2xl ring-2 sm:text-3xl ${
                        banner.tone === 'bad'
                          ? 'bg-card-red/95 text-white ring-white/30'
                          : banner.tone === 'gold'
                            ? 'btn-gold text-wood-900 ring-white/40'
                            : 'bg-wood-900/90 text-gold-100 ring-gold-500/50'
                      }`}
                    >
                      {banner.text}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-3 right-4 z-10 hidden w-64 rounded-xl bg-black/30 p-2 ring-1 ring-white/10 lg:block">
                <div className="mb-1 px-2 text-[11px] uppercase tracking-wider text-gold-400">{uz.game.log}</div>
                <GameLog events={game.events} nameOf={nameOf} youId={you.playerId} limit={6} />
              </div>
            </div>
          </div>
        </div>

        {/* me: status, actions, hand */}
        <div className={`relative shrink-0 px-2 pt-1 transition-colors sm:px-6 ${game.isYourTurn && !finished ? 'my-turn-glow' : ''}`}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {me && <Avatar name={me.name} avatar={me.avatar} size="sm" active={game.isYourTurn && !finished} host={me.isHost} />}
              <div className="min-w-0">
                <div className={`truncate text-sm font-bold ${game.isYourTurn && !finished ? 'text-gold-300' : 'text-white'}`}>
                  {game.isYourTurn && !finished ? uz.game.yourTurn : (me?.name ?? '')}
                </div>
                <div className="truncate text-xs text-white/70" role="status">
                  {status}
                </div>
              </div>
              <AnimatePresence>
                {bubbles[you.playerId] && (
                  <motion.span
                    key={bubbles[you.playerId]!.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${bubbles[you.playerId]!.tone === 'bad' ? 'bg-card-red text-white' : 'bg-gold-400 text-wood-900'}`}
                  >
                    {bubbles[you.playerId]!.text}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="px-3 py-2 text-sm sm:px-4"
                icon={<HandIcon className="h-4 w-4" />}
                disabled={!selected || busy || finished}
                onClick={() => selected && tryPlay(selected)}
              >
                {uz.game.play}
              </Button>
              <Button
                variant={game.pendingPenalty && game.isYourTurn ? 'danger' : 'felt'}
                className="px-3 py-2 text-sm sm:px-4"
                icon={<ArrowDownToLine className="h-4 w-4" />}
                disabled={!game.canDraw || busy || finished}
                onClick={onDraw}
              >
                {game.pendingPenalty && game.isYourTurn ? uz.game.drawPenalty(game.pendingPenalty.amount) : uz.game.draw}
              </Button>
              <Button variant="ghost" className="px-3 py-2 text-sm sm:px-4" icon={<SkipForward className="h-4 w-4" />} disabled={!game.canPass || busy || finished} onClick={onPass}>
                {uz.game.pass}
              </Button>
            </div>
          </div>

          <Hand
            key={game.matchId}
            cards={hand}
            playableIds={playable}
            selectedId={selectedId}
            isYourTurn={game.isYourTurn && !finished}
            settings={settings}
            onCardClick={onCardClick}
            animateDeal={game.turnNumber <= 2}
          />
        </div>
      </div>

      <SuitPicker
        open={!!suitFor}
        onClose={() => setSuitFor(null)}
        onPick={(s) => {
          const c = suitFor;
          setSuitFor(null);
          if (c) void send(c.id, s);
        }}
      />

      <Modal open={modal === 'rules'} onClose={() => setModal(null)} title={uz.menu.rules}>
        <RulesContent />
      </Modal>
      <Modal open={modal === 'log'} onClose={() => setModal(null)} title={uz.game.log}>
        <GameLog events={game.events} nameOf={nameOf} youId={you.playerId} limit={20} />
      </Modal>
      <Modal open={modal === 'leave'} onClose={() => setModal(null)} title={uz.game.leave}>
        <p className="text-white/80">{uz.game.leaveConfirm}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setModal(null)}>
            {uz.common.cancel}
          </Button>
          <Button variant="danger" className="flex-1" icon={<LogOut className="h-4 w-4" />} onClick={() => void leaveRoom()}>
            {uz.game.leave}
          </Button>
        </div>
      </Modal>

      {finished && <GameOver state={state} />}
    </LayoutGroup>
  );
}

function IconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-full p-2 text-gold-200 ring-1 ring-gold-500/25 transition hover:bg-white/10 ${className}`}
    >
      {children}
    </button>
  );
}
