/**
 * Offline demo house edge for Aviator.
 * The edge is baked into the crash distribution (same model as the server's
 * aviatorEngine). Cashout payout = bet × mult — do NOT apply the edge twice.
 * Only DemoTransport uses this; live rounds are decided by the server.
 */
export const HOUSE_EDGE = 0.2;
export const PLAYER_RTP = 1 - HOUSE_EDGE;

export const MAX_CRASH = 100;
export const MIN_CASHOUT = 1.01;

/** P(crash ≥ m) ≈ PLAYER_RTP / m → RTP ≈ 80% at any cashout strategy. */
export function generateCrashPoint(rng: () => number = Math.random): number {
  if (rng() < HOUSE_EDGE) return 1;
  const raw = 1 / (1 - rng());
  return Math.min(MAX_CRASH, Math.max(MIN_CASHOUT, Math.floor(raw * 100) / 100));
}
