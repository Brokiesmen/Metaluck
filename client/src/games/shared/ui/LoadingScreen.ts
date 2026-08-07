import Phaser from 'phaser';
import { GameTheme } from '../theme/tokens';
import { makeLabelStyle } from './draw';
import { OverlayShell, overlayTitleStyle } from './OverlayShell';

export interface LoadingScreenOptions {
  scene: Phaser.Scene;
  message?: string;
  depth?: number;
}

/**
 * Full-viewport loading veil — same chrome language as ResultOverlay.
 */
export class LoadingScreen extends Phaser.GameObjects.Container {
  private shell: OverlayShell;
  private spinner: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private messageText: Phaser.GameObjects.Text;
  private spinTween: Phaser.Tweens.Tween | null = null;
  private spinAngle = 0;

  constructor(opts: LoadingScreenOptions) {
    super(opts.scene, 0, 0);

    const { width, height } = opts.scene.scale;
    this.shell = new OverlayShell(opts.scene, { cardW: 260, cardH: 180, veilAlpha: 0.82 });
    this.shell.layout(width / 2, height / 2, 'loading');

    this.titleText = opts.scene.add
      .text(width / 2, height / 2 - 48, 'LOADING', overlayTitleStyle('loading'))
      .setOrigin(0.5);

    this.spinner = opts.scene.add.graphics();
    this.spinner.setPosition(width / 2, height / 2 - 2);
    this.drawSpinner(0);

    this.messageText = opts.scene.add
      .text(
        width / 2,
        height / 2 + 48,
        opts.message ?? 'Please wait…',
        makeLabelStyle(13, GameTheme.colors.textMutedHex),
      )
      .setOrigin(0.5);

    this.add([
      this.shell.veil,
      this.shell.card,
      this.titleText,
      this.spinner,
      this.messageText,
    ]);
    this.setDepth(opts.depth ?? GameTheme.depth.overlay);
    this.setVisible(false);
    opts.scene.add.existing(this);

    opts.scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    opts.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      opts.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.dismiss();
    });
  }

  present(message?: string): this {
    if (message != null) this.messageText.setText(message);
    this.relayout();
    this.setVisible(true);
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: GameTheme.motion.fast });
    if (!this.spinTween) {
      this.spinTween = this.scene.tweens.addCounter({
        from: 0,
        to: 360,
        duration: 900,
        repeat: -1,
        onUpdate: (tw) => {
          this.spinAngle = tw.getValue() ?? 0;
          this.drawSpinner(this.spinAngle);
        },
      });
    }
    return this;
  }

  dismiss(): this {
    this.spinTween?.stop();
    this.spinTween = null;
    this.setVisible(false);
    return this;
  }

  setMessage(message: string): this {
    this.messageText.setText(message);
    return this;
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.shell.resizeVeil(gameSize.width, gameSize.height);
    if (this.visible) this.relayout();
  }

  private relayout(): void {
    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    this.shell.layout(cx, cy, 'loading');
    this.titleText.setPosition(cx, cy - 48);
    this.spinner.setPosition(cx, cy - 2);
    this.messageText.setPosition(cx, cy + 48);
  }

  private drawSpinner(deg: number): void {
    this.spinner.clear();
    const r = 16;
    const start = Phaser.Math.DegToRad(deg);
    this.spinner.lineStyle(3, GameTheme.colors.border, 0.55);
    this.spinner.beginPath();
    this.spinner.arc(0, 0, r, 0, Math.PI * 2, false);
    this.spinner.strokePath();
    this.spinner.lineStyle(3, GameTheme.colors.primary, 1);
    this.spinner.beginPath();
    this.spinner.arc(0, 0, r, start, start + Math.PI * 1.25, false);
    this.spinner.strokePath();
  }
}
