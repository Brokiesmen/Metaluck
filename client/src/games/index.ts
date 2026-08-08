/**
 * Phaser 3 games module — isolated from React shell, auth, wallet, backend.
 *
 * Dev sandbox: open /src/games/sandbox/index.html while `npm run dev` is running.
 */

export { GameManager } from './core/GameManager';
export { GameLoader } from './core/GameLoader';
export { BaseGame } from './core/BaseGame';
export { Haptics } from './core/Haptics';
export { getDeviceProfile } from './core/DeviceProfile';
export type { DeviceProfile } from './core/DeviceProfile';
export {
  createPhaserConfig,
  resolveGameSize,
  DEFAULT_GAME_WIDTH,
  DEFAULT_GAME_HEIGHT,
} from './core/GameConfig';
export type {
  GameId,
  GameOutcome,
  GameCallbacks,
  GameRuntimeConfig,
} from './core/types';
export { REGISTRY_KEYS } from './core/types';
export { SandboxGame } from './sandbox/SandboxGame';
export { AviatorGame } from './aviator/AviatorGame';
export type { AviatorOptions } from './aviator/AviatorGame';
export type { GameTransport as AviatorTransport } from './aviator/transport/GameTransport';
export { PhaserGameHost } from './host/PhaserGameHost';
export type { PhaserGameHostProps } from './host/PhaserGameHost';
export { PHASER_APP_GAMES, isPhaserAppGame, phaserIdForAppGame } from './catalog';
export type { AppGameView } from './catalog';
export * from './shared';
