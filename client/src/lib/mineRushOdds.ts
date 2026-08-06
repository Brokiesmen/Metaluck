/**
 * Shared MineRush odds (mirrors server/src/mineRushEngine.ts).
 * Keep in sync: bet↑ → multiplier↑ and mines↑; payouts use 25% house edge.
 */

export const GRID_SIZE = 10;
export const ALLOWED_BETS = [5, 10, 25, 50] as const;
export type AllowedBet = (typeof ALLOWED_BETS)[number];
export type MrDifficulty = 'easy' | 'medium' | 'hard';

export const PLAYER_RTP = 0.75; // 25% house edge

export const DIFFICULTY_MINES: Record<MrDifficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
};

export const BET_FAIR_WIN_MULT: Record<AllowedBet, number> = {
  5: 1.55,
  10: 1.87,
  25: 2.4,
  50: 3.2,
};

export const DIFF_FAIR_SCALE: Record<MrDifficulty, number> = {
  easy: 0.85,
  medium: 1,
  hard: 1.25,
};

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

export function mineCountFor(difficulty: MrDifficulty, bet: number): number {
  const base = DIFFICULTY_MINES[difficulty];
  const extra = isAllowedBet(bet) ? BET_EXTRA_MINES[bet] : 0;
  return Math.min(MAX_MINES, base + extra);
}

export function fairWinMultiplier(bet: number, difficulty: MrDifficulty): number {
  const betMult = isAllowedBet(bet) ? BET_FAIR_WIN_MULT[bet] : BET_FAIR_WIN_MULT[10];
  return betMult * DIFF_FAIR_SCALE[difficulty];
}

export function netWinMultiplier(bet: number, difficulty: MrDifficulty): number {
  return fairWinMultiplier(bet, difficulty) * PLAYER_RTP;
}

export function formatNetMult(bet: number, difficulty: MrDifficulty): string {
  return netWinMultiplier(bet, difficulty).toFixed(1);
}

export function payoutForWin(bet: number, difficulty: MrDifficulty): number {
  return Math.floor(bet * fairWinMultiplier(bet, difficulty) * PLAYER_RTP);
}

export function payoutForCashout(
  bet: number,
  revealedCount: number,
  mineCount: number,
  difficulty: MrDifficulty,
): number {
  const safe = GRID_SIZE * GRID_SIZE - mineCount;
  if (revealedCount <= 0 || safe <= 0) return 0;
  const progress = Math.min(1, revealedCount / safe);
  const full = payoutForWin(bet, difficulty);
  const start = Math.floor(bet * PLAYER_RTP * 0.25);
  const end = Math.floor(full * 0.95);
  const eased = progress * progress;
  return Math.max(0, Math.floor(start + (end - start) * eased));
}
