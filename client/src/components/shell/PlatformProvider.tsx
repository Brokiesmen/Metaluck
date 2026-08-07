import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Определение платформы для общего UI-слоя.
 *   telegram — существует window.Telegram.WebApp
 *   desktop  — обычный браузер без Telegram
 *
 * (Это упрощённое правило из плана. В боевом входе используется checkClientType,
 *  который дополнительно смотрит на initData; здесь — только наличие WebApp.)
 */
export type Platform = 'telegram' | 'desktop';

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop';
  return window.Telegram?.WebApp ? 'telegram' : 'desktop';
}

interface PlatformContextValue {
  platform: Platform;
  isTelegram: boolean;
  isDesktop: boolean;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

interface Props {
  children: ReactNode;
  /** Принудительно задать платформу (для превью обоих shell'ов). */
  force?: Platform;
}

export function PlatformProvider({ children, force }: Props) {
  const value = useMemo<PlatformContextValue>(() => {
    const platform = force ?? detectPlatform();
    return {
      platform,
      isTelegram: platform === 'telegram',
      isDesktop: platform === 'desktop',
    };
  }, [force]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within <PlatformProvider>');
  return ctx;
}
