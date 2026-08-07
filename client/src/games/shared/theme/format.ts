/** Pure formatting helpers — no Phaser / game imports. */

export function formatAmount(value: number, locale = 'en', maxFrac = 2): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const fractionDigits = abs >= 100 || Number.isInteger(value) ? 0 : maxFrac;
  return value.toLocaleString(locale, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  });
}

export function formatMultiplier(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '1.00×';
  return `${value.toFixed(digits)}×`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return String(s);
  return `${m}:${String(s).padStart(2, '0')}`;
}
