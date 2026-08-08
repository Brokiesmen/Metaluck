import Phaser from 'phaser';
import { Quality } from '../config/quality';
import { TEX } from '../textures';

/**
 * Cinematic night-flight atmosphere.
 * As altitude rises the ground drops away, clouds rush past and the sky
 * deepens — that parallax is what sells the sense of flight.
 */
export class BackgroundLayers {
  private root: Phaser.GameObjects.Container;
  private sky: Phaser.GameObjects.Graphics;
  private skyOverlay: Phaser.GameObjects.Rectangle;
  private starsLayer: Phaser.GameObjects.Image | null = null;
  private starTextureKeys = new Set<string>();
  private nebulae: Phaser.GameObjects.Image[] = [];
  private horizon: Phaser.GameObjects.Image | null = null;
  private clouds: Phaser.GameObjects.Image[] = [];
  private grid: Phaser.GameObjects.Graphics;
  private lightSweep: Phaser.GameObjects.Rectangle | null = null;
  private moon: Phaser.GameObjects.Arc | null = null;
  private moonRing: Phaser.GameObjects.Arc | null = null;
  private windStreaks: Phaser.GameObjects.Graphics;
  private t = 0;
  private width = 0;
  private height = 0;
  private scene: Phaser.Scene;
  private cloudAccum = 0;
  /** Smoothed 0..1 climb amount for parallax. */
  private altitude = 0;
  private targetAltitude = 0;
  private scrollX = 0;
  private lastHorizonA = -1;
  private horizonTinted = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.width = scene.scale.width;
    this.height = scene.scale.height;

    this.sky = scene.add.graphics();
    this.skyOverlay = scene.add.rectangle(
      this.width * 0.5,
      this.height * 0.5,
      this.width,
      this.height,
      0x02081a,
      0,
    );
    this.skyOverlay.setDepth(0);
    this.grid = scene.add.graphics();
    this.windStreaks = scene.add.graphics();
    this.windStreaks.setDepth(5);

    const children: Phaser.GameObjects.GameObject[] = [this.sky, this.grid];

    if (Quality.lightSweep) {
      this.lightSweep = scene.add.rectangle(0, 0, 120, this.height * 2.1, 0x7ef5c8, 0.018);
      this.lightSweep.setBlendMode(
        Quality.useAddBlend ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
      );
      this.lightSweep.setAngle(-18);
      children.push(this.lightSweep);
    }

    this.root = scene.add.container(0, 0, children);
    this.root.setDepth(0);

    this.paintSky();
    this.bakeStars();
    this.spawnNebulae();
    this.spawnMoon();
    this.spawnHorizon();
    this.spawnClouds();
    this.paintGrid();
  }

  /**
   * @param altitude 0..1 flight-path progress (how high the plane has climbed)
   */
  update(delta: number, altitude = 0): void {
    this.t += delta * 0.001;
    this.targetAltitude = Phaser.Math.Clamp(altitude, 0, 1);
    const k = 1 - Math.pow(0.0012, delta / 16);
    this.altitude = Phaser.Math.Linear(this.altitude, this.targetAltitude, k);

    const a = this.altitude;
    if (a > 0.01) this.scrollX += (0.12 + a * a * 1.8) * (delta / 16);

    // Throttle the heavier layer work
    this.cloudAccum += delta;
    const step = Quality.tier === 'low' ? 40 : Quality.tier === 'medium' ? 28 : 20;
    if (this.cloudAccum >= step) {
      const dt = this.cloudAccum;
      this.cloudAccum = 0;
      this.updateClouds(dt, a);
      if (Quality.windStreaks) this.drawWindStreaks(a);
    }

    // Horizon — setDisplaySize is expensive; only refresh when altitude moves
    if (this.horizon) {
      const drop = a * this.height * 0.55;
      this.horizon.y = this.height * 0.78 + drop;
      this.horizon.x =
        a > 0.02
          ? this.width * 0.5 - ((this.scrollX * 0.45) % (this.width * 0.35))
          : this.width * 0.5;
      this.horizon.setAlpha(Math.max(0, 0.92 - a * 1.15));

      if (Math.abs(a - this.lastHorizonA) > 0.03) {
        this.lastHorizonA = a;
        const shrink = 1 - a * 0.35;
        this.horizon.setDisplaySize(
          this.width * (1.05 + a * 0.3) * shrink,
          Math.max(36, this.height * 0.16 * shrink),
        );
        const wantTint = a > 0.35;
        if (wantTint !== this.horizonTinted) {
          this.horizonTinted = wantTint;
          if (wantTint) this.horizon.setTint(0x6a90c8);
          else this.horizon.clearTint();
        }
      }
    }

    // Grid — cheap transforms only
    const gridAlpha = Math.max(0, 0.11 * (1 - a * 1.4));
    this.grid.setAlpha(gridAlpha);
    if (gridAlpha > 0.01) {
      this.grid.y = a * this.height * 0.4;
      this.grid.x = -((this.scrollX * 8) % 40);
    }

    if (this.starsLayer) {
      this.starsLayer.setAlpha(0.55 + a * 0.55);
      if (Quality.tier !== 'low') this.starsLayer.y = -a * this.height * 0.1;
    }

    this.skyOverlay.setAlpha(a * 0.4);

    if (Quality.tier !== 'low') {
      for (const n of this.nebulae) {
        const spd = (n.getData('speed') as number) ?? 2;
        const baseY = (n.getData('baseY') as number) ?? n.y;
        n.x -= spd * (delta / 1000) * (0.5 + a * 3);
        if (n.x < -100) n.x = this.width + 80;
        n.y = baseY + a * this.height * 0.16;
        n.setAlpha(0.1 + a * 0.2);
      }
    }

    if (this.lightSweep) {
      this.lightSweep.x = ((this.t * (36 + a * 70)) % (this.width + 240)) - 110;
      this.lightSweep.setAlpha(0.01 + a * 0.06);
    }

    if (this.moon) {
      this.moon.setAlpha(0.18 + a * 0.25);
      this.moonRing?.setAlpha(0.45 + a * 0.4);
    }
  }

  setCrashFlash(): void {
    this.scene.cameras.main.flash(240, 255, 55, 95, false);
    if (this.horizon) {
      this.horizon.setTint(0xff6b8a);
      this.scene.time.delayedCall(420, () => this.horizon?.clearTint());
    }
  }

  /** Snap altitude back for the next round. */
  resetAltitude(): void {
    this.targetAltitude = 0;
    this.altitude = 0;
    this.scrollX = 0;
    this.lastHorizonA = -1;
    this.horizonTinted = false;
    this.grid.x = 0;
    this.grid.y = 0;
    this.windStreaks.clear();
    if (this.horizon) {
      this.horizon.clearTint();
      this.horizon.setAlpha(0.9);
      this.horizon.setPosition(this.width * 0.5, this.height * 0.78);
      this.horizon.setDisplaySize(this.width * 1.05, Math.max(70, this.height * 0.16));
    }
    if (this.starsLayer) {
      this.starsLayer.setAlpha(0.9);
      this.starsLayer.setPosition(0, 0);
    }
    this.skyOverlay.setAlpha(0);
    for (const cloud of this.clouds) {
      cloud.y = cloud.getData('baseY') as number;
      cloud.setAlpha(cloud.getData('baseAlpha') as number);
      cloud.setScale(cloud.getData('baseScale') as number);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.paintSky();
    this.bakeStars();
    this.paintGrid();
    this.skyOverlay.setPosition(width * 0.5, height * 0.5);
    this.skyOverlay.setSize(width, height);
    this.lightSweep?.setSize(120, height * 2.1);

    if (this.horizon) {
      this.horizon.setPosition(width * 0.5, height * 0.78);
      this.horizon.setDisplaySize(width * 1.05, Math.max(70, height * 0.16));
    }

    this.moon?.setPosition(width * 0.78, height * 0.18);
    this.moonRing?.setPosition(width * 0.78, height * 0.18);

    for (const cloud of this.clouds) {
      const near = cloud.getData('near') as boolean;
      const baseY = height * (near ? 0.38 + Math.random() * 0.28 : 0.16 + Math.random() * 0.22);
      cloud.setData('baseY', baseY);
      cloud.y = baseY;
    }

    for (const n of this.nebulae) {
      const baseY = height * (0.12 + Math.random() * 0.32);
      n.setData('baseY', baseY);
      n.y = baseY;
    }
  }

  destroy(): void {
    this.root.destroy(true);
    this.starsLayer?.destroy();
    this.horizon?.destroy();
    this.moon?.destroy();
    this.moonRing?.destroy();
    this.skyOverlay.destroy();
    this.windStreaks.destroy();
    for (const c of this.clouds) c.destroy();
    for (const n of this.nebulae) n.destroy();
    // Star sheets are sized per viewport — drop them so a resize storm cannot
    // leak a texture per width.
    for (const key of this.starTextureKeys) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.starTextureKeys.clear();
  }

  private updateClouds(dt: number, a: number): void {
    for (const cloud of this.clouds) {
      const speed = (cloud.getData('speed') as number) ?? 8;
      const parallax = (cloud.getData('parallax') as number) ?? 1;
      const near = cloud.getData('near') as boolean;
      const baseY = cloud.getData('baseY') as number;
      const baseAlpha = cloud.getData('baseAlpha') as number;

      // Horizontal rush — much faster as we climb
      cloud.x -= (speed + a * (near ? 110 : 55)) * parallax * (dt / 1000);
      if (cloud.x < -180) {
        cloud.x = this.width + 120 + Math.random() * 80;
        cloud.setData(
          'baseY',
          this.height * (near ? 0.32 + Math.random() * 0.35 : 0.1 + Math.random() * 0.28),
        );
      }

      // Clouds fall away below as altitude rises (we climb through them)
      const layerDrop = a * this.height * (near ? 0.55 : 0.28);
      const bob = Math.sin(this.t * (near ? 1.2 : 0.7) + cloud.x * 0.01) * (2 + a * 4);
      cloud.y = baseY + layerDrop + bob;

      if (near) {
        cloud.setAlpha(Phaser.Math.Clamp(baseAlpha * (1.1 + a * 0.6) * (1 - a * 0.55), 0.02, 0.35));
        cloud.setScale((cloud.getData('baseScale') as number) * (1 + a * 0.4));
      } else {
        cloud.setAlpha(Phaser.Math.Clamp(baseAlpha + a * 0.12, 0.04, 0.28));
      }
    }
  }

  private drawWindStreaks(a: number): void {
    this.windStreaks.clear();
    if (a < 0.06 || !Quality.windStreaks) return;

    const n = Quality.isMobile ? 3 : Quality.tier === 'high' ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const y = this.height * (0.15 + ((i / n + this.t * 0.12 + a) % 0.65));
      const len = 36 + a * 90 + (i % 3) * 14;
      const x = ((this.scrollX * (16 + i * 3) + i * 90) % (this.width + len)) - len;
      const alpha = (0.07 + a * 0.18) * (0.45 + (i % 3) * 0.18);
      this.windStreaks.lineStyle(1 + a * 0.6, 0xa8fff0, alpha);
      this.windStreaks.lineBetween(x, y, x + len, y - a * 5);
    }
  }

  private paintSky(): void {
    this.sky.clear();
    const steps = Quality.skySteps;
    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      const top = Phaser.Display.Color.ValueToColor(0x02040a);
      const mid = Phaser.Display.Color.ValueToColor(0x0a1430);
      const bot = Phaser.Display.Color.ValueToColor(0x12304a);
      const from = t < 0.55 ? top : mid;
      const to = t < 0.55 ? mid : bot;
      const local = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        from,
        to,
        100,
        Math.floor(local * 100),
      );
      this.sky.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      this.sky.fillRect(0, (this.height / steps) * i, this.width, this.height / steps + 2);
    }

    this.sky.fillStyle(0x1ec8a8, 0.04);
    this.sky.fillEllipse(this.width * 0.65, this.height * 0.72, this.width * 0.9, this.height * 0.22);
    this.sky.fillStyle(0x3d6dff, 0.035);
    this.sky.fillEllipse(this.width * 0.28, this.height * 0.55, this.width * 0.55, this.height * 0.28);
    this.sky.fillStyle(0x7b3dff, 0.02);
    this.sky.fillEllipse(this.width * 0.8, this.height * 0.35, this.width * 0.4, this.height * 0.25);

    this.sky.fillStyle(0x060b18, 0.65);
    this.sky.fillEllipse(this.width * 0.5, this.height * 1.05, this.width * 1.4, this.height * 0.4);
  }

  private bakeStars(): void {
    const key = `av-stars_${Math.round(this.width)}x${Math.round(this.height)}_${Quality.starCount}`;
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      for (let i = 0; i < Quality.starCount; i++) {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height * 0.7;
        const bright = Math.random();
        const r = bright > 0.85 ? 1.6 : 0.5 + Math.random() * 1.1;
        const color = bright > 0.8 ? 0x2ef5d0 : bright > 0.55 ? 0xc8e0ff : 0xffffff;
        g.fillStyle(color, 0.18 + bright * 0.5);
        g.fillCircle(x, y, r);
        if (bright > 0.9) {
          g.fillStyle(0xffffff, 0.25);
          g.fillCircle(x, y, r * 2.2);
        }
      }
      g.generateTexture(
        key,
        Math.max(2, Math.floor(this.width)),
        Math.max(2, Math.floor(this.height * 0.72)),
      );
      g.destroy();
    }
    this.starTextureKeys.add(key);

    this.starsLayer?.destroy();
    this.starsLayer = this.scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(1);
    this.starsLayer.setAlpha(0.9);
  }

  private spawnNebulae(): void {
    for (const n of this.nebulae) n.destroy();
    this.nebulae = [];
    const count = Quality.tier === 'low' ? 1 : Quality.tier === 'medium' ? 2 : 3;
    const tints = [0x2ef5d0, 0x4d7cff, 0xb06bff];
    for (let i = 0; i < count; i++) {
      const baseY = this.height * (0.12 + Math.random() * 0.32);
      const baseScale = 1.4 + Math.random() * 1.8;
      const n = this.scene.add.image(Math.random() * this.width, baseY, TEX.nebula);
      n.setDepth(1);
      n.setAlpha(0.14);
      n.setScale(baseScale);
      n.setTint(tints[i % tints.length]!);
      if (Quality.useAddBlend) n.setBlendMode(Phaser.BlendModes.ADD);
      n.setData('speed', 1.5 + Math.random() * 3);
      n.setData('baseY', baseY);
      n.setData('baseScale', baseScale);
      this.nebulae.push(n);
    }
  }

  private spawnMoon(): void {
    this.moon?.destroy();
    this.moonRing?.destroy();
    this.moon = null;
    this.moonRing = null;
    if (Quality.tier === 'low') return;

    this.moon = this.scene.add.circle(this.width * 0.78, this.height * 0.18, 26, 0xb8d4ff, 0.2);
    this.moon.setDepth(1);
    if (Quality.useAddBlend) this.moon.setBlendMode(Phaser.BlendModes.ADD);

    this.moonRing = this.scene.add.circle(this.width * 0.78, this.height * 0.18, 40, 0x2ef5d0, 0);
    this.moonRing.setStrokeStyle(1.5, 0xffffff, 0.14);
    this.moonRing.setDepth(1);
  }

  private spawnHorizon(): void {
    this.horizon?.destroy();
    this.horizon = this.scene.add.image(this.width * 0.5, this.height * 0.78, TEX.horizon);
    this.horizon.setDepth(3);
    this.horizon.setDisplaySize(this.width * 1.05, Math.max(70, this.height * 0.16));
    this.horizon.setAlpha(0.9);
  }

  private paintGrid(): void {
    this.grid.clear();
    this.grid.x = 0;
    this.grid.y = 0;
    const lines = Quality.tier === 'low' ? 7 : 11;
    this.grid.lineStyle(1, 0x6a90c8, Quality.tier === 'low' ? 0.07 : 0.1);
    const vanishingX = this.width * 0.58;
    const vanishingY = this.height * 0.5;

    for (let i = 0; i <= lines; i++) {
      const x = (this.width / lines) * i;
      this.grid.lineBetween(x, this.height + 8, vanishingX, vanishingY);
    }
    const rows = Quality.tier === 'low' ? 4 : 6;
    for (let i = 0; i < rows; i++) {
      const t = i / Math.max(1, rows - 1);
      const y = this.height * 0.8 + this.height * 0.2 * Math.pow(t, 1.5);
      const spread = Phaser.Math.Linear(0.14, 1, t);
      this.grid.lineBetween(
        vanishingX - this.width * 0.55 * spread,
        y,
        vanishingX + this.width * 0.55 * spread,
        y,
      );
    }
  }

  private spawnClouds(): void {
    for (const c of this.clouds) c.destroy();
    this.clouds = [];
    for (let i = 0; i < Quality.cloudCount; i++) {
      const near = i % 2 === 0;
      const baseY = this.height * (near ? 0.35 + Math.random() * 0.3 : 0.18 + Math.random() * 0.25);
      const baseScale = (near ? 1.1 : 0.7) + Math.random() * 1.1;
      const baseAlpha = near ? 0.14 + Math.random() * 0.1 : 0.08 + Math.random() * 0.08;
      const cloud = this.scene.add.image(Math.random() * this.width, baseY, TEX.cloud);
      cloud.setAlpha(baseAlpha);
      cloud.setScale(baseScale);
      cloud.setDepth(near ? 4 : 2);
      cloud.setTint(near ? 0xb8d4f0 : 0x7a9cc8);
      cloud.setData('speed', near ? 8 + Math.random() * 14 : 3 + Math.random() * 7);
      cloud.setData('parallax', near ? 1.15 : 0.65);
      cloud.setData('baseY', baseY);
      cloud.setData('baseScale', baseScale);
      cloud.setData('baseAlpha', baseAlpha);
      cloud.setData('near', near);
      this.clouds.push(cloud);
    }
  }
}
