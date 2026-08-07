/** Модель пользователя авторизации (UI-независимая). */
export interface AuthUser {
  id: string;
  telegram_id: number | null;
  google_id: string | null;
  email: string | null;
  username: string;
  avatar: string | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** true в Telegram Mini App — вход не нужен, личность берётся из SDK. */
  isMiniApp: boolean;
  loginTelegram: () => Promise<AuthUser>;
  loginGoogle: () => Promise<AuthUser>;
  logout: () => void;
  getCurrentUser: () => AuthUser | null;
}
