import Phaser from 'phaser';
import { Quality } from '../config/quality';
import type { FlightCurve } from '../engine/FlightCurve';
import { TEX } from '../textures';

/**
 * Neon flight ribbon that brightens toward the aircraft.
 * Segment-based fade gives a premium "wake" without shaders.
 */
export class FlightPath {
  private graphics: Phaser.GameObjects.Graphics;
  private tip: Phaser.GameObjects.Image;
  private tipCore: Phaser.GameObjects.Image;
  private progress = 0;
  private drawnProgress = -1;
  private curve: FlightCurve;
  private pulse = 0;

  constructor(scene: Phaser.Scene, curve: FlightCurve) {
    this.curve = curve;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);

    this.tip = scene.add.image(0, 0, TEX.glow);
    this.tip.setDepth(12);
    this.tip.setTint(0x2ef5d0);
    this.tip.setScale(1.8);
    this.tip.setAlpha(0);
    if (Quality.useAddBlend) this.tip.setBlendMode(Phaser.BlendModes.ADD);

    this.tipCore = scene.add.image(0, 0, TEX.soft);
    this.tipCore.setDepth(13);
    this.tipCore.setTint(0xffffff);
    this.tipCore.setScale(1.2);
    this.tipCore.setAlpha(0);
    if (Quality.useAddBlend) this.tipCore.setBlendMode(Phaser.BlendModes.ADD);
  }

  setProgress(t: number): void {
    const next = Math.max(0, Math.min(1, t));
    if (Math.abs(next - this.drawnProgress) < Quality.pathRedrawMinDelta && next < 0.99) {
      this.progress = next;
      this.updateTip();
      return;
    }
    this.progress = next;
    this.redraw();
  }

  /** Call from the scene update for tip pulse without a full redraw. */
  tick(delta: number): void {
    this.pulse += delta * 0.008;
    if (this.progress > 0.001) this.updateTip();
  }

  clear(): void {
    this.progress = 0;
    this.drawnProgress = -1;
    this.graphics.clear();
    this.tip.setAlpha(0);
    this.tipCore.setAlpha(0);
  }

  resize(): void {
    this.drawnProgress = -1;
    this.redraw();
  }

  destroy(): void {
    this.graphics.destroy();
    this.tip.destroy();
    this.tipCore.destroy();
  }

  private redraw(): void {
    this.graphics.clear();
    this.drawnProgress = this.progress;
    if (this.progress <= 0.001) {
      this.tip.setAlpha(0);
      this.tipCore.setAlpha(0);
      return;
    }

    const samples = Math.max(8, Math.floor(this.progress * Quality.pathSamples));
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      pts.push(this.curve.pointAt((i / samples) * this.progress));
    }

    // Softer ribbon on mobile — thick jagged strokes look harsh on tall screens
    if (Quality.pathStrokes >= 2) {
      const glowW = Quality.isMobile ? 7 : 14;
      this.graphics.lineStyle(glowW, 0x2ef5d0, Quality.isMobile ? 0.07 : 0.08);
      this.drawPoly(pts);
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const u = (i + 1) / (pts.length - 1);
      const a = Quality.isMobile ? 0.18 + u * 0.55 : 0.12 + u * 0.75;
      const width = Quality.isMobile ? 2 + u * 1.1 : 2.8 + u * 2;
      const color = u > 0.75 ? 0xe8fff8 : u > 0.4 ? 0x7ef5c8 : 0x2ef5d0;
      this.graphics.lineStyle(width, color, a);
      this.graphics.beginPath();
      this.graphics.moveTo(pts[i]!.x, pts[i]!.y);
      this.graphics.lineTo(pts[i + 1]!.x, pts[i + 1]!.y);
      this.graphics.strokePath();
    }

    // Energy nodes near the tip
    if (Quality.tier !== 'low' && pts.length > 5) {
      const start = Math.floor(pts.length * 0.45);
      for (let i = start; i < pts.length - 1; i += Quality.tier === 'high' ? 2 : 3) {
        const u = i / (pts.length - 1);
        this.graphics.fillStyle(0xffffff, 0.15 + u * 0.35);
        this.graphics.fillCircle(pts[i]!.x, pts[i]!.y, 1.2 + u * 1.4);
      }
    }

    this.updateTip();
  }

  private updateTip(): void {
    if (this.progress <= 0.001) {
      this.tip.setAlpha(0);
      this.tipCore.setAlpha(0);
      return;
    }
    const p = this.curve.pointAt(this.progress);
    const beat = 1 + Math.sin(this.pulse) * 0.12;
    this.tip.setPosition(p.x, p.y);
    this.tip.setAlpha(0.5 + Math.min(0.4, this.progress));
    this.tip.setScale((1.4 + this.progress * 1.1) * beat);

    this.tipCore.setPosition(p.x, p.y);
    this.tipCore.setAlpha(0.7);
    this.tipCore.setScale(1.1 * beat);
  }

  private drawPoly(pts: { x: number; y: number }[]): void {
    if (pts.length < 2) return;
    this.graphics.beginPath();
    this.graphics.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) this.graphics.lineTo(pts[i]!.x, pts[i]!.y);
    this.graphics.strokePath();
  }
}
