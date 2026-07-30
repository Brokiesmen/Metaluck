/**
 * Sync Telegram viewport + safe-area CSS variables for iOS Mini Apps.
 * env(safe-area-inset-*) is often 0 inside Telegram iOS WebView — use SDK insets instead.
 */

type Inset = { top?: number; bottom?: number; left?: number; right?: number };

function px(n: number): string {
  return `${Math.max(0, Math.round(n))}px`;
}

function cssPx(root: HTMLElement, name: string): number {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  if (!raw) return 0;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function readInset(raw: Inset | undefined): Required<Inset> {
  return {
    top: Number(raw?.top) || 0,
    bottom: Number(raw?.bottom) || 0,
    left: Number(raw?.left) || 0,
    right: Number(raw?.right) || 0,
  };
}

export function syncTelegramViewport(): void {
  const root = document.documentElement;
  const tg = window.Telegram?.WebApp;

  const safe = readInset(tg?.safeAreaInset);
  const content = readInset(tg?.contentSafeAreaInset);

  // Also pick up CSS vars Telegram may inject, then take the larger value.
  const top = Math.max(
    safe.top + content.top,
    cssPx(root, '--tg-safe-area-inset-top') + cssPx(root, '--tg-content-safe-area-inset-top'),
  );
  const bottom = Math.max(
    safe.bottom + content.bottom,
    cssPx(root, '--tg-safe-area-inset-bottom') + cssPx(root, '--tg-content-safe-area-inset-bottom'),
  );
  const left = Math.max(
    safe.left + content.left,
    cssPx(root, '--tg-safe-area-inset-left') + cssPx(root, '--tg-content-safe-area-inset-left'),
  );
  const right = Math.max(
    safe.right + content.right,
    cssPx(root, '--tg-safe-area-inset-right') + cssPx(root, '--tg-content-safe-area-inset-right'),
  );

  // Only override CSS env() fallbacks when Telegram reports real insets.
  const setOrClear = (name: string, value: number) => {
    if (value > 0) root.style.setProperty(name, px(value));
    else root.style.removeProperty(name);
  };
  setOrClear('--app-safe-top', top);
  setOrClear('--app-safe-bottom', bottom);
  setOrClear('--app-safe-left', left);
  setOrClear('--app-safe-right', right);

  const vh =
    tg?.viewportStableHeight ||
    tg?.viewportHeight ||
    window.visualViewport?.height ||
    window.innerHeight;

  if (vh && Number.isFinite(vh) && vh > 0) {
    root.style.setProperty('--app-vh', px(vh));
  }
}

/** Call once after Telegram SDK is ready; returns cleanup. */
export function startTelegramViewportSync(): () => void {
  syncTelegramViewport();

  const tg = window.Telegram?.WebApp;
  const onChange = () => syncTelegramViewport();

  tg?.onEvent?.('viewportChanged', onChange);
  tg?.onEvent?.('safeAreaChanged', onChange);
  tg?.onEvent?.('contentSafeAreaChanged', onChange);
  window.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('resize', onChange);

  // Telegram sometimes reports insets a tick after ready/expand.
  const t1 = window.setTimeout(onChange, 50);
  const t2 = window.setTimeout(onChange, 300);

  return () => {
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    tg?.offEvent?.('viewportChanged', onChange);
    tg?.offEvent?.('safeAreaChanged', onChange);
    tg?.offEvent?.('contentSafeAreaChanged', onChange);
    window.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('resize', onChange);
  };
}
