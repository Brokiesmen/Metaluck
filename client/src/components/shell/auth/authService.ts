/**
 * Сервис авторизации, подключённый к бэкенду (никакого UI).
 *
 * Бэкенд (server/src/routes/auth.ts + webAuth.ts): единая модель accounts
 * (telegram + google), проверка OAuth-токенов, создание записей, Bearer-сессии,
 * защита роутов (accountFromRequest). Здесь — только клиентская обвязка.
 *
 * Пути входа:
 *  • Telegram Mini App → POST /api/auth/telegram/initdata (signed initData)
 *  • Google (браузер)  → Google Identity Services → POST /api/auth/google
 *  • Telegram (браузер)→ deep-link start + poll
 *  • Сессия           → GET /api/auth/me (Bearer), logout → POST /api/auth/logout
 *
 * Fallback на демо-пользователя срабатывает ТОЛЬКО при сетевой ошибке
 * (автономное превью слоя без сервера), чтобы UI оставался кликабельным.
 */
import { api, getAuthToken, setAuthToken } from '../../../api';
import type { WebUser } from '../../../types';
import { getWebApp } from '../telegram';
import type { AuthUser } from './types';

function mapUser(w: WebUser): AuthUser {
  return {
    id: String(w.id),
    telegram_id: w.telegramId ?? null,
    google_id: w.googleId ?? null,
    email: w.email ?? null,
    username: w.username ?? (w.email ? w.email.split('@')[0] : `user${w.id}`),
    avatar: w.avatar ?? null,
  };
}

/** Подписанный initData Mini App (пустой вне Telegram). */
function initData(): string {
  return String(getWebApp()?.initData ?? '').trim();
}

export function isMiniApp(): boolean {
  return initData().length > 0;
}

/** Клиентская личность из Mini App SDK — для мгновенного отображения. */
export function telegramIdentity(): AuthUser | null {
  const u = getWebApp()?.initDataUnsafe?.user;
  if (!u) return null;
  const name = u.username || [u.first_name, u.last_name].filter(Boolean).join(' ') || `tg${u.id}`;
  return { id: `tg:${u.id}`, telegram_id: u.id, google_id: null, email: null, username: name, avatar: u.photo_url ?? null };
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && /Failed to fetch|NetworkError|load failed/i.test(e.message));
}

const DEMO_GOOGLE: AuthUser = {
  id: 'g:105152261479', telegram_id: null, google_id: '105152261479',
  email: 'mark@gmail.com', username: 'Mark Evans', avatar: '🟢',
};
const DEMO_TELEGRAM: AuthUser = {
  id: 'tg:100200300', telegram_id: 100200300, google_id: null,
  email: null, username: 'markevans', avatar: '🦊',
};

/** Восстановление сессии: Mini App initData → сессия; иначе Bearer → /me. */
export async function bootstrap(): Promise<AuthUser | null> {
  const id = initData();
  if (id) {
    try {
      const r = await api.authTelegramInitData(id);
      return mapUser(r.user);
    } catch (e) {
      if (isNetworkError(e)) return telegramIdentity(); // offline preview
      return null;
    }
  }
  if (getAuthToken()) {
    try {
      return mapUser(await api.authMe());
    } catch {
      setAuthToken(null);
      return null;
    }
  }
  return null;
}

export async function loginTelegram(): Promise<AuthUser> {
  const id = initData();
  if (id) {
    const r = await api.authTelegramInitData(id);
    return mapUser(r.user);
  }
  try {
    // Браузер: deep-link t.me/bot?start=web_… + poll.
    const started = await api.authTelegramStart();
    window.open(started.deepLink, '_blank', 'noopener,noreferrer');
    return await pollTelegram(started.challengeId, started.pollIntervalMs);
  } catch (e) {
    if (isNetworkError(e)) return DEMO_TELEGRAM;
    throw e;
  }
}

async function pollTelegram(challengeId: string, intervalMs = 2000): Promise<AuthUser> {
  const deadline = Date.now() + 10 * 60 * 1000;
  const wait = Math.max(1500, intervalMs);
  for (;;) {
    const r = await api.authTelegramPoll(challengeId);
    if (r.status === 'ready' && r.token && r.user) {
      setAuthToken(r.token);
      return mapUser(r.user);
    }
    if (r.status === 'expired' || Date.now() > deadline) throw new Error('Telegram login expired');
    await new Promise((res) => setTimeout(res, wait));
  }
}

export async function loginGoogle(): Promise<AuthUser> {
  try {
    const credential = await getGoogleCredential();
    const r = await api.authGoogle(credential);
    return mapUser(r.user);
  } catch (e) {
    if (isNetworkError(e)) return DEMO_GOOGLE;
    throw e;
  }
}

/** Google Identity Services → id_token (credential). */
async function getGoogleCredential(): Promise<string> {
  const cfg = await api.authConfig();
  const clientId = cfg.googleClientId;
  if (!clientId) throw new Error('Google login is not configured');
  await loadScript('https://accounts.google.com/gsi/client');
  return await new Promise<string>((resolve, reject) => {
    const g = window.google;
    if (!g) return reject(new Error('Google SDK failed to load'));
    g.accounts.id.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      callback: (resp: { credential: string }) => {
        if (resp?.credential) resolve(resp.credential);
        else reject(new Error('Google sign-in cancelled'));
      },
    });
    g.accounts.id.prompt();
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function logout(): Promise<void> {
  try {
    await api.authLogout();
  } catch {
    setAuthToken(null);
  }
}
