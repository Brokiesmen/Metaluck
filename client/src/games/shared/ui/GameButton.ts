import Phaser from 'phaser';
import { SoundManager } from '../../core/SoundManager';
import { Haptics } from '../../core/Haptics';
import { getDeviceProfile } from '../../core/DeviceProfile';
import { GameTheme } from '../theme/tokens';
import { drawRoundRect, makeLabelStyle } from './draw';

export type GameButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';

export interface GameButtonOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  variant?: GameButtonVariant;
  disabled?: boolean;
  fontSize?: number;
  depth?: number;
  /** When false, caller parents the button (e.g. into a Container). Default true. */
  addToScene?: boolean;
  /** Disable haptic on tap (default false). */
  silentHaptic?: boolean;
  onClick?: () => void;
}

interface VariantColors {
  fill: number;
  fillHover: number;
  fillActive: number;
  text: string;
  border?: number;
}

const VARIANTS: Record<GameButtonVariant, VariantColors> = {
  primary: {
    fill: GameTheme.colors.primary,
    fillHover: GameTheme.colors.primaryHover,
    fillActive: 0x1f6fd6,
    text: '#ffffff',
  },
  secondary: {
    fill: GameTheme.colors.surfaceRaised,
    fillHover: GameTheme.colors.surfaceHover,
    fillActive: 0x15202c,
    text: GameTheme.colors.textHex,
    border: GameTheme.colors.border,
  },
  danger: {
    fill: GameTheme.colors.danger,
    fillHover: GameTheme.colors.dangerHover,
    fillActive: 0xd94864,
    text: '#ffffff',
  },
  ghost: {
    fill: 0x000000,
    fillHover: GameTheme.colors.surfaceRaised,
    fillActive: GameTheme.colors.surface,
    text: GameTheme.colors.textMutedHex,
    border: GameTheme.colors.border,
  },
  accent: {
    fill: GameTheme.colors.accent,
    fillHover: 0x58e8ad,
    fillActive: 0x2bc484,
    text: '#06140f',
  },
};

/**
 * Reusable Phaser button — touch-padded, hover-safe on coarse pointers.
 */
export class GameButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private hit: Phaser.GameObjects.Zone;
  private variant: GameButtonVariant;
  private btnWidth: number;
  private btnHeight: number;
  private disabled = false;
  private pressed = false;
  private hovered = false;
  private onClick?: () => void;
  private silentHaptic: boolean;
  private coarse: boolean;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(opts: GameButtonOptions) {
    super(opts.scene, opts.x, opts.y);
    const device = getDeviceProfile();
    this.coarse = device.coarsePointer;
    this.variant = opts.variant ?? 'primary';
    this.btnWidth = opts.width;
    this.btnHeight = opts.height;
    this.disabled = Boolean(opts.disabled);
    this.onClick = opts.onClick;
    this.silentHaptic = Boolean(opts.silentHaptic);

    this.bg = opts.scene.add.graphics();
    this.labelText = opts.scene.add
      .text(0, 0, opts.label, makeLabelStyle(opts.fontSize ?? 15, VARIANTS[this.variant].text))
      .setOrigin(0.5);

    const pad = device.touchPad;
    this.hit = opts.scene.add
      .zone(0, 0, this.btnWidth + pad * 2, this.btnHeight + pad * 2)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: !this.coarse });

    this.add([this.bg, this.labelText, this.hit]);
    this.setSize(this.btnWidth, this.btnHeight);
    this.setDepth(opts.depth ?? GameTheme.depth.hud);
    this.redraw();
    this.bindInput();

    if (opts.addToScene !== false) {
      opts.scene.add.existing(this);
    }
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  setVariant(variant: GameButtonVariant): this {
    this.variant = variant;
    this.labelText.setColor(VARIANTS[variant].text);
    this.redraw();
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.pressed = false;
    this.hovered = false;
    if (disabled) {
      this.setPulse(false);
      this.hit.disableInteractive();
    } else {
      this.hit.setInteractive({ useHandCursor: !this.coarse });
    }
    this.setAlpha(disabled ? 0.45 : 1);
    this.redraw();
    return this;
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  setHandler(handler: (() => void) | undefined): this {
    this.onClick = handler;
    return this;
  }

  /** Soft breathing scale — used for Cash Out affordance. */
  setPulse(active: boolean, scale = 1.045, duration = 720): this {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
      this.setScale(1);
    }
    if (!active || this.disabled || getDeviceProfile().reducedMotion) return this;
    this.pulseTween = this.scene.tweens.add({
      targets: this,
      scaleX: scale,
      scaleY: scale,
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    return this;
  }

  setSizePx(width: number, height: number): this {
    this.btnWidth = width;
    this.btnHeight = height;
    const pad = getDeviceProfile().touchPad;
    this.hit.setSize(width + pad * 2, height + pad * 2);
    this.setSize(width, height);
    this.redraw();
    return this;
  }

  private bindInput(): void {
    const release = (fire: boolean) => {
      if (this.disabled) return;
      const wasPressed = this.pressed;
      this.pressed = false;
      this.setScale(1);
      this.redraw();
      if (fire && wasPressed) {
        SoundManager.getInstance().unlock();
        SoundManager.getInstance().play('click');
        if (!this.silentHaptic) Haptics.impact('light');
        this.onClick?.();
      }
    };

    if (!this.coarse) {
      this.hit.on('pointerover', () => {
        if (this.disabled) return;
        this.hovered = true;
        this.redraw();
      });
    }

    this.hit.on('pointerout', () => {
      this.hovered = false;
      if (this.pressed) release(false);
      else {
        this.setScale(1);
        this.redraw();
      }
    });

    this.hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.disabled) return;
      // Ignore secondary mouse buttons; allow touch (button often 0).
      if (!pointer.wasTouch && pointer.button !== 0) return;
      SoundManager.getInstance().unlock();
      this.pressed = true;
      this.setScale(0.96);
      this.redraw();
    });

    this.hit.on('pointerup', () => release(true));
    this.hit.on('pointerupoutside', () => release(false));
  }

  private redraw(): void {
    const v = VARIANTS[this.variant];
    let fill = v.fill;
    if (!this.disabled) {
      if (this.pressed) fill = v.fillActive;
      else if (this.hovered && !this.coarse) fill = v.fillHover;
    }
    this.bg.clear();
    drawRoundRect(
      this.bg,
      -this.btnWidth / 2,
      -this.btnHeight / 2,
      this.btnWidth,
      this.btnHeight,
      GameTheme.radii.md,
      fill,
      1,
      v.border,
      this.disabled ? 0.35 : 0.9,
    );
  }
}
