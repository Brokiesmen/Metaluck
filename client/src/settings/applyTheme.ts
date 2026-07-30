import type { AppTheme } from './types';

const THEME_COLORS: Record<AppTheme, { bg: string; header: string }> = {
  dark:  { bg: '#17212b', header: '#17212b' },
  light: { bg: '#f4f6f8', header: '#ffffff' },
};

/** Apply theme to <html> before/without React to avoid flash. */
export function applyTheme(theme: AppTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
  const colors = THEME_COLORS[theme];
  document.documentElement.style.colorScheme = theme;
  document.body.style.background = colors.bg;

  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.setHeaderColor?.(colors.header);
      tg.setBackgroundColor?.(colors.bg);
    } catch {
      /* older clients */
    }
  }
}
