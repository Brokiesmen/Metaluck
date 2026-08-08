/**
 * Aviator visual identity — dark premium casino aesthetic.
 * Fonts stay on system stacks: the app ships no web fonts and a Mini App
 * should not block first paint on a Google Fonts round-trip.
 */
export const AviatorTheme = {
  brand: 'Aviator',
  colors: {
    void: '#03050c',
    deep: '#070b18',
    night: '#0c1224',
    panel: '#10182c',
    panelElevated: '#162038',
    border: 'rgba(120, 160, 220, 0.14)',
    borderStrong: 'rgba(140, 190, 255, 0.28)',

    text: '#e8eef8',
    textMuted: '#8b9bb8',
    textDim: '#5a6a86',

    cyan: '#2ef5d0',
    cyanSoft: '#1ab89a',
    cyanGlow: 'rgba(46, 245, 208, 0.45)',
    amber: '#ffb347',
    amberGlow: 'rgba(255, 179, 71, 0.4)',
    rose: '#ff4d7a',
    roseGlow: 'rgba(255, 77, 122, 0.45)',
    gold: '#f6d36a',
    white: '#ffffff',
  },
  multiplier: {
    normal: '#2ef5d0',
    elevated: '#7ef5c8',
    high: '#ffb347',
    extreme: '#ff6b9d',
    crash: '#ff4d7a',
  },
  fonts: {
    display: '-apple-system, "Segoe UI", system-ui, sans-serif',
    body: '-apple-system, "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "Consolas", monospace',
  },
} as const;

export type AviatorThemeColors = typeof AviatorTheme.colors;
