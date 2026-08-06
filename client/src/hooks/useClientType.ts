import { useMemo } from 'react';
import {
  applyClientTypeToDocument,
  checkClientType,
  type ClientType,
  type ClientTypeInfo,
} from '../lib/checkClientType';

/**
 * Реактивная обёртка над checkClientType().
 * Тип клиента стабилен на сессию (Mini App не превращается в браузер mid-flight).
 */
export function useClientType(): ClientTypeInfo & { isTelegramWebApp: boolean; isDesktopWeb: boolean } {
  return useMemo(() => {
    const info = applyClientTypeToDocument(checkClientType());
    return {
      ...info,
      isTelegramWebApp: info.client === 'telegram_webapp',
      isDesktopWeb: info.client === 'desktop_web',
    };
  }, []);
}

export type { ClientType, ClientTypeInfo };
