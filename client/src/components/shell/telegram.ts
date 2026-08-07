import { useEffect, useState } from 'react';

/**
 * Клиентская интеграция Telegram WebApp SDK для общего UI-слоя.
 * Только браузер: все обращения к window.Telegram защищены. Авторизации здесь НЕТ.
 */

/** Цвет фона shell'а (Stake dark) — под него красим Telegram-хром. */
const SHELL_BG = '#0f212e';

/** Тип WebApp берём из глобального Window (интерфейс в telegram.d.ts модульный). */
type WebApp = NonNullable<Window['Telegram']>['WebApp'];

export function getWebApp(): WebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramWebApp(): boolean {
  return getWebApp() != null;
}

// ── Haptic feedback helper ─────────────────────────────────────────
type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotify = 'error' | 'success' | 'warning';

export const haptic = {
  impact(style: HapticImpact = 'light'): void {
    getWebApp()?.HapticFeedback?.impactOccurred?.(style);
  },
  notify(type: HapticNotify = 'success'): void {
    getWebApp()?.HapticFeedback?.notificationOccurred?.(type);
  },
  selection(): void {
    getWebApp()?.HapticFeedback?.selectionChanged?.();
  },
};

// ── Viewport + safe-area → CSS vars ────────────────────────────────
function setVar(name: string, value: string): void {
  if (typeof document !== 'undefined') document.documentElement.style.setProperty(name, value);
}

function applySafeArea(wa: WebApp): void {
  const inset = wa.contentSafeAreaInset ?? wa.safeAreaInset;
  if (!inset) return;
  setVar('--sh-safe-top', `${inset.top}px`);
  setVar('--sh-safe-bottom', `${inset.bottom}px`);
  setVar('--sh-safe-left', `${inset.left}px`);
  setVar('--sh-safe-right', `${inset.right}px`);
}

function applyViewport(wa: WebApp): void {
  const h = wa.viewportStableHeight || wa.viewportHeight;
  if (h) setVar('--sh-vh', `${h}px`);
}

export interface TelegramState {
  isTelegram: boolean;
  colorScheme: 'light' | 'dark';
  viewportHeight: number;
  expand: () => void;
  haptic: typeof haptic;
}

/**
 * Инициализирует Telegram WebApp (ready → expand → theme/viewport/safe-area),
 * подписывается на изменения и отдаёт актуальное состояние. No-op вне Telegram.
 */
export function useTelegramWebApp(): TelegramState {
  const initial = getWebApp();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(initial?.colorScheme ?? 'dark');
  const [viewportHeight, setViewportHeight] = useState<number>(
    initial?.viewportStableHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 0),
  );

  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;

    try { wa.ready(); } catch { /* older client */ }
    try { wa.expand(); } catch { /* ignore */ }
    // Theme integration: match Telegram chrome to the shell background.
    try {
      wa.setBackgroundColor(SHELL_BG);
      wa.setHeaderColor(SHELL_BG);
    } catch { /* pre-6.1 */ }

    applySafeArea(wa);
    applyViewport(wa);
    setColorScheme(wa.colorScheme);
    setViewportHeight(wa.viewportStableHeight || wa.viewportHeight);

    const onViewport = () => {
      applyViewport(wa);
      applySafeArea(wa);
      setViewportHeight(wa.viewportStableHeight || wa.viewportHeight);
    };
    const onTheme = () => setColorScheme(wa.colorScheme);
    const onSafe = () => applySafeArea(wa);

    wa.onEvent?.('viewportChanged', onViewport);
    wa.onEvent?.('themeChanged', onTheme);
    wa.onEvent?.('safeAreaChanged', onSafe);
    wa.onEvent?.('contentSafeAreaChanged', onSafe);

    return () => {
      wa.offEvent?.('viewportChanged', onViewport);
      wa.offEvent?.('themeChanged', onTheme);
      wa.offEvent?.('safeAreaChanged', onSafe);
      wa.offEvent?.('contentSafeAreaChanged', onSafe);
    };
  }, []);

  return {
    isTelegram: initial != null,
    colorScheme,
    viewportHeight,
    expand: () => getWebApp()?.expand(),
    haptic,
  };
}
