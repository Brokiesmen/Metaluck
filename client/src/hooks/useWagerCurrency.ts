import { useCallback, useEffect, useState } from 'react';
import type { WalletCurrency } from '../types';

const STORAGE_KEY = 'metaluck_wager_currency_v1';

const ALLOWED: WalletCurrency[] = ['STARS', 'TON', 'USDT_TON'];

function readStored(): WalletCurrency {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'STARS' || v === 'TON' || v === 'USDT_TON') return v;
  } catch {
    /* ignore */
  }
  return 'STARS';
}

/** Shared wager pay-currency preference for games. */
export function useWagerCurrency() {
  const [currency, setCurrencyState] = useState<WalletCurrency>(() => readStored());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'STARS' || e.newValue === 'TON' || e.newValue === 'USDT_TON')) {
        setCurrencyState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCurrency = useCallback((next: WalletCurrency) => {
    if (!ALLOWED.includes(next)) return;
    setCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { currency, setCurrency };
}

export function currencyLabel(code: WalletCurrency): string {
  if (code === 'STARS') return '★';
  if (code === 'TON') return 'TON';
  return 'USDT';
}
