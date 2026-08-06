/**
 * Sync Telegram viewport + safe-area CSS variables for iOS Mini Apps,
 * and set responsive layout tokens (--app-max-w, --ui-scale, fonts) for PC/desktop.
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

/** Layout shell width + UI scale from real viewport (Telegram Desktop / browser PC). */
function syncLayoutScale(
  root: HTMLElement,
  tg:
    | {
        platform?: string;
        viewportWidth?: number;
        viewportHeight?: number;
        viewportStableHeight?: number;
      }
    | undefined,
): void {
  const vw =
    window.visualViewport?.width ||
    tg?.viewportWidth ||
    window.innerWidth ||
    390;
  const vh =
    tg?.viewportStableHeight ||
    tg?.viewportHeight ||
    window.visualViewport?.height ||
    window.innerHeight ||
    700;

  root.style.setProperty('--app-vw', px(vw));

  const finePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const fromTg = (tg?.platform || '').toLowerCase();
  const isDesktopTg = fromTg === 'tdesktop' || fromTg === 'web' || fromTg === 'weba' || fromTg === 'webk';
  const isPc = (finePointer && !coarsePointer) || (isDesktopTg && vw >= 560);

  // Высоту фиксируем в px только на мобильных, где 100dvh врёт из-за
  // сворачивающихся панелей браузера и Telegram-вьюпорта. На десктопе пиксельное
  // значение — источник рассинхрона: пропущенный resize оставляет оболочку не по
  // размеру окна, поэтому там отдаём высоту нативному 100dvh из :root.
  if (isPc) {
    root.style.removeProperty('--app-vh');
  } else if (vh && Number.isFinite(vh) && vh > 0) {
    root.style.setProperty('--app-vh', px(vh));
  }

  // Cap shell: phone 480 → tablet 560 → desktop 640–720
  let maxW = 480;
  if (vw >= 1100) maxW = 720;
  else if (vw >= 900) maxW = 640;
  else if (vw >= 700) maxW = 560;
  else if (vw >= 520) maxW = Math.min(520, Math.floor(vw));
  else maxW = Math.min(480, Math.floor(vw));

  // Scale fonts / game pieces relative to a 390px design width.
  const design = 390;
  let scale = Math.min(1.28, Math.max(0.92, maxW / design));
  if (!isPc) scale = Math.min(1.08, Math.max(0.94, vw / design));

  const baseFont = Math.round(15 * Math.min(1.2, Math.max(0.95, scale)) * 10) / 10;
  const dpr = Math.min(3, window.devicePixelRatio || 1);

  root.style.setProperty('--app-max-w', px(maxW));
  root.style.setProperty('--ui-scale', String(Math.round(scale * 1000) / 1000));
  root.style.setProperty('--app-font', `${baseFont}px`);
  root.style.setProperty('--app-dpr', String(dpr));
  root.dataset.device = isPc ? 'desktop' : 'mobile';
  root.dataset.pointer = finePointer ? 'fine' : coarsePointer ? 'coarse' : 'unknown';
  root.dataset.hq = isPc && dpr >= 1.5 ? '1' : '0';
}

export function syncTelegramViewport(): void {
  const root = document.documentElement;
  const tg = window.Telegram?.WebApp;

  syncLayoutScale(root, tg);
  const isDesktop = root.dataset.device === 'desktop';

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
  // Telegram Desktop / web can report bogus horizontal insets which shove the app left.
  // Keep phone safe-areas, but zero desktop gutters so the shell stays centered.
  setOrClear('--app-safe-top', isDesktop ? 0 : top);
  setOrClear('--app-safe-bottom', isDesktop ? 0 : bottom);
  setOrClear('--app-safe-left', isDesktop ? 0 : left);
  setOrClear('--app-safe-right', isDesktop ? 0 : right);

  // Platform hint for CSS (iOS games lobby becomes a list).
  const ua = navigator.userAgent || '';
  const fromTg = (tg?.platform || '').toLowerCase();
  const isIos =
    fromTg === 'ios' ||
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = fromTg === 'android' || /Android/i.test(ua);
  root.dataset.platform = isIos ? 'ios' : isAndroid ? 'android' : fromTg || 'web';
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
  window.visualViewport?.addEventListener('scroll', onChange);

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
    window.visualViewport?.removeEventListener('scroll', onChange);
  };
}
