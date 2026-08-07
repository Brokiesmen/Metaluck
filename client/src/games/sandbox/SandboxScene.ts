import Phaser from 'phaser';
import { REGISTRY_KEYS } from '../core/types';

/**
 * Empty test scene — proves Phaser boots through GameManager.
 */
export class SandboxScene extends Phaser.Scene {
  constructor() {
    super('SandboxScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const bet = this.registry.get(REGISTRY_KEYS.bet) as number | undefined;
    const balance = this.registry.get(REGISTRY_KEYS.balance) as number | undefined;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b0f14);

    this.add
      .text(width / 2, height / 2 - 36, 'Phaser sandbox', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8eef7',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 8, 'Game module OK', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#7d8b9a',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 48, `bet: ${bet ?? '—'}  ·  balance: ${balance ?? '—'}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5);
  }
}
