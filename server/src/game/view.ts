import type { ClientState, PublicGameState, PublicPlayer } from '../../../shared/types/index.ts';
import type { Room } from '../rooms/types.ts';
import { canDraw, canPass, findPlayer, playableCardIds, topCard } from './engine.ts';

/**
 * Builds the payload for one viewer. Opponent hands are reduced to counts here,
 * so hidden cards never leave the server. Session tokens are never copied.
 */
export function buildClientState(room: Room, viewerId: string, now: number = Date.now()): ClientState {
  const game = room.game;
  const viewer = room.players.find((p) => p.id === viewerId);

  const players: PublicPlayer[] = room.players.map((p) => {
    const enginePlayer = game ? findPlayer(game, p.id) : undefined;
    let cardCount: number | null = null;
    if (enginePlayer) cardCount = enginePlayer.hand.length;
    else if (game?.results) cardCount = game.results.find((r) => r.playerId === p.id)?.cardsLeft ?? null;
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.id === room.hostId,
      ready: p.ready || p.id === room.hostId,
      connected: p.connected,
      cardCount,
      wins: p.wins,
    };
  });

  let publicGame: PublicGameState | null = null;
  if (game) {
    const me = findPlayer(game, viewerId);
    const turnPlayer = game.status === 'playing' ? game.players[game.currentIndex] : undefined;
    publicGame = {
      matchId: room.matchCount,
      hand: me ? me.hand.map((c) => ({ ...c })) : [],
      playableCardIds: playableCardIds(game, viewerId),
      seatOrder: room.gameSeatOrder.slice(),
      turnPlayerId: turnPlayer?.id ?? null,
      isYourTurn: turnPlayer?.id === viewerId,
      topCard: topCard(game),
      discardCount: game.discardPile.length,
      drawCount: game.drawPile.length,
      pendingPenalty: game.pendingPenalty ? { ...game.pendingPenalty } : null,
      activeSuit: game.activeSuit,
      hasDrawnThisTurn: turnPlayer?.id === viewerId ? game.hasDrawnThisTurn : false,
      canPass: canPass(game, viewerId),
      canDraw: canDraw(game, viewerId),
      turnNumber: game.turnNumber,
      turnStartedAt: game.turnStartedAt,
      totalCards: game.totalCards,
      events: game.events.map((e) => ({ ...e })),
      lastEventSeq: game.eventSeq,
      winnerId: game.winnerId,
      winReason: game.winReason,
      results: game.results
        ? game.results.map((r) => ({
            playerId: r.playerId,
            name: room.gameNames[r.playerId] ?? '?',
            cardsLeft: r.cardsLeft,
            isWinner: r.playerId === game.winnerId,
          }))
        : null,
    };
  }

  return {
    you: { playerId: viewerId, name: viewer?.name ?? '' },
    room: {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      settings: { ...room.settings },
      players,
    },
    game: publicGame,
    serverTime: now,
  };
}
