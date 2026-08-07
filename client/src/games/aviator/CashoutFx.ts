import Phaser from 'phaser';
import { getDeviceProfile } from '../core/DeviceProfile';
import { GameTheme } from '../shared/theme/tokens';
import { formatAmount } from '../shared/theme/format';
import { makeMonoStyle } from '../shared/ui/draw';

/**
 * Burst FX on successful cashout — particles + floating payout.
 */
export class CashoutFx {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(x: number, y: number, payout: number): void {
    const device = getDeviceProfile();
    if (!device.veryLow) {
      const emitter = this.scene.add.particles(x, y, 'av-spark', {
        speed: { min: 80, max: device.lowPower ? 180 : 260 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 280, max: 620 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: device.lowPower ? 10 : 18,
        blendMode: 'ADD',
        tint: [0x3dde9a, 0xffc14a, 0xffffff, 0x2f8cff],
        emitting: false,
      });
      emitter.setDepth(95);
      emitter.explode(device.lowPower ? 10 : 18);
      this.scene.time.delayedCall(700, () => emitter.destroy());
    }

    const label = this.scene.add
      .text(x, y - 10, `+${formatAmount(payout)}`, makeMonoStyle(22, GameTheme.colors.accentHex))
      .setOrigin(0.5)
      .setDepth(96)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: label,
      y: y - 64,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.6, to: 1.15 },
      duration: 420,
      ease: 'Back.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          alpha: 0,
          y: y - 90,
          duration: 380,
          delay: 280,
          onComplete: () => label.destroy(),
        });
      },
    });
  }
}
