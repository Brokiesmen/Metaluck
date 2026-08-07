import Phaser from 'phaser';
import { LoadingScreen } from '../shared';
import { generateAviatorTextures } from './textures';

/**
 * Boot + texture bake, then hand off to GameScene.
 */
export class BootScene extends Phaser.Scene {
  private loading!: LoadingScreen;

  constructor() {
    super('BootScene');
  }

  create(): void {
    this.loading = new LoadingScreen({ scene: this, message: 'Preparing Aviator…' });
    this.loading.present('Preparing Aviator…');

    // Yield a frame so the loading veil paints before texture work.
    this.time.delayedCall(40, () => {
      generateAviatorTextures(this);
      this.loading.setMessage('Almost ready…');
      this.time.delayedCall(220, () => {
        this.loading.dismiss();
        this.scene.start('GameScene');
      });
    });
  }
}
