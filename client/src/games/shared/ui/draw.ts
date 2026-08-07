import Phaser from 'phaser';
import { GameTheme } from '../theme/tokens';

/** Shared rounded panel chrome used by HUD widgets. */
export function drawRoundRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill: number,
  alpha = 1,
  stroke?: number,
  strokeAlpha = 1,
  strokeWidth = 1.5,
): void {
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  if (stroke != null) {
    g.lineStyle(strokeWidth, stroke, strokeAlpha);
    g.strokeRoundedRect(x, y, w, h, radius);
  }
}

export function makeLabelStyle(
  size: number,
  color: string = GameTheme.colors.textHex,
  opts?: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: GameTheme.font.ui,
    fontSize: `${size}px`,
    color,
    fontStyle: '600',
    ...opts,
  };
}

export function makeMonoStyle(
  size: number,
  color: string = GameTheme.colors.textHex,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: GameTheme.font.mono,
    fontSize: `${size}px`,
    color,
    fontStyle: '700',
  };
}
