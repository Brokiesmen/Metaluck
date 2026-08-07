/**
 * Design tokens for Metaluck Phaser games.
 * Dark commercial Telegram / web-casino look — shared by all UI kits.
 */

export const GameTheme = {
  colors: {
    bg: 0x0a0e14,
    bgHex: '#0a0e14',
    surface: 0x121821,
    surfaceHex: '#121821',
    surfaceRaised: 0x1a2330,
    surfaceRaisedHex: '#1a2330',
    surfaceHover: 0x243041,
    border: 0x2a3544,
    borderStrong: 0x3d4d63,
    text: 0xe8eef7,
    textHex: '#e8eef7',
    textMuted: 0x8b9bb0,
    textMutedHex: '#8b9bb0',
    textDim: 0x5c6b7e,
    textDimHex: '#5c6b7e',
    primary: 0x2f8cff,
    primaryHex: '#2f8cff',
    primaryHover: 0x4a9dff,
    accent: 0x3dde9a,
    accentHex: '#3dde9a',
    accentHot: 0xffc14a,
    accentHotHex: '#ffc14a',
    danger: 0xff5c7a,
    dangerHex: '#ff5c7a',
    dangerHover: 0xff7a92,
    win: 0x3dde9a,
    lose: 0xff5c7a,
    neutral: 0x8b9bb0,
    overlay: 0x05070a,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  font: {
    ui: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  depth: {
    panel: 100,
    hud: 200,
    overlay: 1000,
    modal: 1100,
    toast: 1200,
  },
  motion: {
    fast: 120,
    normal: 220,
    slow: 360,
  },
} as const;

export type GameThemeColors = typeof GameTheme.colors;

export function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}
