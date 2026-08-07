/**
 * Maps app lobby game views → Phaser GameLoader ids.
 * Only games listed here run on the new engine; others stay on legacy React.
 */
import type { GameId } from './core/types';

export type AppGameView =
  | 'cases'
  | 'blackjack'
  | 'coinflip'
  | 'minerush'
  | 'arena'
  | 'aviator';

/** Phaser-backed games currently wired into the shell. */
export const PHASER_APP_GAMES: Partial<Record<AppGameView, GameId>> = {
  aviator: 'aviator',
};

export function isPhaserAppGame(view: string): view is AppGameView {
  return Object.prototype.hasOwnProperty.call(PHASER_APP_GAMES, view);
}

export function phaserIdForAppGame(view: AppGameView): GameId | null {
  return PHASER_APP_GAMES[view] ?? null;
}
