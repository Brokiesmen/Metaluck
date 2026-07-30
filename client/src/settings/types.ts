export type AppLanguage = 'ru' | 'uk' | 'en' | 'es' | 'de';
export type AppTheme = 'light' | 'dark';

export interface AppSettings {
  language: AppLanguage;
  theme: AppTheme;
}

export const LANG_OPTIONS: Array<{
  id: AppLanguage;
  flag: string;
  nativeName: string;
}> = [
  { id: 'ru', flag: '🇷🇺', nativeName: 'Русский' },
  { id: 'uk', flag: '🇺🇦', nativeName: 'Українська' },
  { id: 'en', flag: '🇬🇧', nativeName: 'English' },
  { id: 'es', flag: '🇪🇸', nativeName: 'Español' },
  { id: 'de', flag: '🇩🇪', nativeName: 'Deutsch' },
];

export const LOCALE_TAGS: Record<AppLanguage, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
};

export const STORAGE_KEYS = {
  language: 'metaluck_language',
  theme: 'metaluck_theme',
} as const;
