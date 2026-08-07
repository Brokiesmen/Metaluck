import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import './index.css';
import { App } from './App';
import { applyTheme } from './settings/applyTheme';
import { readSettings } from './settings/storage';
import { SettingsProvider } from './settings/SettingsContext';
import { syncTelegramViewport } from './lib/telegramViewport';
import { applyClientTypeToDocument } from './lib/checkClientType';

// Apply saved theme + viewport insets before first paint (critical for iOS Telegram).
const bootSettings = readSettings();
applyTheme(bootSettings.theme);
document.documentElement.lang = bootSettings.language;
applyClientTypeToDocument(); // html[data-client]=telegram_webapp|desktop_web
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

// TON Connect manifest отдаётся из /public (Vercel/vite). Кошельки его фетчат.
const tonManifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

// Превью общего UI-слоя: /?shell=preview (&platform=telegram|desktop). Не влияет на боевой поток.
const params = new URLSearchParams(window.location.search);
const shellPreview = params.get('shell') === 'preview';
const forcedPlatform = params.get('platform');
const forced = forcedPlatform === 'telegram' || forcedPlatform === 'desktop' ? forcedPlatform : undefined;

const root = createRoot(document.getElementById('root')!);

if (shellPreview) {
  // Ленивая загрузка, чтобы shell-слой не попадал в основной бандл.
  void import('./components/shell').then(({ ShellDemo }) => {
    root.render(
      <StrictMode>
        <ShellDemo force={forced} />
      </StrictMode>,
    );
  });
} else {
  root.render(
    <StrictMode>
      <TonConnectUIProvider manifestUrl={tonManifestUrl}>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </TonConnectUIProvider>
    </StrictMode>,
  );
}
