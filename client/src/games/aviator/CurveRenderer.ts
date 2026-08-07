import Phaser from 'phaser';
import { getDeviceProfile } from '../core/DeviceProfile';
import { defaultFlightLayout, sampleCurve, type FlightLayout } from './FlightPath';

/** Rising flight curve with glow stroke (Spribe-like red/pink). */
export class CurveRenderer {
  private glow: Phaser.GameObjects.Graphics;
  private gfx: Phaser.GameObjects.Graphics;
  private layout: FlightLayout;
  private lastProgress = -1;
  private frame = 0;
  private readonly stride: number;
  private readonly points: number;
  private readonly withFill: boolean;

  private readonly stroke = 0xff4d6d;
  private readonly core = 0xffc6d4;
  private readonly lowPower: boolean;

  constructor(scene: Phaser.Scene) {
    const device = getDeviceProfile();
    this.glow = scene.add.graphics().setDepth(19).setAlpha(0.9);
    this.gfx = scene.add.graphics().setDepth(20);
    this.layout = defaultFlightLayout(scene.scale.width, scene.scale.height);
    this.stride = device.veryLow ? 3 : 2;
    this.points = device.veryLow ? 16 : device.lowPower ? 24 : 44;
    this.withFill = !device.veryLow;
    this.lowPower = device.lowPower;
  }

  setLayout(layout: FlightLayout): void {
    this.layout = layout;
    this.lastProgress = -1;
  }

  clear(): void {
    this.glow.clear();
    this.gfx.clear();
    this.lastProgress = -1;
  }

  draw(progress: number, force = false): void {
    this.frame++;
    if (
      !force &&
      this.frame % this.stride !== 0 &&
      Math.abs(progress - this.lastProgress) < 0.004
    ) {
      return;
    }
    this.lastProgress = progress;
    this.glow.clear();
    this.gfx.clear();
    if (progress <= 0.001) return;

    const pts = sampleCurve(progress, this.layout, this.points);
    if (pts.length < 2) return;
    const baseY = this.layout.originY + 10;

    // Area fill — vertical gradient that follows the curve and fades to nothing
    // at the baseline (per-vertex alpha on paired triangles per strip).
    if (this.withFill) {
      const topA = this.lowPower ? 0.22 : 0.34;
      // Left triangle of each strip: two top verts lit, base vert transparent.
      this.gfx.fillGradientStyle(this.stroke, this.stroke, this.stroke, this.stroke, topA, topA, 0, 0);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        this.gfx.fillTriangle(a.x, a.y, b.x, b.y, a.x, baseY);
      }
      // Right triangle: one top vert lit, two base verts transparent.
      this.gfx.fillGradientStyle(this.stroke, this.stroke, this.stroke, this.stroke, topA, 0, 0, 0);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        this.gfx.fillTriangle(b.x, b.y, b.x, baseY, a.x, baseY);
      }
    }

    // Neon glow — wide diffuse halo + tighter bloom.
    if (!this.lowPower) {
      this.strokeAlong(this.glow, pts, 16, this.stroke, 0.1);
    }
    this.strokeAlong(this.glow, pts, 9, this.stroke, 0.2);

    // Body stroke with a hot light core running through it.
    this.strokeAlong(this.gfx, pts, this.withFill ? 4.5 : 3, this.stroke, 1);
    this.strokeAlong(this.gfx, pts, 1.8, this.core, 0.95);

    // Glowing leading tip.
    const tip = pts[pts.length - 1];
    if (!this.lowPower) {
      this.gfx.fillStyle(this.stroke, 0.22);
      this.gfx.fillCircle(tip.x, tip.y, 13);
    }
    this.gfx.fillStyle(this.stroke, 0.6);
    this.gfx.fillCircle(tip.x, tip.y, 7);
    this.gfx.fillStyle(0xffffff, 1);
    this.gfx.fillCircle(tip.x, tip.y, 3.4);
  }

  private strokeAlong(
    g: Phaser.GameObjects.Graphics,
    pts: Array<{ x: number; y: number }>,
    width: number,
    color: number,
    alpha: number,
  ): void {
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  }

  destroy(): void {
    this.glow.destroy();
    this.gfx.destroy();
  }
}
