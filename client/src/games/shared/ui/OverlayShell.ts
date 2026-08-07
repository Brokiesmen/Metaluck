import Phaser from 'phaser';
import { GameTheme } from '../theme/tokens';
import { drawRoundRect, makeLabelStyle } from './draw';

export type OverlayKind = 'neutral' | 'win' | 'lose' | 'loading';

const STROKE: Record<OverlayKind, number> = {
  neutral: GameTheme.colors.borderStrong,
  win: GameTheme.colors.accent,
  lose: GameTheme.colors.danger,
  loading: GameTheme.colors.primary,
};

/**
 * Shared full-screen veil + card chrome for Loading / Win / Lose.
 * Keeps all game overlays visually consistent.
 */
export class OverlayShell {
  readonly veil: Phaser.GameObjects.Rectangle;
  readonly card: Phaser.GameObjects.Graphics;
  readonly cardW: number;
  readonly cardH: number;

  constructor(
    scene: Phaser.Scene,
    opts?: { cardW?: number; cardH?: number; veilAlpha?: number },
  ) {
    const { width, height } = scene.scale;
    this.cardW = opts?.cardW ?? 280;
    this.cardH = opts?.cardH ?? 220;
    this.veil = scene.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        GameTheme.colors.overlay,
        opts?.veilAlpha ?? 0.78,
      )
      .setInteractive();
    this.card = scene.add.graphics();
  }

  layout(cx: number, cy: number, kind: OverlayKind = 'neutral'): void {
    this.card.clear();
    drawRoundRect(
      this.card,
      cx - this.cardW / 2,
      cy - this.cardH / 2,
      this.cardW,
      this.cardH,
      GameTheme.radii.xl,
      GameTheme.colors.surfaceRaised,
      0.98,
      STROKE[kind],
      0.9,
      2,
    );
    // Soft top highlight strip
    this.card.fillStyle(0xffffff, 0.04);
    this.card.fillRect(cx - this.cardW / 2 + 8, cy - this.cardH / 2 + 6, this.cardW - 16, 3);
  }

  resizeVeil(w: number, h: number): void {
    this.veil.setPosition(w / 2, h / 2).setSize(w, h);
  }
}

export function overlayTitleStyle(kind: OverlayKind): Phaser.Types.GameObjects.Text.TextStyle {
  const color =
    kind === 'win'
      ? GameTheme.colors.accentHex
      : kind === 'lose'
        ? GameTheme.colors.dangerHex
        : kind === 'loading'
          ? GameTheme.colors.primaryHex
          : GameTheme.colors.textHex;
  return makeLabelStyle(22, color, { fontStyle: '800' });
}
