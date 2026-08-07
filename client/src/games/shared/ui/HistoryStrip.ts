import Phaser from 'phaser';
import { GameTheme } from '../theme/tokens';
import { drawRoundRect, makeLabelStyle } from './draw';

export type HistoryTone = 'win' | 'lose' | 'neutral' | 'hot';

export interface HistoryItem {
  id?: string;
  label: string;
  tone?: HistoryTone;
}

export interface HistoryStripOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width?: number;
  height?: number;
  maxItems?: number;
  items?: HistoryItem[];
  depth?: number;
}

const TONE_COLOR: Record<HistoryTone, number> = {
  win: GameTheme.colors.win,
  lose: GameTheme.colors.lose,
  neutral: GameTheme.colors.borderStrong,
  hot: GameTheme.colors.accentHot,
};

const TONE_TEXT: Record<HistoryTone, string> = {
  win: GameTheme.colors.accentHex,
  lose: GameTheme.colors.dangerHex,
  neutral: GameTheme.colors.textMutedHex,
  hot: GameTheme.colors.accentHotHex,
};

/**
 * Horizontal strip of recent outcomes (multipliers, W/L, etc.).
 */
export class HistoryStrip extends Phaser.GameObjects.Container {
  private readonly panelWidth: number;
  private readonly panelHeight: number;
  private readonly maxItems: number;
  private items: HistoryItem[] = [];
  private row: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;

  constructor(opts: HistoryStripOptions) {
    super(opts.scene, opts.x, opts.y);
    this.panelWidth = opts.width ?? 340;
    this.panelHeight = opts.height ?? 40;
    this.maxItems = opts.maxItems ?? 12;
    this.items = [...(opts.items ?? [])].slice(0, this.maxItems);

    this.bg = opts.scene.add.graphics();
    drawRoundRect(
      this.bg,
      -this.panelWidth / 2,
      -this.panelHeight / 2,
      this.panelWidth,
      this.panelHeight,
      GameTheme.radii.pill,
      GameTheme.colors.surface,
      0.9,
      GameTheme.colors.border,
      0.7,
    );

    this.row = opts.scene.add.container(0, 0);
    this.add([this.bg, this.row]);
    this.setDepth(opts.depth ?? GameTheme.depth.hud);
    opts.scene.add.existing(this);
    this.rebuild();
  }

  getItems(): HistoryItem[] {
    return [...this.items];
  }

  setItems(items: HistoryItem[]): this {
    this.items = items.slice(0, this.maxItems);
    this.rebuild();
    return this;
  }

  /** Newest item is prepended on the left. */
  push(item: HistoryItem): this {
    this.items = [item, ...this.items].slice(0, this.maxItems);
    this.rebuild();
    return this;
  }

  clear(): this {
    this.items = [];
    this.rebuild();
    return this;
  }

  private rebuild(): void {
    this.row.removeAll(true);
    const gap = 6;
    const padX = 10;
    let cursor = -this.panelWidth / 2 + padX;

    for (const item of this.items) {
      const tone = item.tone ?? 'neutral';
      const chip = this.scene.add.container(0, 0);
      const label = this.scene.add
        .text(0, 0, item.label, makeLabelStyle(11, TONE_TEXT[tone], { fontStyle: '700' }))
        .setOrigin(0, 0.5);
      const w = Math.ceil(label.width + 16);
      const h = 24;
      const g = this.scene.add.graphics();
      drawRoundRect(g, 0, -h / 2, w, h, GameTheme.radii.sm, TONE_COLOR[tone], tone === 'neutral' ? 0.35 : 0.22);
      label.setPosition(8, 0);
      chip.add([g, label]);
      chip.setPosition(cursor, 0);
      this.row.add(chip);
      cursor += w + gap;
      if (cursor > this.panelWidth / 2 - padX) break;
    }
  }
}

/** Alias matching the design-system name. */
export { HistoryStrip as History };
