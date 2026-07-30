import type { AppLanguage, AppTheme, AppSettings } from './types';
import { STORAGE_KEYS } from './types';

function isLanguage(v: unknown): v is AppLanguage {
  return v === 'ru' || v === 'uk' || v === 'en' || v === 'es' || v === 'de';
}

function isTheme(v: unknown): v is AppTheme {
  return v === 'light' || v === 'dark';
}

function telegramLanguageHint(): AppLanguage | null {
  const code = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code?.toLowerCase();
  if (!code) return null;
  if (code.startsWith('uk')) return 'uk';
  if (code.startsWith('en')) return 'en';
  if (code.startsWith('es')) return 'es';
  if (code.startsWith('de')) return 'de';
  if (code.startsWith('ru')) return 'ru';
  return null;
}

export function readSettings(): AppSettings {
  let language: AppLanguage = 'ru';
  let theme: AppTheme = 'dark';

  try {
    const storedLang = localStorage.getItem(STORAGE_KEYS.language);
    if (isLanguage(storedLang)) language = storedLang;
    else {
      const hint = telegramLanguageHint();
      if (hint) language = hint;
    }
  } catch {
    /* ignore */
  }

  try {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (isTheme(storedTheme)) theme = storedTheme;
  } catch {
    /* ignore */
  }

  return { language, theme };
}

export function writeLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEYS.language, language);
  } catch {
    /* ignore */
  }
}

export function writeTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* ignore */
  }
}
