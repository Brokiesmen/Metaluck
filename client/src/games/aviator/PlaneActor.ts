import Phaser from 'phaser';
import { getDeviceProfile } from '../core/DeviceProfile';
import type { FlightPose } from './FlightPath';

/**
 * Plane + engine fire/smoke + velocity trail. Mobile-tuned budgets.
 */
export class PlaneActor {
  readonly root: Phaser.GameObjects.Container;
  private plane: Phaser.GameObjects.Image;
  private bob?: Phaser.Tweens.Tween;
  private fire?: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke?: Phaser.GameObjects.Particles.ParticleEmitter;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  private scene: Phaser.Scene;
  private lowPower: boolean;
  private veryLow: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const device = getDeviceProfile();
    this.lowPower = device.lowPower;
    this.veryLow = device.veryLow;
    this.root = scene.add.container(0, 0);
    this.plane = scene.add.image(0, 0, 'av-plane').setOrigin(0.35, 0.55);
    this.plane.setScale(this.veryLow ? 0.7 : this.lowPower ? 0.78 : 0.88);
    this.root.add(this.plane);
    this.root.setDepth(40);
    this.buildParticles();
  }

  setVisible(v: boolean): void {
    this.root.setVisible(v);
    this.fire?.setVisible(v);
    this.smoke?.setVisible(v);
    this.trail?.setVisible(v);
  }

  setFlying(flying: boolean): void {
    if (flying) {
      this.fire?.start();
      this.smoke?.start();
      this.trail?.start();
      if (!this.bob && !getDeviceProfile().reducedMotion) {
        this.bob = this.scene.tweens.add({
          targets: this.plane,
          y: this.lowPower ? 2.2 : 3.8,
          angle: { from: -1.5, to: 1.5 },
          duration: this.lowPower ? 420 : 360,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      }
    } else {
      this.fire?.stop();
      this.smoke?.stop();
      this.trail?.stop();
      this.bob?.stop();
      this.bob = undefined;
      this.plane.y = 0;
      this.plane.angle = 0;
    }
  }

  applyPose(pose: FlightPose): void {
    this.root.setPosition(pose.x, pose.y);
    this.root.setAngle(pose.angle);
  }

  flyOff(toX: number, toY: number, duration = 780, onComplete?: () => void): void {
    this.setFlying(false);
    if (!this.veryLow) {
      this.fire?.start();
      this.trail?.start();
    }
    this.scene.tweens.add({
      targets: this.root,
      x: toX,
      y: toY,
      angle: this.root.angle - 28,
      scale: 0.45,
      alpha: 0,
      duration: this.lowPower ? Math.min(duration, 520) : duration,
      ease: 'Cubic.In',
      onComplete: () => {
        this.fire?.stop();
        this.trail?.stop();
        this.root.setVisible(false);
        this.root.setAlpha(1);
        this.root.setScale(1);
        onComplete?.();
      },
    });
  }

  resetAt(x: number, y: number): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(true);
    this.root.setAlpha(1);
    this.root.setScale(1);
    this.root.setPosition(x, y);
    this.root.setAngle(-6);
    this.setFlying(false);
  }

  destroy(): void {
    this.bob?.stop();
    this.fire?.stop();
    this.smoke?.stop();
    this.trail?.stop();
    this.fire?.destroy();
    this.smoke?.destroy();
    this.trail?.destroy();
    this.root.destroy(true);
  }

  private buildParticles(): void {
    if (this.veryLow) return;

    const fireQty = this.lowPower ? 8 : 16;
    const smokeQty = this.lowPower ? 5 : 10;

    this.fire = this.scene.add.particles(0, 0, 'av-fire', {
      follow: this.root,
      followOffset: { x: -24, y: 2 },
      speed: { min: 24, max: this.lowPower ? 55 : 85 },
      angle: { min: 155, max: 215 },
      lifespan: { min: 140, max: this.lowPower ? 260 : 340 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.95, end: 0 },
      frequency: this.lowPower ? 48 : 26,
      quantity: 1,
      blendMode: 'ADD',
      maxParticles: fireQty,
      tint: [0xff6b35, 0xffc14a, 0xff3d5a, 0xfff1a8],
    });
    this.fire.setDepth(35);
    this.fire.stop();

    this.trail = this.scene.add.particles(0, 0, 'av-spark', {
      follow: this.root,
      followOffset: { x: -18, y: 0 },
      speed: { min: 4, max: 18 },
      angle: { min: 170, max: 190 },
      lifespan: { min: 220, max: 420 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.55, end: 0 },
      frequency: this.lowPower ? 55 : 30,
      quantity: 1,
      blendMode: 'ADD',
      maxParticles: this.lowPower ? 6 : 12,
      tint: [0xff8fa3, 0xffffff],
    });
    this.trail.setDepth(33);
    this.trail.stop();

    if (!this.lowPower) {
      this.smoke = this.scene.add.particles(0, 0, 'av-smoke', {
        follow: this.root,
        followOffset: { x: -28, y: 4 },
        speed: { min: 8, max: 36 },
        angle: { min: 165, max: 205 },
        lifespan: { min: 300, max: 560 },
        scale: { start: 0.35, end: 1.15 },
        alpha: { start: 0.32, end: 0 },
        frequency: 42,
        quantity: 1,
        maxParticles: smokeQty,
        tint: [0x6b7788, 0x9aa7b8, 0xc5ced8],
      });
      this.smoke.setDepth(34);
      this.smoke.stop();
    }
  }
}
