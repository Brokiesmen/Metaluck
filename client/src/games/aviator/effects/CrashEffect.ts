import Phaser from 'phaser';
import { Quality } from '../config/quality';
import { AviatorTheme } from '../config/theme';
import { Haptics } from '../../core/Haptics';
import { TEX } from '../textures';

export class CrashEffect {
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  burst(x: number, y: number): void {
    this.emitter?.destroy();
    const n = Quality.crashParticles;
    this.emitter = this.scene.add.particles(x, y, TEX.glow, {
      speed: { min: 60, max: 240 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 240, max: 520 },
      quantity: n,
      tint: [0xff4d7a, 0xffb347, 0xffffff],
      blendMode: Quality.useAddBlend ? 'ADD' : 'NORMAL',
      emitting: false,
      maxParticles: n,
    });
    this.emitter.setDepth(30);
    this.emitter.explode(n);

    const ring = this.scene.add.circle(x, y, 10, 0xff4d7a, 0);
    ring.setStrokeStyle(2, 0xff4d7a, 0.85);
    ring.setDepth(31);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 7,
      scaleY: 7,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  destroy(): void {
    this.emitter?.destroy();
    this.emitter = null;
  }
}

/** Premium cashout celebration — rings, confetti, sparkles, WIN banner. */
export class WinEffect {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  celebrate(x: number, y: number, label: string): void {
    const cam = this.scene.cameras.main;
    cam.flash(180, 255, 220, 120, false);
    if (Quality.tier !== 'low') {
      cam.zoomTo(1.04, 160, 'Sine.easeOut', true, (_c, progress) => {
        if (progress === 1) cam.zoomTo(1, 280, 'Sine.easeInOut');
      });
    }

    // Expanding gold rings
    for (let i = 0; i < (Quality.tier === 'low' ? 1 : 2); i++) {
      const ring = this.scene.add.circle(x, y, 8 + i * 4, 0xf6d36a, 0);
      ring.setStrokeStyle(2.5 - i * 0.4, i === 0 ? 0xffffff : 0xf6d36a, 0.9);
      ring.setDepth(36);
      if (Quality.useAddBlend) ring.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 5 + i * 2.5,
        scaleY: 5 + i * 2.5,
        alpha: 0,
        duration: 520 + i * 120,
        delay: i * 70,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    const confettiCount = Quality.winParticles;
    const confetti = this.scene.add.particles(x, y, TEX.confetti, {
      speed: { min: 80, max: 240 },
      angle: { min: 200, max: 340 },
      gravityY: 280,
      scale: { start: 1.1, end: 0.35 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 600, max: 1100 },
      quantity: confettiCount,
      rotate: { min: 0, max: 360 },
      tint: [0xf6d36a, 0x2ef5d0, 0xff6b9d, 0xffffff, 0xffb347],
      blendMode: Quality.useAddBlend ? 'ADD' : 'NORMAL',
      emitting: false,
      maxParticles: confettiCount,
    });
    confetti.setDepth(35);
    confetti.explode(confettiCount);

    const sparks = Quality.tier === 'low' ? 6 : Quality.tier === 'medium' ? 10 : 14;
    const sparkle = this.scene.add.particles(x, y + 20, TEX.sparkle, {
      speed: { min: 40, max: 160 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 900,
      quantity: sparks,
      tint: [0xffffff, 0xf6d36a, 0x2ef5d0],
      blendMode: Quality.useAddBlend ? 'ADD' : 'NORMAL',
      emitting: false,
      maxParticles: sparks,
    });
    sparkle.setDepth(37);
    sparkle.explode(sparks);

    const fountain = this.scene.add.particles(x, y, TEX.glow, {
      speed: { min: 20, max: 120 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 800,
      quantity: Quality.winParticles,
      tint: [0xf6d36a, 0xffe08a],
      blendMode: Quality.useAddBlend ? 'ADD' : 'NORMAL',
      emitting: false,
      maxParticles: Quality.winParticles,
    });
    fountain.setDepth(34);
    fountain.explode(Quality.winParticles);

    const winText = this.scene.add
      .text(x, y - 10, label, {
        fontFamily: AviatorTheme.fonts.display,
        fontSize: Quality.isMobile ? '28px' : '36px',
        color: AviatorTheme.colors.gold,
        stroke: '#1a1200',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0)
      .setScale(0.4);
    winText.setShadow(0, 0, '#f6d36a', 16, true, true);

    this.scene.tweens.add({
      targets: winText,
      alpha: 1,
      scale: 1,
      y: y - 36,
      duration: 320,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: winText,
      alpha: 0,
      y: y - 70,
      delay: 1100,
      duration: 420,
      ease: 'Sine.easeIn',
      onComplete: () => winText.destroy(),
    });

    this.scene.time.delayedCall(1600, () => {
      confetti.destroy();
      sparkle.destroy();
      fountain.destroy();
    });

    Haptics.notify('success');
  }
}

export function shakeCamera(scene: Phaser.Scene, duration = 360, intensity = 0.01): void {
  if (Quality.tier === 'low') {
    scene.cameras.main.shake(Math.min(duration, 220), intensity * 0.6);
    return;
  }
  scene.cameras.main.shake(duration, intensity);
}
