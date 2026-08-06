import crypto from 'crypto';
import { PLAYER_RTP } from './houseEdge.js';

export const GRID_SIZE = 10;
export const ALLOWED_BETS = [5, 10, 25, 50] as const;
export type AllowedBet = (typeof ALLOWED_BETS)[number];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'active' | 'lost' | 'won' | 'cashed';

/** Base mine counts by difficulty (before bet risk). */
export const DIFFICULTY_MINES: Record<Difficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
};

/**
 * Fair (pre–house-edge) full-clear multipliers by stake.
 * Higher stake → higher multiplier. Net ≈ fair × PLAYER_RTP (25% edge).
 * Example: bet 10 → 1.87 × 0.75 ≈ 1.40x.
 */
export const BET_FAIR_WIN_MULT: Record<AllowedBet, number> = {
  5: 1.55,
  10: 1.87,
  25: 2.4,
  50: 3.2,
};

/** Difficulty scales the bet multiplier (harder board → bigger reward). */
export const DIFF_FAIR_SCALE: Record<Difficulty, number> = {
  easy: 0.85,
  medium: 1,
  hard: 1.25,
};

/**
 * Extra mines for larger stakes — raises loss risk as bet grows.
 * Cap keeps the board playable (≥ 65 safe cells).
 */
export const BET_EXTRA_MINES: Record<AllowedBet, number> = {
  5: 0,
  10: 2,
  25: 5,
  50: 8,
};

const MAX_MINES = 35;

export function isAllowedBet(bet: number): bet is AllowedBet {
  return (ALLOWED_BETS as readonly number[]).includes(bet);
}

export function mineCountFor(difficulty: Difficulty, bet: number): number {
  const base = DIFFICULTY_MINES[difficulty];
  const extra = isAllowedBet(bet) ? BET_EXTRA_MINES[bet] : 0;
  return Math.min(MAX_MINES, base + extra);
}

/** Fair multiplier before 25% house edge. */
export function fairWinMultiplier(bet: number, difficulty: Difficulty): number {
  const betMult = isAllowedBet(bet) ? BET_FAIR_WIN_MULT[bet] : BET_FAIR_WIN_MULT[10];
  return betMult * DIFF_FAIR_SCALE[difficulty];
}

/** Net multiplier the player receives on full clear (after house edge). */
export function netWinMultiplier(bet: number, difficulty: Difficulty): number {
  return fairWinMultiplier(bet, difficulty) * PLAYER_RTP;
}

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

/**
 * Full-clear payout: stake × fairMult × (1 − 25% house edge).
 */
export function payoutForWin(bet: number, difficulty: Difficulty): number {
  return Math.floor(bet * fairWinMultiplier(bet, difficulty) * PLAYER_RTP);
}

/**
 * Early cash-out: scales with board progress toward ~95% of full-clear payout.
 * Quadratic ease keeps early exits modest (house edge + risk stay intact).
 */
export function payoutForCashout(
  bet: number,
  revealedCount: number,
  mineCount: number,
  difficulty: Difficulty,
): number {
  const safe = totalSafeCells(mineCount);
  if (revealedCount <= 0 || safe <= 0) return 0;
  const progress = Math.min(1, revealedCount / safe);
  const full = payoutForWin(bet, difficulty);
  const start = Math.floor(bet * PLAYER_RTP * 0.25);
  const end = Math.floor(full * 0.95);
  const eased = progress * progress;
  return Math.max(0, Math.floor(start + (end - start) * eased));
}
