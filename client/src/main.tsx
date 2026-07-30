import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { applyTheme } from './settings/applyTheme';
import { readSettings } from './settings/storage';
import { SettingsProvider } from './settings/SettingsContext';
import { syncTelegramViewport } from './lib/telegramViewport';

// Apply saved theme + viewport insets before first paint (critical for iOS Telegram).
const bootSettings = readSettings();
applyTheme(bootSettings.theme);
document.documentElement.lang = bootSettings.language;
syncTelegramViewport();

// dev: react-playing-cards всё ещё на defaultProps — шум в консоли, на работу приложения не влияет
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === 'string' && /Support for defaultProps will be removed/.test(first)) {
      return;
    }
    originalError.call(console, ...args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
