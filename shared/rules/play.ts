import { SEVEN_PENALTY, SIX_PENALTY } from '../constants/index.ts';
import type { Card, PenaltyKind, PlayContext, RoomSettings } from '../types/index.ts';

export function isKingOfSpades(card: Card): boolean {
  return card.rank === 'K' && card.suit === 'S';
}

export function penaltyKindOf(card: Card): PenaltyKind | null {
  if (card.rank === '6') return '6';
  if (card.rank === '7') return '7';
  return null;
}

export function penaltyValue(kind: PenaltyKind): number {
  return kind === '6' ? SIX_PENALTY : SEVEN_PENALTY;
}

export type PlayCheck =
  | { ok: true }
  | { ok: false; reason: 'MUST_RESPOND_TO_PENALTY' | 'ILLEGAL_MOVE' };

type RuleSettings = Pick<RoomSettings, 'queenRule' | 'matchRule' | 'mixPenaltyChains'>;

/** Single source of truth for card legality. Used by the server engine and the client highlighter. */
export function checkPlay(card: Card, ctx: PlayContext, settings: RuleSettings): PlayCheck {
  if (ctx.pendingPenalty) {
    const kind = penaltyKindOf(card);
    if (kind && (settings.mixPenaltyChains || kind === ctx.pendingPenalty.kind)) return { ok: true };
    return { ok: false, reason: 'MUST_RESPOND_TO_PENALTY' };
  }
  const top = ctx.topCard;
  if (!top) return { ok: true };
  if (top.rank === 'Q' && settings.queenRule === 'free-next') return { ok: true };
  const suitToFollow = ctx.activeSuit ?? top.suit;
  if (card.suit === suitToFollow) return { ok: true };
  if (settings.matchRule === 'rank-or-suit' && card.rank === top.rank) return { ok: true };
  return { ok: false, reason: 'ILLEGAL_MOVE' };
}

export function canPlayCard(card: Card, ctx: PlayContext, settings: RuleSettings): boolean {
  return checkPlay(card, ctx, settings).ok;
}
