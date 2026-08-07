/**
 * Сервис авторизации — вся логика, НИКАКОГО UI.
 * Telegram Mini App: личность из WebApp SDK (вход не требуется).
 * Браузер: loginTelegram / loginGoogle → сессия (persist в localStorage).
 *
 * Демо-реализация браузерных логинов самодостаточна (слой превьюится отдельно).
 * Для прод-бэкенда loginTelegram/loginGoogle меняются на вызовы api.ts
 * (authTelegramStart/poll, GIS + authGoogle) — контракт функций тот же.
 */
import { getWebApp } from '../telegram';
import type { AuthUser } from './types';

const STORAGE_KEY = 'sh_auth_user_v1';

function readStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function store(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Личность из Telegram Mini App (client-side, без бэкенда). null вне Mini App. */
export function telegramIdentity(): AuthUser | null {
  const u = getWebApp()?.initDataUnsafe?.user;
  if (!u) return null;
  const name = u.username || [u.first_name, u.last_name].filter(Boolean).join(' ') || `tg${u.id}`;
  return {
    id: `tg:${u.id}`,
    telegram_id: u.id,
    google_id: null,
    email: null,
    username: name,
    avatar: u.photo_url ?? null,
  };
}

export function isMiniApp(): boolean {
  return telegramIdentity() != null;
}

/** Текущий пользователь: Mini App identity имеет приоритет, иначе — сохранённая сессия. */
export function getCurrentUser(): AuthUser | null {
  return telegramIdentity() ?? readStored();
}

export async function loginTelegram(): Promise<AuthUser> {
  const tg = telegramIdentity();
  if (tg) {
    store(tg);
    return tg;
  }
  // Демо для браузера (в проде — deep-link t.me/bot?start=web_… + poll).
  const demo: AuthUser = {
    id: 'tg:100200300',
    telegram_id: 100200300,
    google_id: null,
    email: null,
    username: 'markevans',
    avatar: '🦊',
  };
  store(demo);
  return demo;
}

export async function loginGoogle(): Promise<AuthUser> {
  // Демо для браузера (в проде — Google Identity Services → id_token → api.authGoogle).
  const demo: AuthUser = {
    id: 'g:105152261479',
    telegram_id: null,
    google_id: '105152261479',
    email: 'mark@gmail.com',
    username: 'Mark Evans',
    avatar: '🟢',
  };
  store(demo);
  return demo;
}

export function logout(): void {
  store(null);
}
