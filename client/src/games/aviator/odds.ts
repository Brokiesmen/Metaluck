/** Aviator curve / economy — kept inside the games module (no app imports). */

export const GROWTH_K = 0.12;
/** Chance a round busts instantly at 1.00× (the house edge). Keep small — a
 *  quarter of rounds insta-crashing makes the game feel broken. */
export const INSTANT_BUST_CHANCE = 0.03;
export const MIN_CASHOUT = 1.01;
export const MAX_CRASH = 100;
export const ALLOWED_BETS = [1, 5, 10, 25, 50, 100] as const;
export const BETTING_MS = 5_000;
export const CRASHED_MS = 2_600;
export const HISTORY_LEN = 18;

export type AllowedBet = (typeof ALLOWED_BETS)[number];

function floor2(x: number): number {
  return Math.floor(x * 100) / 100;
}

export function multiplierAt(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs) / 1000;
  return Math.max(1, floor2(Math.exp(GROWTH_K * t)));
}

export function timeToReachMs(mult: number): number {
  if (mult <= 1) return 0;
  return Math.ceil((Math.log(mult) / GROWTH_K) * 1000);
}

export function generateCrashPoint(): number {
  if (Math.random() < INSTANT_BUST_CHANCE) return 1.0;
  const raw = 1 / (1 - Math.random());
  return Math.min(MAX_CRASH, Math.max(MIN_CASHOUT, floor2(raw)));
}

export function payoutForCashout(bet: number, mult: number): number {
  return Math.floor(bet * Math.max(MIN_CASHOUT, mult));
}

export function formatMult(mult: number): string {
  return `${mult.toFixed(2)}×`;
}

export function historyTone(mult: number): 'win' | 'lose' | 'neutral' | 'hot' {
  if (mult < 1.5) return 'lose';
  if (mult < 2) return 'neutral';
  if (mult < 10) return 'win';
  return 'hot';
}
