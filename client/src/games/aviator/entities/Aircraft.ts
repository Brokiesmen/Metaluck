import Phaser from 'phaser';
import { Quality } from '../config/quality';
import type { FlightCurve } from '../engine/FlightCurve';
import { lerp, lerpAngle } from '../engine/Easing';
import { TEX } from '../textures';

export class Aircraft {
  readonly container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private afterburner: Phaser.GameObjects.Image;
  private tipLight: Phaser.GameObjects.Arc;
  private speedLines: Phaser.GameObjects.Graphics;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fireEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private smokeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bob = 0;
  private crashed = false;
  private visibleFlight = false;
  private targetX = 0;
  private targetY = 0;
  private targetAngle = 0;
  private bank = 0;
  private scene: Phaser.Scene;
  private curve: FlightCurve;
  private baseScale: number;
  private lastProgress = 0;
  private climbHeat = 0;

  constructor(scene: Phaser.Scene, curve: FlightCurve) {
    this.scene = scene;
    this.curve = curve;
    this.baseScale = Quality.isMobile ? 0.68 : 0.82;
    const start = curve.pointAt(0);

    this.shadow = scene.add.image(12, 22, TEX.aircraftShadow);
    this.shadow.setOrigin(0.42, 0.5);
    this.shadow.setAlpha(0.35);

    this.glow = scene.add.image(-28, 0, TEX.glow);
    this.glow.setScale(2.8);
    this.glow.setTint(0x2ef5d0);
    this.glow.setAlpha(0.5);
    if (Quality.useAddBlend) this.glow.setBlendMode(Phaser.BlendModes.ADD);

    this.afterburner = scene.add.image(-38, 0, TEX.fire);
    this.afterburner.setScale(1.6);
    this.afterburner.setTint(0xff8a3d);
    this.afterburner.setAlpha(0);
    if (Quality.useAddBlend) this.afterburner.setBlendMode(Phaser.BlendModes.ADD);

    this.sprite = scene.add.image(0, 0, TEX.aircraft);
    this.sprite.setOrigin(0.38, 0.52);

    this.tipLight = scene.add.circle(36, -14, 2.6, 0xffb347, 0.95);
    if (Quality.useAddBlend) this.tipLight.setBlendMode(Phaser.BlendModes.ADD);

    this.speedLines = scene.add.graphics();
    this.speedLines.setAlpha(0);

    this.container = scene.add.container(start.x, start.y, [
      this.shadow,
      this.glow,
      this.afterburner,
      this.speedLines,
      this.sprite,
      this.tipLight,
    ]);
    this.container.setDepth(20);
    this.container.setScale(this.baseScale);
    this.targetX = start.x;
    this.targetY = start.y;

    const blend = Quality.useAddBlend ? 'ADD' : 'NORMAL';

    this.trailEmitter = scene.add.particles(0, 0, TEX.glow, {
      speed: { min: 2, max: 12 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: Quality.tier === 'low' ? 360 : 640,
      frequency: Quality.trailFrequency,
      quantity: 1,
      tint: [0x2ef5d0, 0x7ef5c8, 0xffffff],
      blendMode: blend,
      follow: this.container,
      followOffset: { x: -28, y: 2 },
      maxParticles: Quality.trailMaxParticles,
      emitting: false,
    });
    this.trailEmitter.setDepth(18);

    if (Quality.fireMaxParticles > 0) {
      this.fireEmitter = scene.add.particles(0, 0, TEX.fire, {
        speed: { min: 30, max: 90 },
        angle: { min: 168, max: 192 },
        scale: { start: 0.75, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 240,
        frequency: Math.max(36, Quality.engineFrequency),
        quantity: 1,
        tint: [0xffffff, 0xffe08a, 0xff8a3d],
        blendMode: blend,
        follow: this.container,
        followOffset: { x: -36, y: 1 },
        maxParticles: Quality.fireMaxParticles,
        emitting: false,
      });
      this.fireEmitter.setDepth(19);
    }

    if (Quality.smokeEnabled) {
      this.smokeEmitter = scene.add.particles(0, 0, TEX.smoke, {
        speed: { min: 6, max: 22 },
        angle: { min: 160, max: 200 },
        scale: { start: 0.45, end: 1.2 },
        alpha: { start: 0.22, end: 0 },
        lifespan: 560,
        frequency: 90,
        quantity: 1,
        tint: [0x8aa0b8, 0x6a8098],
        blendMode: 'NORMAL',
        follow: this.container,
        followOffset: { x: -30, y: 4 },
        maxParticles: 10,
        emitting: false,
      });
      this.smokeEmitter.setDepth(17);
    }

    this.hide();
  }

  showReady(): void {
    this.crashed = false;
    this.visibleFlight = false;
    this.lastProgress = 0;
    this.climbHeat = 0;
    this.bank = 0;
    this.sprite.setTint(0xffffff);
    this.sprite.setAngle(0);
    this.glow.setTint(0x2ef5d0);
    this.glow.setAlpha(0.48);
    this.afterburner.setAlpha(0);
    this.afterburner.setTint(0xff8a3d);
    this.tipLight.setFillStyle(0xffb347, 0.95);
    this.speedLines.clear();
    this.speedLines.setAlpha(0);
    this.trailEmitter?.stop();
    this.fireEmitter?.stop();
    this.smokeEmitter?.stop();

    // Strict start pad — same coords as flight t=0
    this.snapToStart(false);

    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(0);
    this.container.setScale(this.baseScale);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 420,
      ease: 'Sine.easeOut',
    });
  }

  startFlight(): void {
    this.crashed = false;
    // Begin exactly where the waiting plane sits
    this.snapToStart(true);
    this.visibleFlight = true;
    this.climbHeat = 1;
    this.container.setAlpha(1);
    this.trailEmitter?.start();
    this.fireEmitter?.start();
    this.smokeEmitter?.start();

    // Launch thrust bloom
    const boom = this.scene.add.image(this.container.x - 20, this.container.y, TEX.glow);
    boom.setTint(0xffe08a);
    boom.setScale(0.5);
    boom.setAlpha(0.9);
    boom.setDepth(21);
    if (Quality.useAddBlend) boom.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: boom,
      scale: 4.5,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => boom.destroy(),
    });

    // Brief takeoff scale punch
    this.scene.tweens.add({
      targets: this.container,
      scaleX: this.baseScale * 1.08,
      scaleY: this.baseScale * 1.08,
      duration: 140,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  /** Keep the waiting plane locked to the flight origin after a resize. */
  syncStartIfWaiting(): void {
    if (!this.crashed && !this.visibleFlight && this.container.alpha > 0) {
      this.snapToStart(false);
    }
  }

  update(delta: number, multiplier: number): void {
    this.bob += delta * 0.0045;
    this.climbHeat = Math.max(0, this.climbHeat - delta * 0.0012);

    if (this.crashed || !this.visibleFlight) {
      if (!this.crashed && this.container.alpha > 0) {
        // Stay glued to the takeoff point — no bob drift before the round
        const p = this.curve.pointAt(0);
        this.targetX = p.x;
        this.targetY = p.y;
        this.container.setPosition(p.x, p.y);
        this.container.setRotation(0);
        this.tipLight.setAlpha(0.55 + Math.sin(this.bob * 2.2) * 0.35);
      }
      return;
    }

    const t = this.curve.progressFromMultiplier(multiplier);
    const p = this.curve.pointAt(t);
    const angle = this.curve.angleAt(t);
    const curv = this.curve.curvatureAt(t);
    const mobile = Quality.isMobile || this.curve.isPortrait;

    this.targetX = p.x;
    this.targetY = p.y;
    // Allow a steeper nose-up on takeoff so the climb reads clearly
    this.targetAngle = mobile
      ? Phaser.Math.Clamp(angle, -0.85, 0.1)
      : Phaser.Math.Clamp(angle, -1.05, 0.15);

    const bankGain = mobile ? 6 : 16;
    const bankMax = mobile ? 0.18 : 0.35;
    const targetBank = Phaser.Math.Clamp(curv * bankGain, -bankMax, bankMax);
    this.bank = lerp(this.bank, targetBank, mobile ? 0.05 : 0.08);

    const bobAmp = mobile ? 0.8 : 1.6;
    if (Quality.tier === 'low' && !mobile) {
      this.container.x = this.targetX;
      this.container.y = this.targetY + Math.sin(this.bob) * bobAmp;
      this.container.rotation = this.targetAngle;
    } else {
      const k = mobile ? 1 - Math.pow(0.002, delta / 16) : 1 - Math.pow(0.0007, delta / 16);
      this.container.x = lerp(this.container.x, this.targetX, k);
      this.container.y = lerp(this.container.y, this.targetY + Math.sin(this.bob) * bobAmp, k);
      this.container.rotation = lerpAngle(
        this.container.rotation,
        this.targetAngle,
        k * (mobile ? 0.7 : 0.9),
      );
    }
    this.sprite.setAngle(Phaser.Math.RadToDeg(this.bank) * (mobile ? 0.45 : 0.85));

    const intensity = Math.min(1, (multiplier - 1) / 6);
    const climbDelta = Math.max(0, t - this.lastProgress);
    this.lastProgress = t;
    this.climbHeat = Math.min(1.4, this.climbHeat + climbDelta * 8);

    const thrust = Math.min(1, intensity * 0.7 + this.climbHeat * 0.55);

    this.glow.setScale(2.4 + intensity * 2 + this.climbHeat * 0.8);
    this.glow.setAlpha(0.4 + intensity * 0.35 + this.climbHeat * 0.15);
    this.afterburner.setAlpha(0.2 + thrust * 0.75);
    this.afterburner.setScale(1.3 + thrust * 2.2);
    this.afterburner.setTint(thrust > 0.6 ? 0xffe08a : 0xff8a3d);
    this.tipLight.setAlpha(0.55 + Math.sin(this.bob * 3.2) * 0.4);

    this.shadow.y = 18 + intensity * 10;
    this.shadow.x = 10 - this.bank * 18;
    this.shadow.setAlpha(0.32 - intensity * 0.12);

    this.drawSpeedLines(Math.max(intensity, this.climbHeat * 0.85));

    if (this.trailEmitter) {
      this.trailEmitter.frequency = Math.max(
        16,
        Quality.trailFrequency - intensity * 18 - this.climbHeat * 10,
      );
    }
    if (this.fireEmitter) {
      this.fireEmitter.frequency = Math.max(20, 48 - thrust * 24);
    }
  }

  playCrash(): void {
    this.crashed = true;
    this.visibleFlight = false;
    this.trailEmitter?.stop();
    this.fireEmitter?.stop();
    this.smokeEmitter?.stop();
    this.speedLines.setAlpha(0);

    this.sprite.setTint(0xff6b8a);
    this.glow.setTint(0xff4d7a);
    this.glow.setAlpha(0.85);
    this.afterburner.setTint(0xff4d7a);
    this.tipLight.setFillStyle(0xff4d7a, 1);

    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y + 180,
      x: this.container.x + 42,
      rotation: this.container.rotation + 1.35,
      alpha: 0,
      scale: this.baseScale * 0.4,
      duration: 640,
      ease: 'Cubic.easeIn',
    });
  }

  hide(): void {
    this.visibleFlight = false;
    this.crashed = false;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(0);
    this.trailEmitter?.stop();
    this.fireEmitter?.stop();
    this.smokeEmitter?.stop();
    this.speedLines.clear();
    this.speedLines.setAlpha(0);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.trailEmitter?.destroy();
    this.fireEmitter?.destroy();
    this.smokeEmitter?.destroy();
    this.container.destroy();
  }

  /**
   * Pin to curve t=0 — the exact takeoff point.
   * Waiting: level on the pad. Flight start: path tangent.
   */
  private snapToStart(forFlight: boolean): void {
    const p = this.curve.pointAt(0);
    this.targetX = p.x;
    this.targetY = p.y;
    this.targetAngle = forFlight ? this.curve.angleAt(0) : 0;
    this.container.setPosition(p.x, p.y);
    this.container.setRotation(this.targetAngle);
    this.bank = 0;
    this.sprite.setAngle(0);
    this.lastProgress = 0;
  }

  private drawSpeedLines(intensity: number): void {
    this.speedLines.clear();
    if (intensity < 0.12 || Quality.tier === 'low') {
      this.speedLines.setAlpha(0);
      return;
    }
    this.speedLines.setAlpha(0.28 + intensity * 0.45);
    const n = Quality.isMobile || Quality.tier === 'medium' ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const y = -10 + i * 5 + Math.sin(this.bob * 1.5 + i) * 1.4;
      const len = 18 + intensity * 28 + i * 3;
      const a = 0.35 + (i / n) * 0.45;
      this.speedLines.lineStyle(1.2 + intensity * 0.6, 0xa8fff0, a);
      this.speedLines.lineBetween(-20 - intensity * 6, y, -20 - len, y * 0.85);
    }
  }
}
