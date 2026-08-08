import Phaser from 'phaser';
import { AviatorTheme } from '../config/theme';
import { Quality } from '../config/quality';
import { lerp } from '../engine/Easing';
import { TEX } from '../textures';
import type { AviatorStrings } from '../strings';

type MultState = 'normal' | 'elevated' | 'high' | 'extreme' | 'crash' | 'countdown' | 'idle';

export class MultiplierDisplay {
  private container: Phaser.GameObjects.Container;
  private valueText: Phaser.GameObjects.Text;
  private labelText: Phaser.GameObjects.Text;
  private aura: Phaser.GameObjects.Arc;
  private displayValue = 1;
  private targetValue = 1;
  private state: MultState = 'idle';
  private pulse = 0;
  private lastText = '';
  private lastColor = '';
  private scene: Phaser.Scene;
  private strings: AviatorStrings;

  constructor(scene: Phaser.Scene, strings: AviatorStrings) {
    this.scene = scene;
    this.strings = strings;
    const w = scene.scale.width;
    const h = scene.scale.height;

    const halo = scene.add.image(0, 0, TEX.glow);
    halo.setScale(Quality.isMobile ? 7 : 9);
    halo.setTint(0x2ef5d0);
    halo.setAlpha(0.22);
    if (Quality.useAddBlend) halo.setBlendMode(Phaser.BlendModes.ADD);

    this.aura = scene.add.circle(0, 0, Quality.isMobile ? 64 : 82, 0x2ef5d0, 0.035);
    if (Quality.useAddBlend) this.aura.setBlendMode(Phaser.BlendModes.ADD);

    this.labelText = scene.add
      .text(0, Quality.isMobile ? -40 : -52, strings.multiplier, {
        fontFamily: AviatorTheme.fonts.body,
        fontSize: Quality.isMobile ? '11px' : '13px',
        color: AviatorTheme.colors.textMuted,
      })
      .setOrigin(0.5);

    this.valueText = scene.add
      .text(0, 0, '1.00×', {
        fontFamily: AviatorTheme.fonts.display,
        fontSize: Quality.isMobile ? '48px' : '64px',
        color: AviatorTheme.multiplier.normal,
        fontStyle: '700',
        stroke: '#041018',
        strokeThickness: Quality.isMobile ? 4 : 6,
      })
      .setOrigin(0.5);
    this.valueText.setShadow(0, 0, '#2ef5d0', Quality.tier === 'low' ? 0 : 12, true, true);

    this.container = scene.add.container(w * 0.5, h * (Quality.isMobile ? 0.22 : 0.26), [
      halo,
      this.aura,
      this.labelText,
      this.valueText,
    ]);
    this.container.setDepth(40);
    this.container.setAlpha(0.95);
  }

  setIdle(): void {
    this.state = 'idle';
    this.targetValue = 1;
    this.displayValue = 1;
    this.labelText.setText(this.strings.waiting);
    this.setValueText('—', AviatorTheme.colors.textMuted);
    this.aura.setFillStyle(0x4d6bff, 0.04);
  }

  setCountdown(seconds: number): void {
    this.state = 'countdown';
    this.labelText.setText(this.strings.startingIn);
    const n = Math.ceil(seconds);
    this.setValueText(String(Math.max(0, n)), AviatorTheme.colors.text);
    this.aura.setFillStyle(0x2ef5d0, 0.08);
  }

  setFlight(mult: number): void {
    this.state = this.stateFromMult(mult);
    this.targetValue = mult;
    this.labelText.setText(this.strings.multiplier);
  }

  setCrash(mult: number): void {
    this.state = 'crash';
    this.targetValue = mult;
    this.displayValue = mult;
    this.labelText.setText(this.strings.crashedAt);
    this.setValueText(`${mult.toFixed(2)}×`, AviatorTheme.multiplier.crash);
    this.aura.setFillStyle(0xff4d7a, 0.16);

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  setResult(won: boolean, mult: number): void {
    this.labelText.setText(won ? this.strings.youWon : this.strings.roundOver);
    this.setValueText(
      `${mult.toFixed(2)}×`,
      won ? AviatorTheme.colors.gold : AviatorTheme.multiplier.crash,
    );
  }

  update(delta: number): void {
    this.pulse += delta * 0.003;

    if (this.state !== 'crash' && this.state !== 'countdown' && this.state !== 'idle') {
      const k = Quality.tier === 'low' ? 1 : 1 - Math.pow(0.0008, delta / 16);
      this.displayValue =
        Quality.tier === 'low' ? this.targetValue : lerp(this.displayValue, this.targetValue, k);
      const color = colorForState(this.stateFromMult(this.displayValue));
      this.setValueText(`${this.displayValue.toFixed(2)}×`, color);

      if (Quality.tier !== 'low') {
        this.aura.setFillStyle(
          Phaser.Display.Color.HexStringToColor(color).color,
          0.06 + Math.min(0.1, (this.displayValue - 1) * 0.015),
        );
      }
    }

    if (Quality.tier === 'high') {
      const breathe = 1 + Math.sin(this.pulse) * 0.012;
      this.aura.setScale(breathe * (1 + Math.min(0.35, (this.displayValue - 1) * 0.025)));
    }

    if (this.state !== 'countdown' && this.state !== 'idle' && Quality.tier !== 'low') {
      const s = 1 + Math.min(0.15, Math.log10(Math.max(1, this.displayValue)) * 0.1);
      this.valueText.setScale(s);
    } else {
      this.valueText.setScale(1);
    }
  }

  resize(width: number, height: number): void {
    this.container.setPosition(width * 0.5, height * (Quality.isMobile ? 0.22 : 0.26));
    this.valueText.setFontSize(Math.round(clampFont(width, height)));
  }

  pulseCountdown(): void {
    this.scene.tweens.add({
      targets: this.valueText,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 140,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.valueText);
    this.container.destroy();
  }

  private setValueText(text: string, color: string): void {
    if (text !== this.lastText) {
      this.valueText.setText(text);
      this.lastText = text;
    }
    if (color !== this.lastColor) {
      this.valueText.setColor(color);
      if (Quality.tier !== 'low') {
        this.valueText.setShadow(0, 0, color, 14, true, true);
      }
      this.lastColor = color;
    }
  }

  private stateFromMult(m: number): MultState {
    if (m >= 20) return 'extreme';
    if (m >= 10) return 'high';
    if (m >= 3) return 'elevated';
    return 'normal';
  }
}

function colorForState(state: MultState): string {
  switch (state) {
    case 'elevated':
      return AviatorTheme.multiplier.elevated;
    case 'high':
      return AviatorTheme.multiplier.high;
    case 'extreme':
      return AviatorTheme.multiplier.extreme;
    case 'crash':
      return AviatorTheme.multiplier.crash;
    default:
      return AviatorTheme.multiplier.normal;
  }
}

function clampFont(w: number, h: number): number {
  const base = Math.min(w, h);
  const min = Quality.isMobile ? 32 : 36;
  const max = Quality.isMobile ? 52 : 72;
  return Math.max(min, Math.min(max, base * (Quality.isMobile ? 0.08 : 0.09)));
}
