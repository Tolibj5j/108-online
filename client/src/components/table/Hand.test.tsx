import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Card } from '../../../../shared/types/index.ts';
import { Hand } from './Hand.tsx';

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ id: `0-${rank}${suit}`, rank, suit, deckIndex: 0 });
const cards = [card('9', 'H'), card('8', 'C'), card('K', 'S')];

describe('Hand', () => {
  it('renders one button per card and highlights playable cards on your turn', () => {
    render(
      <Hand cards={cards} playableIds={new Set(['0-9H'])} selectedId={null} isYourTurn settings={{ queenRule: 'free-next' }} onCardClick={() => {}} animateDeal={false} />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByRole('button', { name: /9 Chirva — tashlash mumkin/ })).toHaveAttribute('data-playable', 'true');
    expect(screen.getByRole('button', { name: '8 Chillak' })).not.toHaveAttribute('data-playable');
  });

  it('does not highlight anything when it is not your turn', () => {
    render(<Hand cards={cards} playableIds={new Set(['0-9H'])} selectedId={null} isYourTurn={false} settings={{ queenRule: 'free-next' }} onCardClick={() => {}} animateDeal={false} />);
    expect(screen.getAllByRole('button').some((b) => b.hasAttribute('data-playable'))).toBe(false);
  });

  it('reports clicks with the card and marks the selected card', () => {
    const onClick = vi.fn();
    render(<Hand cards={cards} playableIds={new Set()} selectedId="0-KS" isYourTurn settings={{ queenRule: 'free-next' }} onCardClick={onClick} animateDeal={false} />);
    const king = screen.getByRole('button', { name: 'Qirol Pika' });
    expect(king).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(king);
    expect(onClick).toHaveBeenCalledWith(cards[2]);
  });
});
