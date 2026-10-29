import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Card } from '../../../shared/types/index.ts';
import { CardBack, CardFace } from './PlayingCard.tsx';

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ id: `0-${rank}${suit}`, rank, suit, deckIndex: 0 });

describe('PlayingCard', () => {
  it('renders rank, suit and an Uzbek accessible label', () => {
    render(<CardFace card={card('Q', 'H')} size="hand" />);
    const el = screen.getByRole('img', { name: 'Dama Chirva' });
    expect(el).toHaveTextContent('Q');
    expect(el).toHaveTextContent('♥');
    expect(el.className).toContain('text-card-red');
  });

  it('draws one pip per value on number cards', () => {
    render(<CardFace card={card('9', 'S')} size="hand" />);
    const el = screen.getByRole('img', { name: '9 Pika' });
    // 9 centre pips + 2 corner suits
    expect((el.textContent ?? '').split('♠').length - 1).toBe(11);
    expect(el.className).toContain('text-card-black');
  });

  it('marks special cards with a rule hint', () => {
    render(<CardFace card={card('K', 'S')} size="hand" />);
    expect(screen.getByRole('img', { name: 'Qirol Pika' })).toHaveTextContent('+5');
  });

  it('does not mark normal kings', () => {
    render(<CardFace card={card('K', 'H')} size="hand" />);
    expect(screen.getByRole('img', { name: 'Qirol Chirva' })).not.toHaveTextContent('+5');
  });

  it('card backs never reveal a card', () => {
    const { container } = render(<CardBack size="md" />);
    expect(container.textContent).toBe('108');
    expect(container.querySelector('[data-card-id]')).toBeNull();
  });
});
