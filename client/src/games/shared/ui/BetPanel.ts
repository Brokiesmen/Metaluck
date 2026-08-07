import Phaser from 'phaser';
import { GameTheme } from '../theme/tokens';
import { clamp, formatAmount } from '../theme/format';
import { drawRoundRect, makeLabelStyle, makeMonoStyle } from './draw';
import { GameButton } from './GameButton';

export interface BetPanelOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width?: number;
  bet: number;
  balance: number;
  min?: number;
  max?: number;
  /** Optional preset chips under the value. */
  chips?: number[];
  depth?: number;
  onChange?: (bet: number) => void;
}

/**
 * Stake control: value readout + ½ / ×2 / MAX (and optional chips).
 * Game-agnostic — host supplies min/max/balance.
 */
export class BetPanel extends Phaser.GameObjects.Container {
  private readonly panelWidth: number;
  private valueText: Phaser.GameObjects.Text;
  private bet: number;
  private balance: number;
  private min: number;
  private max: number;
  private enabled = true;
  private onChange?: (bet: number) => void;
  private actionButtons: GameButton[] = [];
  private chipButtons: GameButton[] = [];

  constructor(opts: BetPanelOptions) {
    super(opts.scene, opts.x, opts.y);
    this.panelWidth = opts.width ?? 320;
    this.bet = opts.bet;
    this.balance = opts.balance;
    this.min = opts.min ?? 1;
    this.max = opts.max ?? Number.POSITIVE_INFINITY;
    this.onChange = opts.onChange;

    const h = opts.chips?.length ? 118 : 86;
    const bg = opts.scene.add.graphics();
    drawRoundRect(
      bg,
      -this.panelWidth / 2,
      -h / 2,
      this.panelWidth,
      h,
      GameTheme.radii.lg,
      GameTheme.colors.surface,
      0.96,
      GameTheme.colors.border,
      0.85,
    );

    const title = opts.scene.add
      .text(0, -h / 2 + 16, 'BET', makeLabelStyle(11, GameTheme.colors.textMutedHex, { fontStyle: '800' }))
      .setOrigin(0.5);

    this.valueText = opts.scene.add
      .text(0, -h / 2 + 40, formatAmount(this.bet), makeMonoStyle(22, GameTheme.colors.textHex))
      .setOrigin(0.5);

    this.add([bg, title, this.valueText]);

    const btnY = opts.chips?.length ? 8 : 22;
    const btnW = Math.floor((this.panelWidth - 40) / 3);
    const specs: Array<{ label: string; fn: () => void }> = [
      { label: '½', fn: () => this.setBet(this.bet / 2) },
      { label: '×2', fn: () => this.setBet(this.bet * 2) },
      { label: 'MAX', fn: () => this.setBet(this.resolveMax()) },
    ];

    specs.forEach((spec, i) => {
      const bx = -this.panelWidth / 2 + 16 + btnW / 2 + i * (btnW + 4);
      const btn = new GameButton({
        scene: opts.scene,
        x: bx,
        y: btnY,
        width: btnW,
        height: 34,
        label: spec.label,
        variant: i === 2 ? 'accent' : 'secondary',
        fontSize: 13,
        addToScene: false,
        onClick: () => {
          if (!this.enabled) return;
          spec.fn();
        },
      });
      this.add(btn);
      this.actionButtons.push(btn);
    });

    if (opts.chips?.length) {
      const chipY = h / 2 - 22;
      const chipW = Math.floor((this.panelWidth - 24 - (opts.chips.length - 1) * 6) / opts.chips.length);
      opts.chips.forEach((chip, i) => {
        const cx = -this.panelWidth / 2 + 12 + chipW / 2 + i * (chipW + 6);
        const btn = new GameButton({
          scene: opts.scene,
          x: cx,
          y: chipY,
          width: chipW,
          height: 28,
          label: String(chip),
          variant: 'ghost',
          fontSize: 12,
          addToScene: false,
          onClick: () => {
            if (!this.enabled) return;
            this.setBet(chip);
          },
        });
        this.add(btn);
        this.chipButtons.push(btn);
      });
    }

    this.setDepth(opts.depth ?? GameTheme.depth.hud);
    opts.scene.add.existing(this);
    this.refresh();
  }

  getBet(): number {
    return this.bet;
  }

  setBalance(balance: number): this {
    this.balance = balance;
    this.refresh();
    return this;
  }

  setBet(next: number, silent = false): this {
    const capped = clamp(Math.floor(next), this.min, this.resolveMax());
    if (capped === this.bet) {
      this.refresh();
      return this;
    }
    this.bet = capped;
    this.refresh();
    if (!silent) this.onChange?.(this.bet);
    return this;
  }

  setLimits(min: number, max: number): this {
    this.min = min;
    this.max = max;
    this.setBet(this.bet, true);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    for (const b of [...this.actionButtons, ...this.chipButtons]) {
      b.setDisabled(!enabled);
    }
    this.setAlpha(enabled ? 1 : 0.55);
    return this;
  }

  private resolveMax(): number {
    return Math.max(this.min, Math.min(this.max, Math.floor(this.balance)));
  }

  private refresh(): void {
    this.valueText.setText(formatAmount(this.bet));
  }
}
