/**
 * Client-type middleware: Telegram Mini App vs browser (desktop web).
 *
 * telegram_webapp — есть валидный WebApp.initData → авторизация через initData.
 * desktop_web     — обычный браузер → Google / Telegram Login Widget.
 */

export type ClientType = 'telegram_webapp' | 'desktop_web';

type TgWebApp = NonNullable<Window['Telegram']>['WebApp'];

export interface ClientTypeInfo {
  client: ClientType;
  /** Непустой initData только для telegram_webapp. */
  initData: string;
  tg: TgWebApp | null;
}

function readTelegramWebApp(): TgWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * Определяет тип клиента.
 * Достаточно непустого `Telegram.WebApp.initData` — это и есть сессия Mini App.
 * Один лишь объект `Telegram.WebApp` (скрипт без initData) = desktop_web.
 */
export function checkClientType(): ClientTypeInfo {
  const tg = readTelegramWebApp();
  const initData = String(tg?.initData ?? '').trim();

  if (initData.length > 0) {
    return { client: 'telegram_webapp', initData, tg };
  }

  return { client: 'desktop_web', initData: '', tg };
}

export function isTelegramWebAppClient(info: ClientTypeInfo = checkClientType()): boolean {
  return info.client === 'telegram_webapp';
}

export function isDesktopWebClient(info: ClientTypeInfo = checkClientType()): boolean {
  return info.client === 'desktop_web';
}

/** Пишет `html[data-client]` для CSS / отладки. */
export function applyClientTypeToDocument(info: ClientTypeInfo = checkClientType()): ClientTypeInfo {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.client = info.client;
  }
  return info;
}
