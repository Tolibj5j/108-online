export interface Point {
  x: number;
  y: number;
}

/** Opponent seat centres (percent of the table box), by opponent count. Clockwise from the player's left. */
const LAYOUTS: Record<number, Point[]> = {
  0: [],
  1: [{ x: 50, y: 13 }],
  2: [
    { x: 24, y: 16 },
    { x: 76, y: 16 },
  ],
  3: [
    { x: 11, y: 44 },
    { x: 50, y: 13 },
    { x: 89, y: 44 },
  ],
  4: [
    { x: 10, y: 52 },
    { x: 30, y: 14 },
    { x: 70, y: 14 },
    { x: 90, y: 52 },
  ],
  5: [
    { x: 9, y: 60 },
    { x: 17, y: 21 },
    { x: 50, y: 12 },
    { x: 83, y: 21 },
    { x: 91, y: 60 },
  ],
};

export function seatPositions(opponents: number): Point[] {
  return LAYOUTS[Math.max(0, Math.min(5, opponents))]!;
}

export const DRAW_PILE_POS: Point = { x: 41, y: 52 };
export const DISCARD_POS: Point = { x: 59, y: 52 };
export const MY_SEAT_POS: Point = { x: 50, y: 104 };

/** Opponents in turn order starting after `me`. */
export function opponentsAfter(order: string[], me: string): string[] {
  const i = order.indexOf(me);
  if (i < 0) return order.slice();
  return [...order.slice(i + 1), ...order.slice(0, i)];
}
