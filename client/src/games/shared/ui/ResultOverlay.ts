import Phaser from 'phaser';
import { AnimationManager } from '../../core/AnimationManager';
import { SoundManager } from '../../core/SoundManager';
import { Haptics } from '../../core/Haptics';
import { GameTheme } from '../theme/tokens';
import { formatAmount } from '../theme/format';
import { makeLabelStyle, makeMonoStyle } from './draw';
import { GameButton } from './GameButton';
import { OverlayShell } from './OverlayShell';

export type ResultKind = 'win' | 'lose';

export interface ResultOverlayOptions {
  scene: Phaser.Scene;
  depth?: number;
  continueLabel?: string;
}

export interface ResultOverlayShowOpts {
  kind: ResultKind;
  title?: string;
  amount?: number;
  subtitle?: string;
  autoHideMs?: number;
  onContinue?: () => void;
}

/**
 * Win / Lose modal overlay — shared chrome with LoadingScreen.
 */
export class ResultOverlay extends Phaser.GameObjects.Container {
  private shell: OverlayShell;
  private titleText: Phaser.GameObjects.Text;
  private amountText: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text;
  private continueBtn: GameButton;
  private anim: AnimationManager;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private onContinue?: () => void;
  private kind: ResultKind = 'win';

  constructor(opts: ResultOverlayOptions) {
    super(opts.scene, 0, 0);
    this.anim = AnimationManager.forScene(opts.scene);

    const { width, height } = opts.scene.scale;
    this.shell = new OverlayShell(opts.scene, { cardW: 280, cardH: 220, veilAlpha: 0.78 });
    this.shell.layout(width / 2, height / 2, 'win');

    this.titleText = opts.scene.add
      .text(width / 2, height / 2 - 58, 'YOU WIN', makeLabelStyle(22, GameTheme.colors.accentHex, { fontStyle: '800' }))
      .setOrigin(0.5);

    this.amountText = opts.scene.add
      .text(width / 2, height / 2 - 8, '', makeMonoStyle(28, GameTheme.colors.textHex))
      .setOrigin(0.5);

    this.subtitleText = opts.scene.add
      .text(width / 2, height / 2 + 28, '', makeLabelStyle(13, GameTheme.colors.textMutedHex))
      .setOrigin(0.5);

    this.continueBtn = new GameButton({
      scene: opts.scene,
      x: width / 2,
      y: height / 2 + 72,
      width: 168,
      height: 44,
      label: opts.continueLabel ?? 'Continue',
      variant: 'primary',
      addToScene: false,
      onClick: () => this.handleContinue(),
    });

    this.add([
      this.shell.veil,
      this.shell.card,
      this.titleText,
      this.amountText,
      this.subtitleText,
      this.continueBtn,
    ]);
    this.setDepth(opts.depth ?? GameTheme.depth.modal);
    this.setVisible(false);
    opts.scene.add.existing(this);

    opts.scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    opts.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      opts.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.clearTimer();
    });
  }

  show(opts: ResultOverlayShowOpts): this {
    this.clearTimer();
    this.onContinue = opts.onContinue;
    this.kind = opts.kind;

    const win = opts.kind === 'win';
    this.relayout();

    this.titleText
      .setText(opts.title ?? (win ? 'YOU WIN' : 'YOU LOSE'))
      .setColor(win ? GameTheme.colors.accentHex : GameTheme.colors.dangerHex);

    if (opts.amount != null && opts.amount !== 0) {
      const prefix = opts.amount > 0 ? '+' : '';
      this.amountText.setText(`${prefix}${formatAmount(opts.amount)}`).setVisible(true);
    } else {
      this.amountText.setText('').setVisible(false);
    }

    this.subtitleText.setText(opts.subtitle ?? '').setVisible(Boolean(opts.subtitle));
    this.continueBtn.setVariant(win ? 'accent' : 'secondary');

    this.setVisible(true);
    this.setAlpha(0);
    this.anim.fadeIn(this, GameTheme.motion.normal);
    this.anim.floatIn(this.titleText, 16, 280);
    if (this.amountText.visible) this.anim.punchScale(this.amountText, 1.1, 220);

    SoundManager.getInstance().play(win ? 'win' : 'lose');
    Haptics.notify(win ? 'success' : 'error');

    if (opts.autoHideMs && opts.autoHideMs > 0) {
      this.hideTimer = this.scene.time.delayedCall(opts.autoHideMs, () => this.hide());
    }
    return this;
  }

  hide(): this {
    this.clearTimer();
    this.setVisible(false);
    return this;
  }

  private handleContinue(): void {
    const cb = this.onContinue;
    this.hide();
    cb?.();
  }

  private relayout(): void {
    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    this.shell.resizeVeil(width, height);
    this.shell.layout(cx, cy, this.kind);
    this.titleText.setPosition(cx, cy - 58);
    this.amountText.setPosition(cx, cy - 8);
    this.subtitleText.setPosition(cx, cy + 28);
    this.continueBtn.setPosition(cx, cy + 72);
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.shell.resizeVeil(gameSize.width, gameSize.height);
    if (!this.visible) return;
    this.relayout();
  }

  private clearTimer(): void {
    this.hideTimer?.remove(false);
    this.hideTimer = null;
  }
}
