import { StrictMode, type ReactNode } from 'react';
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

/**
 * UI modes (rollback-friendly):
 * - default on this branch → new shell live UI (ShellLiveApp)
 * - ?ui=legacy → previous App shell
 * - ?ui=proto → dark-gold prototype UI (auth-free)
 * - ?shell=preview → mock shell demo
 */
const params = new URLSearchParams(window.location.search);
const shellPreview = params.get('shell') === 'preview';
const useLegacy = params.get('ui') === 'legacy';
const useProto = params.get('ui') === 'proto';
const forcedPlatform = params.get('platform');
const forced = forcedPlatform === 'telegram' || forcedPlatform === 'desktop' ? forcedPlatform : undefined;

const root = createRoot(document.getElementById('root')!);

function withProviders(node: ReactNode) {
  return (
    <StrictMode>
      <TonConnectUIProvider manifestUrl={tonManifestUrl}>
        <SettingsProvider>{node}</SettingsProvider>
      </TonConnectUIProvider>
    </StrictMode>
  );
}

// Превью-аффорданс: /?shell=preview&tgmock=1 подставляет Telegram-личность
// ДО старта React, чтобы продемонстрировать Mini App skip-login. Только превью.
if (shellPreview && params.get('tgmock') === '1') {
  const noop = () => {};
  window.Telegram = {
    WebApp: {
      initData: 'mock',
      initDataUnsafe: { user: { id: 777001, first_name: 'Mark', username: 'markevans' } },
      version: '7.0', platform: 'tdesktop', colorScheme: 'dark', themeParams: {},
      isExpanded: true, viewportHeight: 800, viewportStableHeight: 800,
      HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
      expand: noop, close: noop, ready: noop, setHeaderColor: noop, setBackgroundColor: noop,
      onEvent: noop, offEvent: noop, openInvoice: noop,
    },
  } as unknown as NonNullable<Window['Telegram']>;
}

if (shellPreview) {
  void import('./components/shell').then(({ ShellDemo }) => {
    root.render(
      <StrictMode>
        <ShellDemo force={forced} />
      </StrictMode>,
    );
  });
} else if (useProto) {
  void import('./prototype').then(({ ProtoApp }) => {
    root.render(
      <StrictMode>
        <ProtoApp />
      </StrictMode>,
    );
  });
} else if (useLegacy) {
  root.render(withProviders(<App />));
} else {
  void import('./components/shell').then(({ ShellLiveApp }) => {
    root.render(withProviders(<ShellLiveApp force={forced} />));
  });
}
