// Telegram WebApp SDK type declarations
interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  viewportWidth?: number;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  expand(): void;
  close(): void;
  ready(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  onEvent?(eventType: string, callback: (...args: unknown[]) => void): void;
  offEvent?(eventType: string, callback: (...args: unknown[]) => void): void;
  openInvoice(
    url: string,
    callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void,
  ): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
    /** Срочный override базы API без пересборки (например туннель). */
    __MINIGAMES_API_BASE__?: string;
  }
}

export {};
