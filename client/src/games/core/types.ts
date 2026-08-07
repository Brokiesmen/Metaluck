/**
 * Shared contracts for the Phaser games module.
 * Isolated from app auth / wallet / React UI.
 */

/** Registered game id (folder name / loader key). */
export type GameId = 'sandbox' | 'aviator' | (string & {});

export interface GameOutcome {
  gameId: GameId;
  bet: number;
  payout: number;
  /** Optional free-form details from a concrete game. */
  meta?: Record<string, unknown>;
}

export interface GameCallbacks {
  onReady?: () => void;
  onWin?: (outcome: GameOutcome) => void;
  onLose?: (outcome: GameOutcome) => void;
  onError?: (error: Error) => void;
  /** Absolute playable balance after a stake/settle (host TopBar sync). */
  onBalance?: (balance: number) => void;
}

/**
 * Runtime config passed by the host (or sandbox) into GameManager.load.
 * No React, no API clients — only plain data + callbacks.
 */
export interface GameRuntimeConfig {
  /** DOM node or CSS selector for Phaser parent. */
  parent: HTMLElement | string;
  bet: number;
  balance: number;
  callbacks?: GameCallbacks;
  /** Logical game size; defaults come from GameConfig. */
  width?: number;
  height?: number;
  /** Extra per-game options (ignored by core if unused). */
  options?: Record<string, unknown>;
}

/** Keys stored on Phaser.Game.registry for scenes. */
export const REGISTRY_KEYS = {
  bet: 'metaluck.bet',
  balance: 'metaluck.balance',
  callbacks: 'metaluck.callbacks',
  gameId: 'metaluck.gameId',
  runtime: 'metaluck.runtime',
  sound: 'metaluck.sound',
} as const;
