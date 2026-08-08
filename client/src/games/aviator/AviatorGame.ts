import Phaser from 'phaser';
import { BaseGame } from '../core/BaseGame';
import type { GameId } from '../core/types';
import type { PhaserConfigOverrides } from '../core/GameConfig';
import { Quality } from './config/quality';
import { AviatorConfig } from './config/aviatorConfig';
import { AviatorSound } from './audio/AviatorSound';
import { AVIATOR_SCENE_KEY, GameScene, type GameSceneData } from './scenes/GameScene';
import { BetPanel } from './ui/BetPanel';
import { DemoTransport } from './transport/DemoTransport';
import type { GameTransport } from './transport/GameTransport';
import { resolveStrings, type AviatorStrings } from './strings';

/** Options the host may pass through GameRuntimeConfig.options. */
export interface AviatorOptions {
  /** Live transport (REST + WS). Falls back to the offline demo loop. */
  transport?: GameTransport;
  /** Localized copy overrides. */
  strings?: Partial<AviatorStrings>;
}

/**
 * Aviator (crash) — Phaser canvas for the flight plus a DOM betting shell.
 * Everything the game shows comes from a GameTransport; the module itself
 * never talks to the app's API, auth or wallet.
 */
export class AviatorGame extends BaseGame {
  readonly name: GameId = 'aviator';

  private transport: GameTransport | null = null;
  /** True when we created the transport and must therefore tear it down. */
  private ownsTransport = false;
  private sound: AviatorSound | null = null;
  private panel: BetPanel | null = null;
  private uiHost: HTMLElement | null = null;
  private strings: AviatorStrings = resolveStrings();
  private unsubBalance: (() => void) | null = null;

  protected async onInit(): Promise<void> {
    const options = (this.runtime?.options ?? {}) as AviatorOptions;
    this.strings = resolveStrings(options.strings);

    if (options.transport) {
      this.transport = options.transport;
      this.ownsTransport = false;
    } else {
      this.transport = new DemoTransport(this.runtime?.balance ?? undefined);
      this.ownsTransport = true;
    }

    this.sound = new AviatorSound();

    // Connect before the scene boots so the first frame already has a round.
    await this.transport.connect();

    // Keep the host's TopBar balance in sync with the game wallet.
    const onBalance = this.getCallbacks().onBalance;
    if (onBalance) {
      this.unsubBalance = this.transport.subscribe((event) => {
        if (event.type === 'balance_update') onBalance(event.balance.balance);
      });
    }
  }

  protected getSceneClasses(): Phaser.Types.Scenes.SceneType[] {
    // Registered manually in start() so the scene receives its init data.
    return [];
  }

  protected getPhaserOverrides(): PhaserConfigOverrides {
    return {
      backgroundColor: '#03050c',
      scale: {
        // Full-bleed: the flight path is laid out against the real viewport,
        // not a letterboxed 390×700 stage.
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: AviatorConfig.width,
        height: AviatorConfig.height,
        expandParent: true,
        autoRound: true,
      },
      render: {
        antialias: Quality.antialias,
        roundPixels: Quality.roundPixels,
        powerPreference: 'high-performance',
        transparent: false,
        clearBeforeRender: true,
        batchSize: 2048,
      },
      fps: {
        target: Quality.targetFps,
        min: Math.min(30, Quality.targetFps),
        smoothStep: true,
        forceSetTimeOut: Quality.isMobile || Quality.tier === 'low',
      },
    };
  }

  async start(): Promise<void> {
    await super.start();
    if (!this.transport || !this.sound) return;

    const data: GameSceneData = {
      transport: this.transport,
      sound: this.sound,
      strings: this.strings,
    };
    // `true` = autostart, so init(data) runs with the transport attached.
    this.phaser?.scene.add(AVIATOR_SCENE_KEY, GameScene, true, data);

    this.mountPanel();
  }

  protected async onDestroy(): Promise<void> {
    this.unsubBalance?.();
    this.unsubBalance = null;

    this.panel?.destroy();
    this.panel = null;
    this.uiHost?.remove();
    this.uiHost = null;

    this.sound?.destroy();
    this.sound = null;

    if (this.ownsTransport) this.transport?.disconnect();
    this.transport = null;
  }

  private mountPanel(): void {
    const parent = this.getParentElement();
    if (!parent || !this.transport || !this.sound) return;

    // Own DOM layer so the panel is never wiped by Phaser's canvas teardown.
    const host = document.createElement('div');
    host.className = 'av-ui-root';
    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.zIndex = '2';
    host.style.pointerEvents = 'none';
    parent.appendChild(host);
    this.uiHost = host;

    this.panel = new BetPanel(host, this.transport, this.sound, this.strings);
  }
}
