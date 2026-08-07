import Phaser from 'phaser';

/** Generate lightweight textures used by Aviator (no external assets). */
export function generateAviatorTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('av-plane')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Fuselage
    g.fillStyle(0xe8eef7, 1);
    g.fillRoundedRect(10, 18, 52, 14, 6);
    // Nose
    g.fillStyle(0xff5c7a, 1);
    g.fillTriangle(62, 18, 78, 25, 62, 32);
    // Wing
    g.fillStyle(0x2f8cff, 1);
    g.fillTriangle(28, 24, 46, 24, 34, 42);
    // Tail
    g.fillStyle(0x2f8cff, 1);
    g.fillTriangle(12, 18, 22, 18, 14, 6);
    // Cockpit
    g.fillStyle(0x1a2330, 1);
    g.fillRoundedRect(40, 20, 14, 8, 3);
    // Engine glow tip
    g.fillStyle(0xffc14a, 1);
    g.fillCircle(12, 25, 4);
    g.generateTexture('av-plane', 82, 48);
    g.destroy();
  }

  if (!scene.textures.exists('av-spark')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffc14a, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('av-spark', 8, 8);
    g.destroy();
  }

  if (!scene.textures.exists('av-smoke')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x9aa7b8, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('av-smoke', 12, 12);
    g.destroy();
  }

  if (!scene.textures.exists('av-fire')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff6b35, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture('av-fire', 10, 10);
    g.destroy();
  }
}
