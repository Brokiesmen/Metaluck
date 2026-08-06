import { GIFT_IMAGES } from '../data';
import type { Prize } from '../types';

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Слабое устройство: мало ядер или мало памяти (deviceMemory есть только в Chrome). */
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 4 || mem <= 4;
}

/**
 * Длина ленты напрямую задаёт ширину композитного слоя (total × 138px × DPR):
 * на телефонах с DPR 3 лента из 52 карт — текстура ~21000px, GPU бюджетных
 * устройств не успевает растеризовать тайлы при быстром прокруте → лаги.
 * Поэтому карточек меньше, а ощущение скорости сохраняем короткой длительностью.
 */
export function stripConfig() {
  const mobile = isCoarsePointer();
  const desktop = !mobile && typeof window !== 'undefined' && window.matchMedia('(min-width: 700px)').matches;
  const lowEnd = mobile && isLowEndDevice();
  // Короче лента = меньше GPU-тайлов при translate; на ПК можно длиннее и плавнее.
  const total = lowEnd ? 22 : mobile ? 28 : desktop ? 52 : 40;
  const winnerIdx = Math.floor(total * 0.78);
  const durationMs = prefersReducedMotion()
    ? 2800
    : lowEnd
      ? 4200
      : mobile
        ? 5000
        : desktop
          ? 7200
          : 6200;
  return { total, winnerIdx, durationMs };
}

export function preloadPrizeImages(prizes: Prize[]): void {
  const seen = new Set<string>();
  for (const prize of prizes) {
    const src = GIFT_IMAGES[prize.id]?.image;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}
