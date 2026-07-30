/** House edge applied to player-facing game payouts (RTP = 75%). */
export const HOUSE_EDGE = 0.25;
export const PLAYER_RTP = 1 - HOUSE_EDGE;

/** Scale a gross payout (incl. stake return) by house edge. */
export function applyHouseEdge(payout: number): number {
  if (payout <= 0) return 0;
  return Math.floor(payout * PLAYER_RTP);
}

/** Scale star prize credits from cases. */
export function applyHouseEdgeStars(stars: number): number {
  if (stars <= 0) return 0;
  return Math.max(1, Math.floor(stars * PLAYER_RTP));
}
