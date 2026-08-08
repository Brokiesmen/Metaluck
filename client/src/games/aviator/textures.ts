import Phaser from 'phaser';

/**
 * Procedural art pack — swap these keys for real art files later without
 * touching the entities. Keys are namespaced so they never collide with
 * another game's textures.
 */
export const TEX = {
  aircraft: 'av-aircraft',
  aircraftShadow: 'av-aircraft-shadow',
  glow: 'av-glow-particle',
  soft: 'av-soft-particle',
  sparkle: 'av-sparkle',
  confetti: 'av-confetti',
  fire: 'av-fire-particle',
  smoke: 'av-smoke-particle',
  cloud: 'av-cloud',
  nebula: 'av-nebula',
  horizon: 'av-horizon',
} as const;

export function generateTextures(scene: Phaser.Scene): void {
  for (const key of Object.values(TEX)) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
  bakeSoftParticles(scene);
  bakeFxParticles(scene);
  bakeAircraft(scene);
  bakeCloud(scene);
  bakeNebula(scene);
  bakeHorizon(scene);
}

function bakeSoftParticles(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  for (let i = 8; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.08 + (i / 8) * 0.12);
    g.fillCircle(16, 16, i * 2);
  }
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(16, 16, 3);
  g.generateTexture(TEX.glow, 32, 32);
  g.destroy();

  const s = scene.make.graphics({ x: 0, y: 0 });
  for (let i = 5; i >= 1; i--) {
    s.fillStyle(0xffffff, 0.1 + i * 0.12);
    s.fillCircle(8, 8, i * 1.4);
  }
  s.generateTexture(TEX.soft, 16, 16);
  s.destroy();
}

function bakeFxParticles(scene: Phaser.Scene): void {
  // 4-point sparkle
  const sp = scene.make.graphics({ x: 0, y: 0 });
  sp.fillStyle(0xffffff, 1);
  sp.fillTriangle(12, 0, 14, 12, 10, 12);
  sp.fillTriangle(12, 24, 14, 12, 10, 12);
  sp.fillTriangle(0, 12, 12, 10, 12, 14);
  sp.fillTriangle(24, 12, 12, 10, 12, 14);
  sp.fillCircle(12, 12, 2.5);
  sp.generateTexture(TEX.sparkle, 24, 24);
  sp.destroy();

  const c = scene.make.graphics({ x: 0, y: 0 });
  c.fillStyle(0xffffff, 1);
  c.fillRoundedRect(1, 1, 8, 5, 1);
  c.generateTexture(TEX.confetti, 10, 7);
  c.destroy();

  const f = scene.make.graphics({ x: 0, y: 0 });
  for (let i = 6; i >= 1; i--) {
    f.fillStyle(0xffffff, 0.12 + i * 0.1);
    f.fillCircle(10, 10, i * 1.5);
  }
  f.generateTexture(TEX.fire, 20, 20);
  f.destroy();

  const sm = scene.make.graphics({ x: 0, y: 0 });
  for (let i = 7; i >= 1; i--) {
    sm.fillStyle(0xffffff, 0.06 + i * 0.04);
    sm.fillCircle(12, 12, i * 1.5);
  }
  sm.generateTexture(TEX.smoke, 24, 24);
  sm.destroy();
}

/** High-detail side-view jet — white / cyan premium look. */
function bakeAircraft(scene: Phaser.Scene): void {
  const shadow = scene.make.graphics({ x: 0, y: 0 });
  shadow.fillStyle(0x000000, 0.4);
  shadow.fillEllipse(70, 14, 120, 22);
  shadow.generateTexture(TEX.aircraftShadow, 140, 28);
  shadow.destroy();

  const g = scene.make.graphics({ x: 0, y: 0 });
  const w = 200;
  const h = 90;
  const cy = 46;

  // Soft engine bloom (behind)
  g.fillStyle(0xff8a3d, 0.2);
  g.fillCircle(22, cy, 20);
  g.fillStyle(0x2ef5d0, 0.22);
  g.fillCircle(18, cy, 14);
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(16, cy, 6);

  // Drop shadow in-sprite
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(95, cy + 22, 90, 12);

  // —— Tail section ——
  g.fillStyle(0x9eb6d8, 1);
  g.fillTriangle(20, cy - 5, 48, cy - 6, 16, 8);
  g.fillStyle(0xffffff, 0.35);
  g.fillTriangle(24, cy - 6, 42, cy - 7, 22, 16);
  g.fillStyle(0x2ef5d0, 0.9);
  g.fillTriangle(22, cy - 6, 34, cy - 7, 20, 18);
  g.fillStyle(0xa8c0e0, 1);
  g.fillTriangle(22, cy, 48, cy - 3, 30, cy + 16);
  g.fillTriangle(22, cy, 48, cy + 3, 30, cy - 16);

  // —— Main fuselage ——
  g.fillStyle(0x6e86a8, 1);
  g.fillRoundedRect(42, cy + 2, 100, 12, 6);
  g.fillStyle(0xe8f0fa, 1);
  g.fillRoundedRect(38, cy - 11, 108, 20, 9);
  g.fillStyle(0xffffff, 0.65);
  g.fillRoundedRect(48, cy - 10, 88, 6, 3);
  g.fillStyle(0x2ef5d0, 0.85);
  g.fillRect(50, cy - 1, 90, 2.5);
  g.fillStyle(0x1a9a88, 0.5);
  g.fillRect(50, cy + 1.5, 90, 1.5);

  // —— Nose ——
  g.fillStyle(0x2ef5d0, 1);
  g.fillTriangle(146, cy - 11, 186, cy, 146, cy + 11);
  g.fillStyle(0xb8fff0, 0.55);
  g.fillTriangle(146, cy - 9, 172, cy - 2, 146, cy);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(184, cy, 2);

  // —— Wings ——
  g.fillStyle(0xb0c6e4, 1);
  g.fillTriangle(70, cy - 3, 128, cy - 6, 82, 4);
  g.fillStyle(0xd0e0f4, 1);
  g.fillTriangle(78, cy - 4, 118, cy - 6, 88, 12);
  g.fillStyle(0xffb347, 1);
  g.fillCircle(84, 8, 3);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(84, 8, 1.2);

  g.fillStyle(0x8fa8c8, 1);
  g.fillTriangle(72, cy + 5, 126, cy + 5, 88, h - 6);
  g.fillStyle(0xff4d7a, 1);
  g.fillCircle(90, h - 8, 2.5);

  g.fillStyle(0x5a7294, 1);
  g.fillRoundedRect(78, cy + 8, 28, 10, 4);
  g.fillStyle(0x2ef5d0, 0.7);
  g.fillCircle(80, cy + 13, 3.5);

  // —— Cockpit ——
  g.fillStyle(0x061018, 0.95);
  g.fillRoundedRect(118, cy - 9, 28, 12, 5);
  g.fillStyle(0x2ef5d0, 0.3);
  g.fillRoundedRect(120, cy - 8, 14, 7, 3);
  g.fillStyle(0xffffff, 0.22);
  g.fillRoundedRect(122, cy - 7, 7, 4, 2);
  g.fillStyle(0x0a2030, 0.8);
  g.fillRect(132, cy - 8, 1.5, 10);

  // —— Rear engine core ——
  g.fillStyle(0x3d526e, 1);
  g.fillCircle(28, cy, 9);
  g.fillStyle(0xff8a3d, 1);
  g.fillCircle(24, cy, 6);
  g.fillStyle(0xffe08a, 1);
  g.fillCircle(22, cy, 3.5);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(20, cy, 1.8);

  // Antenna
  g.lineStyle(1.5, 0x8aa0c0, 0.9);
  g.lineBetween(100, cy - 11, 100, cy - 20);
  g.fillStyle(0x2ef5d0, 0.8);
  g.fillCircle(100, cy - 20, 1.5);

  g.generateTexture(TEX.aircraft, w, h);
  g.destroy();
}

function bakeCloud(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const blobs = [
    [40, 36, 26, 0.14],
    [70, 30, 32, 0.16],
    [102, 38, 24, 0.13],
    [64, 48, 22, 0.12],
    [88, 46, 18, 0.1],
  ] as const;
  for (const [x, y, r, a] of blobs) {
    g.fillStyle(0xffffff, a);
    g.fillCircle(x, y, r);
  }
  g.generateTexture(TEX.cloud, 140, 78);
  g.destroy();
}

function bakeNebula(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  for (let i = 10; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.03 + i * 0.012);
    g.fillCircle(64, 64, i * 6);
  }
  g.generateTexture(TEX.nebula, 128, 128);
  g.destroy();
}

function bakeHorizon(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const w = 512;
  const h = 96;
  g.fillStyle(0x2ef5d0, 0.08);
  g.fillEllipse(w / 2, 70, w * 0.95, 50);
  g.fillStyle(0x4d7cff, 0.06);
  g.fillEllipse(w / 2, 78, w * 0.8, 36);
  g.fillStyle(0x050814, 0.92);
  let x = 0;
  while (x < w) {
    const bw = 6 + Math.random() * 18;
    const bh = 8 + Math.random() * 42;
    g.fillRect(x, h - bh - 8, bw, bh + 8);
    if (bh > 20 && Math.random() > 0.45) {
      g.fillStyle(0x2ef5d0, 0.15 + Math.random() * 0.25);
      g.fillRect(x + 2, h - bh, 2, 2);
      g.fillStyle(0xffb347, 0.12 + Math.random() * 0.2);
      g.fillRect(x + bw * 0.5, h - bh * 0.6, 2, 2);
      g.fillStyle(0x050814, 0.92);
    }
    x += bw + 1;
  }
  g.lineStyle(2, 0x2ef5d0, 0.35);
  g.lineBetween(0, h - 10, w, h - 10);
  g.generateTexture(TEX.horizon, w, h);
  g.destroy();
}
