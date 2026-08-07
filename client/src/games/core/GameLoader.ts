import type { BaseGame } from './BaseGame';
import type { GameId } from './types';
import { SandboxGame } from '../sandbox/SandboxGame';
import { AviatorGame } from '../aviator/AviatorGame';

export type GameFactory = () => BaseGame;

/**
 * Registry of game factories. Core does not import React / API / wallet.
 */
const registry = new Map<GameId, GameFactory>();

function ensureDefaultsRegistered(): void {
  if (!registry.has('sandbox')) {
    registry.set('sandbox', () => new SandboxGame());
  }
  if (!registry.has('aviator')) {
    registry.set('aviator', () => new AviatorGame());
  }
}

export const GameLoader = {
  register(id: GameId, factory: GameFactory): void {
    registry.set(id, factory);
  },

  unregister(id: GameId): void {
    registry.delete(id);
  },

  has(id: GameId): boolean {
    ensureDefaultsRegistered();
    return registry.has(id);
  },

  list(): GameId[] {
    ensureDefaultsRegistered();
    return [...registry.keys()];
  },

  /** Instantiate a game by id (does not init/start). */
  create(id: GameId): BaseGame {
    ensureDefaultsRegistered();
    const factory = registry.get(id);
    if (!factory) {
      throw new Error(`[GameLoader] Unknown game: "${id}". Registered: ${this.list().join(', ') || '(none)'}`);
    }
    return factory();
  },
};
