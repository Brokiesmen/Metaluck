/**
 * Stub for future live Aviator transport (REST poll + WebSocket).
 * GameScene depends only on RoundSource — swap LocalRoundSource → LiveRoundSource
 * once the host wires auth + /api/aviator endpoints.
 *
 * Expected live flow (not implemented here):
 *  1. connect(ws) + hydrate from GET /api/aviator/state
 *  2. on 'aviator:round' → update phase / startedAt / crash after fact
 *  3. placeBet → POST /api/aviator/bet
 *  4. cashout → POST /api/aviator/cashout
 *  5. balance from server snapshots / onBalance
 */

import type { RoundSource } from './RoundSource';

export interface LiveRoundSourceOptions {
  /** Base API origin, e.g. '' for same-origin. */
  apiBase?: string;
  /** Auth header / cookie provider — injected by host, never imported from app. */
  getAuthHeaders?: () => Record<string, string>;
  /** Optional WS URL resolver. */
  resolveWsUrl?: (path: string) => string;
  initialBalance: number;
  initialBet: number;
}

/**
 * Placeholder factory — throws until live wiring is ready.
 * Keeps the extension point discoverable next to LocalRoundSource.
 */
export function createLiveRoundSource(_opts: LiveRoundSourceOptions): RoundSource {
  throw new Error(
    '[aviator] LiveRoundSource is not wired yet. Use LocalRoundSource for demo; ' +
      'implement WS/REST against /api/aviator when enabling live mode.',
  );
}
