import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react';
import { DICTS, type Dict } from '../i18n/dictionaries';
import { applyTheme } from './applyTheme';
import { readSettings, writeLanguage, writeTheme } from './storage';
import { LOCALE_TAGS, type AppLanguage, type AppTheme } from './types';

type SettingsContextValue = {
  language: AppLanguage;
  theme: AppTheme;
  locale: string;
  t: Dict;
  setLanguage: (lang: AppLanguage) => void;
  setTheme: (theme: AppTheme) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const initial = readSettings();
  const [language, setLanguageState] = useState<AppLanguage>(initial.language);
  const [theme, setThemeState] = useState<AppTheme>(initial.theme);

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    writeLanguage(lang);
    document.documentElement.lang = lang;
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    writeTheme(next);
    applyTheme(next);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      language,
      theme,
      locale: LOCALE_TAGS[language],
      t: DICTS[language],
      setLanguage,
      setTheme,
    }),
    [language, theme, setLanguage, setTheme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
