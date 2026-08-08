import { useEffect, useMemo, useRef } from 'react';
import { useSettings } from '../settings/SettingsContext';
import { useWagerCurrency } from '../hooks/useWagerCurrency';
import type { WalletCurrency } from '../types';
import type { AviatorOptions } from '../games/aviator';
import { AviatorAppTransport } from './aviatorTransport';

/**
 * Wires the isolated Aviator game module to the app: live transport over
 * /api/aviator, the shared wager-currency preference and localized copy.
 *
 * Returns null while the game is not on screen so no socket is opened.
 */
export function useAviatorRuntime(active: boolean): AviatorOptions | null {
  const { t } = useSettings();
  const { currency, setCurrency } = useWagerCurrency();

  // The transport reads these on demand — no reload when the player switches
  // currency mid-session.
  const currencyRef = useRef<WalletCurrency>(currency);
  currencyRef.current = currency;
  const setCurrencyRef = useRef(setCurrency);
  setCurrencyRef.current = setCurrency;

  const loadError = t.av.loadError;

  const transport = useMemo(() => {
    if (!active) return null;
    return new AviatorAppTransport({
      getCurrency: () => currencyRef.current,
      onCurrencyChange: (next) => setCurrencyRef.current(next),
      loadErrorText: loadError,
    });
    // Recreated only when the screen is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!transport) return;
    return () => transport.disconnect();
  }, [transport]);

  // `avUi` mirrors AviatorStrings field-for-field, so it passes straight through.
  const strings = useMemo<AviatorOptions['strings']>(() => ({ ...t.avUi }), [t]);

  return useMemo(() => (transport ? { transport, strings } : null), [transport, strings]);
}
