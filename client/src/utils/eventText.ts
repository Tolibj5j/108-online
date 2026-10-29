import type { GameEvent } from '../../../shared/types/index.ts';
import { uz } from '../i18n/uz.ts';
import { cardLabel } from './cards.ts';

/** One-line Uzbek description of a public game event for the game log. */
export function eventText(e: GameEvent, nameOf: (id: string) => string, youId: string): string {
  const who = (id: string) => (id === youId ? uz.common.you : nameOf(id));
  /** Uzbek past-tense verb: "oldi" → "oldingiz" when the subject is the viewer. */
  const v = (id: string, verb: string) => (id === youId ? `${verb}ngiz` : verb);
  switch (e.type) {
    case 'deal':
      return `Kartalar tarqatildi (${e.handSize} tadan). Birinchi karta: ${cardLabel(e.startCard)}`;
    case 'play':
      return e.chosenSuit
        ? `${who(e.playerId)}: ${cardLabel(e.card)} — mast: ${uz.suits[e.chosenSuit]}`
        : `${who(e.playerId)}: ${cardLabel(e.card)}`;
    case 'draw':
      return `${who(e.playerId)} karta ${v(e.playerId, 'oldi')}`;
    case 'penalty':
      return `${who(e.playerId)} ${e.count} ta karta ${v(e.playerId, 'oldi')} (${uz.penaltyReasons[e.reason]})`;
    case 'skip':
      return `${who(e.playerId)}: ${uz.game.turnSkipped.toLowerCase()}`;
    case 'pass':
      return e.auto ? `${who(e.playerId)}: navbat o‘tdi` : `${who(e.playerId)} navbatni ${v(e.playerId, 'o‘tkazdi')}`;
    case 'reshuffle':
      return `${uz.banners.reshuffle} (${e.count} ta)`;
    case 'player-left':
      return `${who(e.playerId)} o‘yindan ${v(e.playerId, 'chiqdi')}`;
    case 'win':
      return e.playerId === youId ? uz.over.youWon : uz.over.winner(nameOf(e.playerId));
  }
}
