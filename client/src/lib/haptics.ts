/**
 * Тактильный отклик Telegram (Bot API 6.1+).
 *
 * SDK уже загружен в index.html, отдельной зависимости не нужно. На старых
 * клиентах и вне Telegram методов нет — все вызовы молчано-оп, чтобы отклик
 * никогда не ронял игровой поток.
 */

/** Тип выводится из глобального Window — интерфейсы telegram.d.ts модульные. */
function haptic() {
  try {
    return window.Telegram?.WebApp?.HapticFeedback ?? null;
  } catch {
    return null;
  }
}

export function hapticSuccess(): void {
  try {
    haptic()?.notificationOccurred?.('success');
  } catch {
    /* старый клиент */
  }
}

export function hapticWarning(): void {
  try {
    haptic()?.notificationOccurred?.('warning');
  } catch {
    /* старый клиент */
  }
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium'): void {
  try {
    haptic()?.impactOccurred?.(style);
  } catch {
    /* старый клиент */
  }
}
