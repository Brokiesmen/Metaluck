/**
 * Runtime device hints for Phaser games (mobile / low-end tuning).
 * Cached once per page load — cheap to query from any game.
 */

export interface DeviceProfile {
  /** Coarse pointer (typical phone / Telegram WebView). */
  coarsePointer: boolean;
  /** Prefer fewer particles / simpler FX. */
  lowPower: boolean;
  /** Very constrained — drop fills, smoke, antialias. */
  veryLow: boolean;
  /** OS “reduce motion”. */
  reducedMotion: boolean;
  /** Suggested FPS target. */
  fpsTarget: number;
  /** Extra hit-pad for touch buttons (px). */
  touchPad: number;
}

let cached: DeviceProfile | null = null;

export function getDeviceProfile(): DeviceProfile {
  if (cached) return cached;

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    cached = {
      coarsePointer: true,
      lowPower: true,
      veryLow: false,
      reducedMotion: false,
      fpsTarget: 60,
      touchPad: 10,
    };
    return cached;
  }

  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  const lowPower = coarsePointer || cores <= 4 || mem <= 4 || saveData || dpr >= 3;
  const veryLow = cores <= 2 || mem <= 2 || saveData;

  cached = {
    coarsePointer,
    lowPower,
    veryLow,
    reducedMotion,
    fpsTarget: veryLow ? 30 : lowPower ? 45 : 60,
    touchPad: coarsePointer ? 12 : 4,
  };
  return cached;
}

/** Test helper. */
export function resetDeviceProfileCache(): void {
  cached = null;
}
