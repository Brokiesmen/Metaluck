import type { TelegramUser } from '../types';

// Dev fallback user (when opened outside Telegram)
const DEV_USER: TelegramUser = {
  id: 0,
  first_name: 'Тест',
  last_name: 'Режим',
  username: 'devmode',
};

export function useTelegram() {
  const tg = window.Telegram?.WebApp ?? null;
  const tgUser = tg?.initDataUnsafe?.user as TelegramUser | undefined;
  // Порядок: Mini App (initData) → web-сессия → local DEV_USER.
  // Тип клиента: см. checkClientType() / useClientType().
  const user: TelegramUser = tgUser ?? window.__webUser ?? DEV_USER;
  const initData = tg?.initData ?? '';
  const isDev = !tg || !tg.initData;
  return { tg, user, initData, isDev };
}
