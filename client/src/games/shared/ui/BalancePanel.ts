import Phaser from 'phaser';
import { AnimationManager } from '../../core/AnimationManager';
import { GameTheme } from '../theme/tokens';
import { formatAmount } from '../theme/format';
import { drawRoundRect, makeLabelStyle, makeMonoStyle } from './draw';

export interface BalancePanelOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width?: number;
  balance: number;
  label?: string;
  /** Currency mark shown after the number (e.g. ★). */
  suffix?: string;
  depth?: number;
}

/**
 * Compact balance HUD with animated value updates.
 */
export class BalancePanel extends Phaser.GameObjects.Container {
  private valueText: Phaser.GameObjects.Text;
  private balance: number;
  private suffix: string;
  private anim: AnimationManager;

  constructor(opts: BalancePanelOptions) {
    super(opts.scene, opts.x, opts.y);
    this.balance = opts.balance;
    this.suffix = opts.suffix ?? '';
    this.anim = AnimationManager.forScene(opts.scene);

    const w = opts.width ?? 148;
    const h = 52;
    const bg = opts.scene.add.graphics();
    drawRoundRect(
      bg,
      -w / 2,
      -h / 2,
      w,
      h,
      GameTheme.radii.md,
      GameTheme.colors.surface,
      0.94,
      GameTheme.colors.border,
      0.8,
    );

    const title = opts.scene.add
      .text(0, -h / 2 + 12, opts.label ?? 'BALANCE', makeLabelStyle(10, GameTheme.colors.textMutedHex, { fontStyle: '800' }))
      .setOrigin(0.5);

    this.valueText = opts.scene.add
      .text(0, 6, this.format(this.balance), makeMonoStyle(16, GameTheme.colors.accentHotHex))
      .setOrigin(0.5);

    this.add([bg, title, this.valueText]);
    this.setDepth(opts.depth ?? GameTheme.depth.hud);
    opts.scene.add.existing(this);
  }

  getBalance(): number {
    return this.balance;
  }

  setBalance(next: number, animate = true): this {
    const from = this.balance;
    this.balance = next;
    if (!animate || from === next) {
      this.valueText.setText(this.format(next));
      return this;
    }
    this.anim.countText(this.valueText, from, next, GameTheme.motion.slow, (n) => this.format(n));
    this.anim.punchScale(this.valueText, 1.06, 160);
    return this;
  }

  private format(n: number): string {
    const body = formatAmount(n);
    return this.suffix ? `${body} ${this.suffix}` : body;
  }
}
