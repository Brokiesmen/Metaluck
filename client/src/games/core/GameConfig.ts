import Phaser from 'phaser';
import type { GameRuntimeConfig } from './types';
import { getDeviceProfile } from './DeviceProfile';

/** Default logical resolution for Phaser games in this module. */
export const DEFAULT_GAME_WIDTH = 390;
export const DEFAULT_GAME_HEIGHT = 700;

export interface PhaserBootOptions {
  parent: HTMLElement | string;
  width: number;
  height: number;
  scenes: Phaser.Types.Scenes.SceneType[];
}

/**
 * Builds a Phaser.Game config. Host app never touches this — only BaseGame / GameManager.
 */
export function createPhaserConfig(opts: PhaserBootOptions): Phaser.Types.Core.GameConfig {
  const device = getDeviceProfile();

  return {
    type: Phaser.AUTO,
    parent: opts.parent,
    width: opts.width,
    height: opts.height,
    backgroundColor: '#0a0e14',
    scene: opts.scenes,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: opts.width,
      height: opts.height,
      // Expand to visual viewport changes (mobile URL bar / rotate).
      resizeInterval: 100,
    },
    input: {
      activePointers: 2,
      // Smooth scrolling / accidental gestures off on game canvas.
      windowEvents: true,
    },
    render: {
      antialias: !device.lowPower,
      roundPixels: true,
      powerPreference: device.lowPower ? 'low-power' : 'high-performance',
      // false = better mobile perf (no readback stall).
      preserveDrawingBuffer: false,
      batchSize: device.veryLow ? 2048 : 4096,
    },
    banner: false,
    fps: {
      target: device.fpsTarget,
      min: 24,
      smoothStep: !device.veryLow,
    },
    audio: {
      disableWebAudio: false,
      noAudio: false,
    },
    disableContextMenu: true,
  };
}

export function resolveGameSize(config: GameRuntimeConfig): { width: number; height: number } {
  return {
    width: config.width ?? DEFAULT_GAME_WIDTH,
    height: config.height ?? DEFAULT_GAME_HEIGHT,
  };
}
