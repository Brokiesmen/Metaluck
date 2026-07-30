import crypto from 'crypto';
import { PLAYER_RTP } from './houseEdge.js';

export const GRID_SIZE = 10;
export const ALLOWED_BETS = [5, 10, 25, 50] as const;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'active' | 'lost' | 'won' | 'cashed';

export const DIFFICULTY_MINES: Record<Difficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
};

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseKey(key: string): { x: number; y: number } {
  const [xs, ys] = key.split(',');
  return { x: Number(xs), y: Number(ys) };
}

export function generateMines(count: number, avoid?: { x: number; y: number }): Set<string> {
  const mines = new Set<string>();
  const max = GRID_SIZE * GRID_SIZE;
  if (count >= max - (avoid ? 1 : 0)) {
    throw new Error('Too many mines');
  }
  while (mines.size < count) {
    const idx = crypto.randomInt(0, max);
    const x = idx % GRID_SIZE;
    const y = Math.floor(idx / GRID_SIZE);
    if (avoid && x === avoid.x && y === avoid.y) continue;
    mines.add(cellKey(x, y));
  }
  return mines;
}

export function countAdjacent(mines: Set<string>, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      if (mines.has(cellKey(nx, ny))) n++;
    }
  }
  return n;
}

export function floodReveal(
  mines: Set<string>,
  revealed: Set<string>,
  x: number,
  y: number,
): string[] {
  const key = cellKey(x, y);
  if (revealed.has(key) || mines.has(key)) return [];
  const added: string[] = [];
  const stack = [{ x, y }];
  while (stack.length) {
    const cur = stack.pop()!;
    const ck = cellKey(cur.x, cur.y);
    if (revealed.has(ck) || mines.has(ck)) continue;
    revealed.add(ck);
    added.push(ck);
    if (countAdjacent(mines, cur.x, cur.y) === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
          const nk = cellKey(nx, ny);
          if (!revealed.has(nk) && !mines.has(nk)) stack.push({ x: nx, y: ny });
        }
      }
    }
  }
  return added;
}

export function totalSafeCells(mineCount: number): number {
  return GRID_SIZE * GRID_SIZE - mineCount;
}

export function payoutForCashout(bet: number, revealedCount: number, mineCount: number, difficulty: Difficulty): number {
  const safe = totalSafeCells(mineCount);
  if (revealedCount <= 0) return 0;
  const progress = revealedCount / safe;
  const mult = difficulty === 'easy' ? 1.2 : difficulty === 'medium' ? 1.6 : 2.1;
  return Math.floor(bet * (0.5 + progress * mult) * PLAYER_RTP);
}

export function payoutForWin(bet: number, difficulty: Difficulty): number {
  const mult = difficulty === 'easy' ? 2.5 : difficulty === 'medium' ? 3.5 : 5;
  return Math.floor(bet * mult * PLAYER_RTP);
}
