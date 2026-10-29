import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../shared/constants/index.ts';
import { secureRandomInt } from '../shared/rules/index.ts';
import type { RoomSettings } from '../shared/types/index.ts';
import {
  autoResolveTurn,
  canPass,
  countAllCards,
  createGame,
  drawCard,
  passTurn,
  playableCardIds,
  playCard,
  removePlayer,
  type EngineState,
} from '../server/src/game/engine.ts';
import { card, handOf, setupGame, turnOf } from './helpers.ts';

const id = (code: string) => card(code).id;

describe('createGame', () => {
  it('deals hands, flips a start card and conserves all cards', () => {
    for (const deckCount of [1, 2] as const) {
      const settings: RoomSettings = { ...DEFAULT_SETTINGS, deckCount, handSize: 6 };
      const g = createGame(['a', 'b', 'c', 'd'], settings);
      expect(g.players.every((p) => p.hand.length === 6)).toBe(true);
      expect(g.discardPile).toHaveLength(1);
      expect(g.drawPile).toHaveLength(36 * deckCount - 25);
      expect(countAllCards(g)).toBe(36 * deckCount);
      expect(g.totalCards).toBe(36 * deckCount);
      expect(g.pendingPenalty).toBeNull();
      expect(g.events[0]!.type).toBe('deal');
    }
  });

  it('rejects impossible configurations', () => {
    expect(() => createGame(['a'], DEFAULT_SETTINGS)).toThrow();
    expect(() => createGame(['a', 'b', 'c', 'd', 'e', 'f'], { ...DEFAULT_SETTINGS, handSize: 10 })).toThrow();
    expect(() => createGame(['a', 'a'], DEFAULT_SETTINGS)).toThrow();
  });

  it('starts with the requested player', () => {
    const g = createGame(['a', 'b', 'c'], DEFAULT_SETTINGS, { startIndex: 4 });
    expect(turnOf(g)).toBe('b');
  });
});

describe('turns and validation', () => {
  it('advances to the next player after a normal card', () => {
    const g = setupGame({ hands: [['9H', '8C'], ['10S', 'JC'], ['JD', '8D']], top: '9S' });
    expect(playCard(g, 'p1', id('9H'))).toEqual({ ok: true });
    expect(turnOf(g)).toBe('p2');
    expect(handOf(g, 'p1')).toEqual(['8C']);
  });

  it('rejects out-of-turn, foreign and unknown cards, and illegal moves', () => {
    const g = setupGame({ hands: [['9H', '8C'], ['10S', 'JC']], top: '9S' });
    expect(playCard(g, 'p2', id('10S'))).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });
    expect(playCard(g, 'p1', id('10S'))).toEqual({ ok: false, error: 'CARD_NOT_IN_HAND' });
    expect(playCard(g, 'p1', 'nonsense')).toEqual({ ok: false, error: 'CARD_NOT_IN_HAND' });
    expect(playCard(g, 'p1', id('8C'))).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
    expect(playCard(g, 'ghost', id('9H'))).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
    expect(turnOf(g)).toBe('p1');
    expect(handOf(g, 'p1')).toEqual(['9H', '8C']);
  });

  it('Jack has no special effect', () => {
    const g = setupGame({ hands: [['JS', '8C'], ['10S', 'JC'], ['8D', '9D']], top: '9S' });
    playCard(g, 'p1', id('JS'));
    expect(turnOf(g)).toBe('p2');
    expect(g.pendingPenalty).toBeNull();
    expect(playableCardIds(g, 'p2')).toEqual([id('10S'), id('JC')]);
  });
});

describe('Six — draw one, stackable', () => {
  it('accumulates +1 per six and the player who cannot answer draws the total', () => {
    const g = setupGame({
      hands: [['6H', '9C'], ['6S', '9D'], ['6C', '10D'], ['8D', 'JS']],
      top: '9H',
    });
    playCard(g, 'p1', id('6H'));
    expect(g.pendingPenalty).toMatchObject({ kind: '6', amount: 1 });
    playCard(g, 'p2', id('6S'));
    expect(g.pendingPenalty).toMatchObject({ kind: '6', amount: 2 });
    playCard(g, 'p3', id('6C'));
    expect(g.pendingPenalty).toMatchObject({ kind: '6', amount: 3, chainLength: 3 });

    expect(turnOf(g)).toBe('p4');
    expect(playCard(g, 'p4', id('8D'))).toEqual({ ok: false, error: 'MUST_RESPOND_TO_PENALTY' });
    expect(passTurn(g, 'p4')).toEqual({ ok: false, error: 'MUST_RESPOND_TO_PENALTY' });
    expect(drawCard(g, 'p4')).toEqual({ ok: true });
    expect(handOf(g, 'p4')).toHaveLength(5);
    expect(g.pendingPenalty).toBeNull();
    expect(turnOf(g)).toBe('p1');
    expect(g.events.at(-1)).toMatchObject({ type: 'penalty', playerId: 'p4', count: 3, reason: 'six' });
  });

  it('a single six makes the next player draw one', () => {
    const g = setupGame({ hands: [['6H', '9C'], ['8S', '9D']], top: '9H' });
    playCard(g, 'p1', id('6H'));
    drawCard(g, 'p2');
    expect(handOf(g, 'p2')).toHaveLength(3);
    expect(turnOf(g)).toBe('p1');
  });

  it('six and seven chains are separate by default', () => {
    const g = setupGame({ hands: [['6H', '9C'], ['7H', '9D']], top: '9H' });
    playCard(g, 'p1', id('6H'));
    expect(playCard(g, 'p2', id('7H'))).toEqual({ ok: false, error: 'MUST_RESPOND_TO_PENALTY' });
  });

  it('chains may be mixed when the room enables it', () => {
    const g = setupGame({ hands: [['6H', '9C'], ['7H', '9D'], ['8S', '8C']], top: '9H', settings: { mixPenaltyChains: true } });
    playCard(g, 'p1', id('6H'));
    expect(playCard(g, 'p2', id('7H'))).toEqual({ ok: true });
    expect(g.pendingPenalty).toMatchObject({ kind: '7', amount: 3 });
  });
});

describe('Seven — draw two, stackable', () => {
  it('accumulates +2 per seven', () => {
    const g = setupGame({ hands: [['7H', '9C'], ['7S', '9D'], ['7C', '10D'], ['8D', 'JS']], top: '9H' });
    playCard(g, 'p1', id('7H'));
    expect(g.pendingPenalty?.amount).toBe(2);
    playCard(g, 'p2', id('7S'));
    expect(g.pendingPenalty?.amount).toBe(4);
    playCard(g, 'p3', id('7C'));
    expect(g.pendingPenalty?.amount).toBe(6);
    drawCard(g, 'p4');
    expect(handOf(g, 'p4')).toHaveLength(8);
    expect(g.events.at(-1)).toMatchObject({ type: 'penalty', count: 6, reason: 'seven' });
  });

  it('a seven may answer a seven of another suit', () => {
    const g = setupGame({ hands: [['7H', '9C'], ['7D', '9D']], top: '9H' });
    playCard(g, 'p1', id('7H'));
    expect(playCard(g, 'p2', id('7D'))).toEqual({ ok: true });
    expect(turnOf(g)).toBe('p1');
    expect(g.pendingPenalty?.amount).toBe(4);
  });
});

describe('King of Spades — draw five, not stackable', () => {
  it('the next player draws five immediately and loses the turn', () => {
    const g = setupGame({ hands: [['KS', '9C'], ['KS@1', '9D'], ['8S', '10D']], top: '9S', settings: { deckCount: 2 } });
    playCard(g, 'p1', id('KS'));
    expect(handOf(g, 'p2')).toHaveLength(7);
    expect(g.pendingPenalty).toBeNull();
    expect(turnOf(g)).toBe('p3');
    expect(g.events.at(-1)).toMatchObject({ type: 'penalty', playerId: 'p2', count: 5, reason: 'king-spades' });
  });

  it('cannot be passed on: the victim never gets to answer with another K♠', () => {
    const g = setupGame({ hands: [['KS', '9C'], ['KS@1', '9D']], top: '9S', settings: { deckCount: 2 } });
    playCard(g, 'p1', id('KS'));
    expect(turnOf(g)).toBe('p1'); // two players: back to the K♠ player
    expect(playCard(g, 'p2', id('KS@1'))).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });
    expect(handOf(g, 'p2')).toHaveLength(7);
  });

  it('other Kings are normal', () => {
    const g = setupGame({ hands: [['KH', '9C'], ['8S', '9D'], ['8C', '10D']], top: '9H' });
    playCard(g, 'p1', id('KH'));
    expect(handOf(g, 'p2')).toHaveLength(2);
    expect(turnOf(g)).toBe('p2');
  });
});

describe('Ace — skip', () => {
  it('skips the next player', () => {
    const g = setupGame({ hands: [['AH', '9C'], ['8S', '9D'], ['8C', '10D']], top: '9H' });
    playCard(g, 'p1', id('AH'));
    expect(turnOf(g)).toBe('p3');
    expect(g.events.at(-1)).toMatchObject({ type: 'skip', playerId: 'p2' });
  });

  it('returns the turn to the Ace player in a two-player game', () => {
    const g = setupGame({ hands: [['AH', '10H'], ['8S', '9D']], top: '9H' });
    playCard(g, 'p1', id('AH'));
    expect(turnOf(g)).toBe('p1');
    expect(g.hasDrawnThisTurn).toBe(false);
  });
});

describe('Queen', () => {
  it('mode A (default): the next player may play any card', () => {
    const g = setupGame({ hands: [['QH', '9C'], ['8S', '10C']], top: '9H' });
    playCard(g, 'p1', id('QH'));
    expect(playableCardIds(g, 'p2').sort()).toEqual([id('10C'), id('8S')].sort());
    expect(playCard(g, 'p2', id('8S'))).toEqual({ ok: true });
  });

  it('mode B: requires a suit and enforces it for the next card', () => {
    const g = setupGame({ hands: [['QH', '9C'], ['8H', '10C'], ['9S', '9D']], top: '9H', settings: { queenRule: 'choose-suit' } });
    expect(playCard(g, 'p1', id('QH'))).toEqual({ ok: false, error: 'SUIT_REQUIRED' });
    expect(playCard(g, 'p1', id('QH'), 'C')).toEqual({ ok: true });
    expect(g.activeSuit).toBe('C');
    expect(playCard(g, 'p2', id('8H'))).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
    expect(playCard(g, 'p2', id('10C'))).toEqual({ ok: true });
    expect(g.activeSuit).toBeNull();
    expect(g.events.find((e) => e.type === 'play' && e.chosenSuit === 'C')).toBeDefined();
  });

  it('mode B: rejects an invalid suit value', () => {
    const g = setupGame({ hands: [['QH', '9C'], ['8H', '10C']], top: '9H', settings: { queenRule: 'choose-suit' } });
    expect(playCard(g, 'p1', id('QH'), 'X' as never)).toEqual({ ok: false, error: 'INVALID_INPUT' });
  });
});

describe('drawing and passing', () => {
  it('one draw per turn; pass only after drawing', () => {
    const g = setupGame({ hands: [['8C', '9C'], ['8S', '9D']], top: '10H', draw: ['10C'] });
    expect(canPass(g, 'p1')).toBe(false);
    expect(passTurn(g, 'p1')).toEqual({ ok: false, error: 'MUST_DRAW_FIRST' });
    drawCard(g, 'p1');
    expect(handOf(g, 'p1')).toEqual(['8C', '9C', '10C']);
    expect(turnOf(g)).toBe('p1'); // 10C is playable, so the player keeps the turn
    expect(drawCard(g, 'p1')).toEqual({ ok: false, error: 'ALREADY_DRAWN' });
    expect(passTurn(g, 'p1')).toEqual({ ok: true });
    expect(turnOf(g)).toBe('p2');
  });

  it('passes automatically when the drawn card does not help', () => {
    const g = setupGame({ hands: [['8C', '9C'], ['8S', '9D']], top: '10H', draw: ['JS'] });
    drawCard(g, 'p1');
    expect(turnOf(g)).toBe('p2');
    expect(g.events.at(-1)).toMatchObject({ type: 'pass', playerId: 'p1', auto: true });
  });

  it('reshuffles the discard pile (keeping the top card) when the draw pile is empty', () => {
    const g = setupGame({ hands: [['8C', '9C'], ['8S', '9D']], top: '10H', restToDiscard: true });
    expect(g.drawPile).toHaveLength(0);
    const discardBefore = g.discardPile.length;
    drawCard(g, 'p1');
    expect(g.discardPile).toHaveLength(1);
    expect(g.discardPile[0]!.id).toBe(id('10H'));
    expect(g.drawPile).toHaveLength(discardBefore - 2);
    expect(g.events.some((e) => e.type === 'reshuffle')).toBe(true);
    expect(countAllCards(g)).toBe(36);
  });

  it('a penalty draws only what is available when the piles run out', () => {
    const g = setupGame({ hands: [['7H', '9C'], ['8S', '9D']], top: '9H' });
    g.drawPile = []; // synthetic position: nothing left to draw
    playCard(g, 'p1', id('7H')); // discard is now 9H, 7H → only 9H can be reshuffled
    expect(drawCard(g, 'p2')).toEqual({ ok: true });
    expect(handOf(g, 'p2')).toEqual(['8S', '9D', '9H']);
    expect(g.events.at(-1)).toMatchObject({ type: 'penalty', count: 1, reason: 'seven' });
    expect(g.pendingPenalty).toBeNull();
    expect(turnOf(g)).toBe('p1');
  });
});

describe('winning', () => {
  it('a player who plays the last card wins; the card effect is not applied', () => {
    const g = setupGame({ hands: [['7H'], ['8S', '9D']], top: '9H' });
    playCard(g, 'p1', id('7H'));
    expect(g.status).toBe('finished');
    expect(g.winnerId).toBe('p1');
    expect(g.winReason).toBe('empty-hand');
    expect(g.pendingPenalty).toBeNull();
    expect(g.results![0]).toEqual({ playerId: 'p1', cardsLeft: 0 });
    expect(drawCard(g, 'p2')).toEqual({ ok: false, error: 'GAME_NOT_ACTIVE' });
  });

  it('a final K♠ does not punish the next player', () => {
    const g = setupGame({ hands: [['KS'], ['8S', '9D']], top: '9S' });
    playCard(g, 'p1', id('KS'));
    expect(g.winnerId).toBe('p1');
    expect(handOf(g, 'p2')).toHaveLength(2);
  });

  it('stalemate: when nobody can play or draw, fewest cards wins', () => {
    const g = setupGame({ hands: [['8C', '9C'], ['8S']], top: '10H' });
    g.drawPile = []; // synthetic position: nothing left to draw
    expect(canPass(g, 'p1')).toBe(true);
    expect(drawCard(g, 'p1')).toEqual({ ok: true }); // nothing to draw → auto pass (idle 1)
    expect(turnOf(g)).toBe('p2');
    expect(drawCard(g, 'p2')).toEqual({ ok: true }); // idle 2 = all players
    expect(g.status).toBe('finished');
    expect(g.winnerId).toBe('p2');
    expect(g.winReason).toBe('stalemate');
  });
});

describe('players leaving and auto-resolve', () => {
  it('returns the leaving player cards to the draw pile and keeps the turn order valid', () => {
    const g = setupGame({ hands: [['8C', '9C'], ['8S', '9D'], ['10C', 'JC']], top: '10H', current: 1 });
    removePlayer(g, 'p2');
    expect(g.players.map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(turnOf(g)).toBe('p3');
    expect(countAllCards(g)).toBe(36);
    expect(g.events.at(-1)).toMatchObject({ type: 'player-left', playerId: 'p2', returnedCards: 2 });
  });

  it('removing a player before the current one keeps the same current player', () => {
    const g = setupGame({ hands: [['8C'], ['8S'], ['10C']], top: '10H', current: 2 });
    removePlayer(g, 'p1');
    expect(turnOf(g)).toBe('p3');
  });

  it('the last remaining player wins', () => {
    const g = setupGame({ hands: [['8C'], ['8S']], top: '10H' });
    removePlayer(g, 'p1');
    expect(g.status).toBe('finished');
    expect(g.winnerId).toBe('p2');
    expect(g.winReason).toBe('last-player');
  });

  it('autoResolveTurn takes the penalty but never plays a card', () => {
    const g = setupGame({ hands: [['6H', '9C'], ['6S', '9D'], ['8C', '10D']], top: '9H' });
    playCard(g, 'p1', id('6H'));
    autoResolveTurn(g); // p2 holds a 6 but must not have it played automatically
    expect(handOf(g, 'p2')).toHaveLength(3);
    expect(handOf(g, 'p2')).toContain('6S');
    expect(turnOf(g)).toBe('p3');
  });

  it('autoResolveTurn draws then passes without a penalty', () => {
    const g = setupGame({ hands: [['8C', '9C'], ['8S', '9D']], top: '9H', draw: ['10H'] });
    autoResolveTurn(g);
    expect(handOf(g, 'p1')).toEqual(['8C', '9C', '10H']);
    expect(turnOf(g)).toBe('p2');
  });
});

describe('card conservation (randomised full games)', () => {
  function playRandomGame(settings: RoomSettings, players: number): EngineState {
    const ids = Array.from({ length: players }, (_, i) => `p${i}`);
    const g = createGame(ids, settings);
    for (let step = 0; step < 3000 && g.status === 'playing'; step++) {
      const cur = g.players[g.currentIndex]!;
      const options = playableCardIds(g, cur.id);
      const roll = secureRandomInt(10);
      if (options.length && roll < 8) {
        const cardId = options[secureRandomInt(options.length)]!;
        const r = playCard(g, cur.id, cardId, (['S', 'H', 'D', 'C'] as const)[secureRandomInt(4)]);
        expect(r.ok).toBe(true);
      } else if (canPass(g, cur.id)) {
        expect(passTurn(g, cur.id).ok).toBe(true);
      } else {
        expect(drawCard(g, cur.id).ok).toBe(true);
      }
      expect(countAllCards(g)).toBe(g.totalCards);
      const ids2 = [...g.drawPile, ...g.discardPile, ...g.players.flatMap((p) => p.hand)].map((c) => c.id);
      expect(new Set(ids2).size).toBe(g.totalCards);
    }
    return g;
  }

  it('never loses or duplicates cards with one or two decks and every rule variant', () => {
    const variants: Partial<RoomSettings>[] = [
      {},
      { deckCount: 2, handSize: 8 },
      { queenRule: 'choose-suit' },
      { matchRule: 'suit-only', mixPenaltyChains: true },
    ];
    let finished = 0;
    for (const v of variants) {
      for (let i = 0; i < 25; i++) {
        const players = 2 + (i % 5);
        const g = playRandomGame({ ...DEFAULT_SETTINGS, ...v }, players);
        if (g.status === 'finished') finished++;
      }
    }
    expect(finished).toBeGreaterThan(80);
  });
});
