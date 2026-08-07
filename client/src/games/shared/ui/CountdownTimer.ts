import Phaser from 'phaser';
import { SoundManager } from '../../core/SoundManager';
import { Haptics } from '../../core/Haptics';
import { GameTheme } from '../theme/tokens';
import { formatCountdown } from '../theme/format';
import { makeMonoStyle } from './draw';

export interface CountdownTimerOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** Ring radius (px). */
  radius?: number;
  fontSize?: number;
  depth?: number;
  onTick?: (remainingMs: number) => void;
  onComplete?: () => void;
}

/**
 * Circular countdown with label. Call `start(durationMs)` / `stop()`.
 */
export class CountdownTimer extends Phaser.GameObjects.Container {
  private readonly radius: number;
  private track: Phaser.GameObjects.Graphics;
  private arc: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private durationMs = 0;
  private endsAt = 0;
  private running = false;
  private lastWholeSec = -1;
  private onTick?: (remainingMs: number) => void;
  private onComplete?: () => void;

  constructor(opts: CountdownTimerOptions) {
    super(opts.scene, opts.x, opts.y);
    this.radius = opts.radius ?? 34;
    this.onTick = opts.onTick;
    this.onComplete = opts.onComplete;

    this.track = opts.scene.add.graphics();
    this.arc = opts.scene.add.graphics();
    this.label = opts.scene.add
      .text(0, 0, '0', makeMonoStyle(opts.fontSize ?? 20, GameTheme.colors.textHex))
      .setOrigin(0.5);

    this.drawTrack();
    this.add([this.track, this.arc, this.label]);
    this.setDepth(opts.depth ?? GameTheme.depth.hud);
    opts.scene.add.existing(this);

    opts.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate, this);
    opts.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      opts.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate, this);
    });
  }

  start(durationMs: number): this {
    this.durationMs = Math.max(0, durationMs);
    this.endsAt = this.scene.time.now + this.durationMs;
    this.running = true;
    this.lastWholeSec = -1;
    this.setVisible(true);
    this.redraw(this.durationMs);
    return this;
  }

  /** Remaining ms; 0 if idle. */
  getRemaining(): number {
    if (!this.running) return 0;
    return Math.max(0, this.endsAt - this.scene.time.now);
  }

  stop(): this {
    this.running = false;
    return this;
  }

  private onSceneUpdate(): void {
    if (!this.running) return;
    const left = this.getRemaining();
    this.redraw(left);
    this.onTick?.(left);

    const whole = Math.ceil(left / 1000);
    if (whole !== this.lastWholeSec && left > 0) {
      this.lastWholeSec = whole;
      if (whole <= 3) {
        SoundManager.getInstance().play('tick');
        Haptics.selection();
      }
    }

    if (left <= 0) {
      this.running = false;
      this.label.setText('0');
      this.onComplete?.();
    }
  }

  private drawTrack(): void {
    this.track.clear();
    this.track.lineStyle(6, GameTheme.colors.border, 0.9);
    this.track.beginPath();
    this.track.arc(0, 0, this.radius, 0, Math.PI * 2, false);
    this.track.strokePath();
  }

  private redraw(remainingMs: number): void {
    const t = this.durationMs > 0 ? Phaser.Math.Clamp(remainingMs / this.durationMs, 0, 1) : 0;
    this.label.setText(formatCountdown(remainingMs));
    this.label.setColor(remainingMs <= 3000 ? GameTheme.colors.dangerHex : GameTheme.colors.textHex);

    this.arc.clear();
    if (t <= 0) return;
    const color = remainingMs <= 3000 ? GameTheme.colors.danger : GameTheme.colors.primary;
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * t;
    this.arc.lineStyle(6, color, 1);
    this.arc.beginPath();
    this.arc.arc(0, 0, this.radius, start, end, false);
    this.arc.strokePath();
  }
}

/** Alias matching the design-system name. */
export { CountdownTimer as Timer };
