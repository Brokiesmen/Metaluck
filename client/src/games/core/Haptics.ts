/**
 * Haptics for Telegram Mini Apps (+ safe fallbacks).
 * No-ops when Telegram WebApp / Vibration API unavailable.
 */

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

interface TgHaptic {
  impactOccurred?: (style: ImpactStyle) => void;
  notificationOccurred?: (type: NotificationType) => void;
  selectionChanged?: () => void;
}

interface TgWebApp {
  HapticFeedback?: TgHaptic;
}

function getTgHaptic(): TgHaptic | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
  return tg?.HapticFeedback ?? null;
}

function fallbackVibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export const Haptics = {
  impact(style: ImpactStyle = 'light'): void {
    const h = getTgHaptic();
    if (h?.impactOccurred) {
      try {
        h.impactOccurred(style);
        return;
      } catch {
        /* fall through */
      }
    }
    const ms = style === 'heavy' || style === 'rigid' ? 28 : style === 'medium' ? 18 : 10;
    fallbackVibrate(ms);
  },

  notify(type: NotificationType): void {
    const h = getTgHaptic();
    if (h?.notificationOccurred) {
      try {
        h.notificationOccurred(type);
        return;
      } catch {
        /* fall through */
      }
    }
    if (type === 'success') fallbackVibrate([12, 40, 18]);
    else if (type === 'error') fallbackVibrate([30, 40, 30]);
    else fallbackVibrate(20);
  },

  selection(): void {
    const h = getTgHaptic();
    if (h?.selectionChanged) {
      try {
        h.selectionChanged();
        return;
      } catch {
        /* fall through */
      }
    }
    fallbackVibrate(8);
  },
};
