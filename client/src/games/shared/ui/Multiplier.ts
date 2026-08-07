import Phaser from 'phaser';
import { AnimationManager } from '../../core/AnimationManager';
import { getDeviceProfile } from '../../core/DeviceProfile';
import { GameTheme } from '../theme/tokens';
import { formatMultiplier } from '../theme/format';
import { makeMonoStyle } from './draw';

export interface MultiplierOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  value?: number;
  digits?: number;
  fontSize?: number;
  depth?: number;
}

/**
 * Large live multiplier with glow + scale presence (crash games).
 */
export class MultiplierDisplay extends Phaser.GameObjects.Container {
  private glow: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private value: number;
  private digits: number;
  private anim: AnimationManager;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private lastBucket = 0;

  constructor(opts: MultiplierOptions) {
    super(opts.scene, opts.x, opts.y);
    this.value = opts.value ?? 1;
    this.digits = opts.digits ?? 2;
    this.anim = AnimationManager.forScene(opts.scene);
    const size = opts.fontSize ?? 56;

    this.glow = opts.scene.add
      .text(0, 0, formatMultiplier(this.value, this.digits), makeMonoStyle(size + 2, GameTheme.colors.primaryHex))
      .setOrigin(0.5)
      .setAlpha(0.28);

    this.text = opts.scene.add
      .text(0, 0, formatMultiplier(this.value, this.digits), makeMonoStyle(size, GameTheme.colors.textHex))
      .setOrigin(0.5);

    this.add([this.glow, this.text]);
    this.setDepth(opts.depth ?? GameTheme.depth.hud);
    this.applyTone();
    opts.scene.add.existing(this);
  }

  getValue(): number {
    return this.value;
  }

  setValue(next: number, animate = true): this {
    this.value = next;
    if (next <= 1.001) this.lastBucket = 0;
    this.applyTone();

    const label = formatMultiplier(next, this.digits);
    this.text.setText(label);
    this.glow.setText(label);

    if (!animate) return this;

    // Live flight: snap text (count tween every frame would thrash). Soft punch on whole-number buckets.
    const bucket = Math.floor(next);
    if (bucket > this.lastBucket && bucket >= 2) {
      this.lastBucket = bucket;
      if (!getDeviceProfile().reducedMotion) {
        this.anim.punchScale(this, 1.06, 140);
      }
    }
    return this;
  }

  setLive(live: boolean): this {
    if (live && !this.pulseTween && !getDeviceProfile().reducedMotion) {
      this.pulseTween = this.scene.tweens.add({
        targets: [this.text, this.glow],
        scaleX: 1.045,
        scaleY: 1.045,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      this.glow.setAlpha(0.35);
    } else if (!live && this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
      this.text.setScale(1);
      this.glow.setScale(1);
      this.glow.setAlpha(0.22);
    }
    return this;
  }

  flash(): this {
    this.anim.punchScale(this, 1.14, 220);
    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.7,
      duration: 120,
      yoyo: true,
    });
    return this;
  }

  private applyTone(): void {
    let color: string = GameTheme.colors.textHex;
    let glow: string = GameTheme.colors.primaryHex;
    if (this.value >= 10) {
      color = GameTheme.colors.dangerHex;
      glow = GameTheme.colors.dangerHex;
    } else if (this.value >= 2) {
      color = GameTheme.colors.accentHex;
      glow = GameTheme.colors.accentHex;
    } else if (this.value >= 1.5) {
      color = GameTheme.colors.accentHotHex;
      glow = GameTheme.colors.accentHotHex;
    }
    this.text.setColor(color);
    this.glow.setColor(glow);
  }
}

export { MultiplierDisplay as Multiplier };
