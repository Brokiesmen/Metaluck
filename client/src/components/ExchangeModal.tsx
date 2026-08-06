import { useEffect, useState } from 'react';
import { api } from '../api';
import { ModalShell } from './ModalShell';
import { useSettings } from '../settings/SettingsContext';
import type { ExchangeQuote, WalletCurrency } from '../types';

interface Props {
  onClose: () => void;
  onDone?: () => void;
}

const CURRENCIES: WalletCurrency[] = ['STARS', 'TON', 'USDT_TON'];

function label(code: WalletCurrency): string {
  if (code === 'STARS') return '★ Stars';
  if (code === 'TON') return 'TON';
  return 'USDT';
}

function decimals(code: WalletCurrency): number {
  if (code === 'STARS') return 0;
  if (code === 'TON') return 9;
  return 6;
}

function toMinor(major: number, code: WalletCurrency): number {
  const d = decimals(code);
  return Math.floor(major * 10 ** d + 1e-12);
}

function fromMinor(minor: number, code: WalletCurrency): string {
  const d = decimals(code);
  if (d === 0) return String(minor);
  return (minor / 10 ** d).toFixed(Math.min(6, d));
}

export function ExchangeModal({ onClose, onDone }: Props) {
  const { t, locale } = useSettings();
  const [from, setFrom] = useState<WalletCurrency>('TON');
  const [to, setTo] = useState<WalletCurrency>('STARS');
  const [amountMajor, setAmountMajor] = useState('1');
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setQuote(null);
    setError(null);
  }, [from, to, amountMajor]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const requestQuote = async () => {
    setError(null);
    setBusy(true);
    try {
      const major = Number(amountMajor.replace(',', '.'));
      if (!Number.isFinite(major) || major <= 0) {
        throw new Error(t.wallet.exchangeInvalidAmount);
      }
      if (from === to) throw new Error(t.wallet.exchangeSamePair);
      const amount = toMinor(major, from);
      const q = await api.createExchangeQuote(from, to, amount);
      setQuote(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!quote || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.executeExchange(quote.quoteId);
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setQuote(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} sheetClassName="topup-sheet wallet-exchange-sheet">
      <div className="modal-handle" />
      {done ? (
        <div className="modal-sheet-body">
          <div className="tg-section-title">{t.wallet.exchangeDone}</div>
          <button type="button" className="tg-btn modal-action" onClick={onClose}>
            {t.common.close}
          </button>
        </div>
      ) : (
        <div className="modal-sheet-body">
          <div className="tg-section-title">{t.wallet.exchangeTitle}</div>

          <div className="wallet-ex-row">
            <label className="wallet-ex-label">{t.wallet.exchangeFrom}</label>
            <select
              className="wallet-ex-select"
              value={from}
              onChange={(e) => setFrom(e.target.value as WalletCurrency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {label(c)}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="wallet-ex-swap" onClick={swap} aria-label={t.wallet.exchangeSwap}>
            ⇅
          </button>

          <div className="wallet-ex-row">
            <label className="wallet-ex-label">{t.wallet.exchangeTo}</label>
            <select
              className="wallet-ex-select"
              value={to}
              onChange={(e) => setTo(e.target.value as WalletCurrency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {label(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="wallet-ex-row">
            <label className="wallet-ex-label">{t.wallet.exchangeAmount}</label>
            <input
              className="withdraw-input"
              inputMode="decimal"
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              placeholder="0"
            />
          </div>

          {quote && (
            <div className="wallet-ex-quote">
              <div>
                {t.wallet.exchangeYouGet}:{' '}
                <strong className="num">
                  {fromMinor(quote.toAmount, quote.to)} {label(quote.to)}
                </strong>
              </div>
              <div className="wallet-ex-quote-meta">
                {t.wallet.exchangeFee}: {fromMinor(quote.feeAmount, quote.feeCurrency)} ·{' '}
                {t.wallet.exchangeRate}: {Number(quote.effectiveRate).toLocaleString(locale, { maximumFractionDigits: 8 })}
              </div>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          {!quote ? (
            <button type="button" className="tg-btn modal-action" disabled={busy} onClick={requestQuote}>
              {busy ? t.common.loading : t.wallet.exchangeQuote}
            </button>
          ) : (
            <button type="button" className="tg-btn modal-action" disabled={busy} onClick={execute}>
              {busy ? t.common.loading : t.wallet.exchangeConfirm}
            </button>
          )}
        </div>
      )}
    </ModalShell>
  );
}
