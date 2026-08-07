import Phaser from 'phaser';
import { createPhaserConfig, resolveGameSize } from './GameConfig';
import { SoundManager } from './SoundManager';
import {
  REGISTRY_KEYS,
  type GameCallbacks,
  type GameId,
  type GameOutcome,
  type GameRuntimeConfig,
} from './types';

/**
 * Abstract base for every Phaser minigame in this module.
 * Subclasses supply scenes via `getSceneClasses()`; lifecycle is shared.
 */
export abstract class BaseGame {
  abstract readonly name: GameId;

  protected runtime: GameRuntimeConfig | null = null;
  protected phaser: Phaser.Game | null = null;

  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private unlockedCanvas: HTMLCanvasElement | null = null;
  private onViewportResize = (): void => this.scheduleResize();
  private onPageHide = (): void => {
    // Soft pause audio loops when tab backgrounds; full destroy is host's job.
    SoundManager.getInstance().stopEngine(0);
  };
  private unlockHandler = (): void => {
    SoundManager.getInstance().unlock();
  };

  async init(config: GameRuntimeConfig): Promise<void> {
    this.runtime = {
      ...config,
      callbacks: config.callbacks ? { ...config.callbacks } : undefined,
      options: config.options ? { ...config.options } : undefined,
    };
    await this.onInit();
  }

  async start(): Promise<void> {
    if (!this.runtime) {
      throw new Error(`[BaseGame:${this.name}] call init() before start()`);
    }
    if (this.phaser) {
      this.destroyPhaserOnly();
    }

    const { width, height } = resolveGameSize(this.runtime);
    const scenes = this.getSceneClasses();

    try {
      this.phaser = new Phaser.Game(
        createPhaserConfig({
          parent: this.runtime.parent,
          width,
          height,
          scenes,
        }),
      );

      this.phaser.registry.set(REGISTRY_KEYS.gameId, this.name);
      this.phaser.registry.set(REGISTRY_KEYS.bet, this.runtime.bet);
      this.phaser.registry.set(REGISTRY_KEYS.balance, this.runtime.balance);
      this.phaser.registry.set(REGISTRY_KEYS.callbacks, this.runtime.callbacks ?? {});
      this.phaser.registry.set(REGISTRY_KEYS.runtime, this.runtime);
      this.phaser.registry.set(REGISTRY_KEYS.sound, SoundManager.getInstance());

      this.phaser.events.once('ready', () => {
        const canvas = this.phaser?.canvas ?? null;
        this.unlockedCanvas = canvas;
        canvas?.addEventListener('pointerdown', this.unlockHandler, { passive: true });
        canvas?.addEventListener('touchstart', this.unlockHandler, { passive: true });
      });

      this.attachResizeObserver();
      this.attachViewportListeners();
      this.runtime.callbacks?.onReady?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.runtime.callbacks?.onError?.(error);
      throw error;
    }
  }

  /** Tear down Phaser, observers, audio loops, and runtime handle. */
  destroy(): void {
    this.detachResizeObserver();
    this.detachViewportListeners();
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.unlockedCanvas) {
      this.unlockedCanvas.removeEventListener('pointerdown', this.unlockHandler);
      this.unlockedCanvas.removeEventListener('touchstart', this.unlockHandler);
      this.unlockedCanvas = null;
    }
    SoundManager.getInstance().onGameExit();
    this.destroyPhaserOnly();
    this.runtime = null;
    void this.onDestroy();
  }

  onResize(_width: number, _height: number): void {
    if (!this.phaser) return;
    // FIT/letterbox: refresh parent bounds — do NOT rewrite logical game size.
    this.phaser.scale.refresh();
    this.onGameResize(this.phaser.scale.width, this.phaser.scale.height);
  }

  protected async onInit(): Promise<void> {}

  protected async onDestroy(): Promise<void> {}

  protected onGameResize(_width: number, _height: number): void {}

  protected abstract getSceneClasses(): Phaser.Types.Scenes.SceneType[];

  protected getCallbacks(): GameCallbacks {
    return this.runtime?.callbacks ?? {};
  }

  protected emitWin(partial: Omit<GameOutcome, 'gameId' | 'bet'> & { bet?: number }): void {
    const bet = partial.bet ?? this.runtime?.bet ?? 0;
    this.getCallbacks().onWin?.({
      gameId: this.name,
      bet,
      payout: partial.payout,
      meta: partial.meta,
    });
  }

  protected emitLose(partial: Omit<GameOutcome, 'gameId' | 'bet'> & { bet?: number }): void {
    const bet = partial.bet ?? this.runtime?.bet ?? 0;
    this.getCallbacks().onLose?.({
      gameId: this.name,
      bet,
      payout: partial.payout,
      meta: partial.meta,
    });
  }

  private destroyPhaserOnly(): void {
    if (!this.phaser) return;
    try {
      // true = remove canvas from DOM
      this.phaser.destroy(true);
    } catch (err) {
      console.error(`[BaseGame:${this.name}] phaser.destroy failed`, err);
    }
    this.phaser = null;
  }

  private resolveParentElement(): HTMLElement | null {
    if (!this.runtime) return null;
    const { parent } = this.runtime;
    if (typeof parent === 'string') {
      return document.querySelector(parent);
    }
    return parent;
  }

  private scheduleResize(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;
      const el = this.resolveParentElement();
      const w = el?.clientWidth ?? 0;
      const h = el?.clientHeight ?? 0;
      if (w > 0 && h > 0) this.onResize(w, h);
      else this.onResize(0, 0);
    }, 50);
  }

  private attachResizeObserver(): void {
    this.detachResizeObserver();
    const el = this.resolveParentElement();
    if (!el || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(el);
  }

  private detachResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private attachViewportListeners(): void {
    this.detachViewportListeners();
    window.addEventListener('orientationchange', this.onViewportResize, { passive: true });
    window.visualViewport?.addEventListener('resize', this.onViewportResize);
    window.addEventListener('pagehide', this.onPageHide, { passive: true });
  }

  private detachViewportListeners(): void {
    window.removeEventListener('orientationchange', this.onViewportResize);
    window.visualViewport?.removeEventListener('resize', this.onViewportResize);
    window.removeEventListener('pagehide', this.onPageHide);
  }
}
