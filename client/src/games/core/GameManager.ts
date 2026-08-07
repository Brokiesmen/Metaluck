import { GameLoader } from './GameLoader';
import type { BaseGame } from './BaseGame';
import { SoundManager } from './SoundManager';
import type { GameId, GameRuntimeConfig } from './types';

/**
 * Host-facing façade for the Phaser games module.
 * Fully isolated: only needs a DOM parent + plain config/callbacks.
 */
export class GameManager {
  private static instance: GameManager | null = null;

  private current: BaseGame | null = null;
  private loadChain: Promise<unknown> = Promise.resolve();
  /** Bumped on destroy/load to invalidate in-flight load() work. */
  private epoch = 0;

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /** Test helper — do not use from production host. */
  static resetInstance(): void {
    GameManager.instance?.destroy();
    GameManager.instance = null;
  }

  getCurrent(): BaseGame | null {
    return this.current;
  }

  /**
   * Destroy the previous game (if any), create/init/start the requested one.
   * Concurrent load() calls are queued; destroy() invalidates in-flight loads.
   */
  async load(name: GameId, config: GameRuntimeConfig): Promise<BaseGame> {
    const epoch = ++this.epoch;

    const run = async (): Promise<BaseGame> => {
      this.destroyCurrent();
      if (epoch !== this.epoch) {
        throw new Error('[GameManager] load cancelled');
      }

      const game = GameLoader.create(name);
      await game.init(config);
      if (epoch !== this.epoch) {
        game.destroy();
        throw new Error('[GameManager] load cancelled');
      }

      await game.start();
      if (epoch !== this.epoch) {
        game.destroy();
        throw new Error('[GameManager] load cancelled');
      }

      this.current = game;
      return game;
    };

    const next = this.loadChain.then(run, run);
    this.loadChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  /** Destroy active game and clear handle (safe to call on route exit). */
  destroy(): void {
    this.epoch += 1;
    this.destroyCurrent();
    SoundManager.getInstance().onGameExit();
  }

  private destroyCurrent(): void {
    if (!this.current) {
      SoundManager.getInstance().onGameExit();
      return;
    }
    try {
      this.current.destroy();
    } catch (err) {
      console.error('[GameManager] destroy failed', err);
      SoundManager.getInstance().onGameExit();
    }
    this.current = null;
  }
}
