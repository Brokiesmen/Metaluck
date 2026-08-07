import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { ModalShell } from './ModalShell';
import { StarIcon } from './StarIcon';
import { useSettings } from '../settings/SettingsContext';
import type { ExchangeQuote, WalletBalance, WalletCurrency } from '../types';

interface Props {
  onClose: () => void;
  onDone?: () => void;
  /** Open crypto deposit (TON / USDT) without leaving the exchange hub. */
  onDepositCrypto?: () => void;
  /** Open crypto withdraw (TON back on-chain). */
  onWithdrawCrypto?: () => void;
  /** Optional initial balances; refreshed from /api/exchange/status. */
  initialBalances?: WalletBalance[];
}

const CURRENCIES: WalletCurrency[] = ['STARS', 'TON', 'USDT_TON'];

function label(code: WalletCurrency): string {
  if (code === 'STARS') return 'Stars';
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

function formatAvailable(b: WalletBalance | undefined, locale: string, code: WalletCurrency): string {
  if (!b) return `0 ${label(code)}`;
  return `${fromMinor(b.available, code)} ${label(code)}`;
}

export function ExchangeModal({
  onClose,
  onDone,
  onDepositCrypto,
  onWithdrawCrypto,
  initialBalances,
}: Props) {
  const { t, locale } = useSettings();
  const [from, setFrom] = useState<WalletCurrency>('TON');
  const [to, setTo] = useState<WalletCurrency>('STARS');
  const [amountMajor, setAmountMajor] = useState('1');
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>(initialBalances ?? []);
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [withdrawEnabled, setWithdrawEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reloadStatus = useCallback(async () => {
    try {
      const st = await api.getExchangeStatus();
      setBalances(
        st.balances.map((b) => ({
          currency: b.currency,
          available: b.available,
          locked: b.locked,
          decimals: b.decimals,
          displaySymbol: b.displaySymbol,
        })),
      );
      setDepositEnabled(st.deposit.enabled);
      setWithdrawEnabled(st.withdraw.enabled);
    } catch {
      /* keep last known */
    }
  }, []);

  useEffect(() => {
    void reloadStatus();
  }, [reloadStatus]);

  useEffect(() => {
    setQuote(null);
    setError(null);
  }, [from, to, amountMajor]);

  const fromBal = balances.find((b) => b.currency === from);
  const tonBal = balances.find((b) => b.currency === 'TON');

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const applyFlow = (id: 'ton_stars' | 'usdt_ton' | 'withdraw') => {
    setQuote(null);
    setError(null);
    if (id === 'ton_stars') {
      setFrom('TON');
      setTo('STARS');
      return;
    }
    if (id === 'usdt_ton') {
      setFrom('USDT_TON');
      setTo('TON');
      return;
    }
    onWithdrawCrypto?.();
  };

  const setMax = () => {
    if (!fromBal) return;
    setAmountMajor(fromMinor(fromBal.available, from));
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
      if (fromBal && amount > fromBal.available) {
        throw new Error(t.wallet.exchangeInsufficient);
      }
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
      await reloadStatus();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setQuote(null);
    } finally {
      setBusy(false);
    }
  };

  const needDeposit =
    Boolean(fromBal) &&
    fromBal!.available <= 0 &&
    (from === 'TON' || from === 'USDT_TON') &&
    depositEnabled;

  return (
    <ModalShell onClose={onClose} sheetClassName="topup-sheet wallet-exchange-sheet">
      <div className="modal-handle" />
      {done ? (
        <div className="modal-sheet-body">
          <div className="tg-section-title">{t.wallet.exchangeDone}</div>
          <p className="crypto-deposit-hint">{t.wallet.exchangeDoneHint}</p>
          <div className="wallet-ex-flow-list">
            {withdrawEnabled && (tonBal?.available ?? 0) > 0 && onWithdrawCrypto && (
              <button type="button" className="topup-inline-btn" onClick={() => onWithdrawCrypto()}>
                {t.wallet.exchangeWithdrawTon}
              </button>
            )}
            <button type="button" className="tg-btn modal-action" onClick={onClose}>
              {t.common.close}
            </button>
          </div>
        </div>
      ) : (
        <div className="modal-sheet-body">
          <div className="tg-section-title">{t.wallet.exchangeTitle}</div>
          <p className="crypto-deposit-hint">{t.wallet.exchangeRealHint}</p>

          <div className="wallet-ex-flow-list">
            <button type="button" className="topup-inline-btn" onClick={() => applyFlow('ton_stars')}>
              TON → <StarIcon size={14} animate={false} glow={false} />
            </button>
            <button type="button" className="topup-inline-btn" onClick={() => applyFlow('usdt_ton')}>
              USDT → TON
            </button>
            {withdrawEnabled && onWithdrawCrypto && (
              <button type="button" className="topup-inline-btn" onClick={() => applyFlow('withdraw')}>
                {t.wallet.exchangeWithdrawTon}
              </button>
            )}
          </div>

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
            <div className="wallet-ex-avail">
              {t.wallet.exchangeAvailable}:{' '}
              <span className="num">{formatAvailable(fromBal, locale, from)}</span>
              {(fromBal?.available ?? 0) > 0 && (
                <button type="button" className="wallet-ex-max" onClick={setMax}>
                  MAX
                </button>
              )}
            </div>
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

          {needDeposit && onDepositCrypto && (
            <button type="button" className="wallet-exchange-btn" onClick={() => onDepositCrypto()}>
              {t.wallet.exchangeDepositFirst}
            </button>
          )}

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
                {t.wallet.exchangeRate}:{' '}
                {Number(quote.effectiveRate).toLocaleString(locale, { maximumFractionDigits: 8 })}
              </div>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          {!quote ? (
            <button type="button" className="tg-btn modal-action" disabled={busy} onClick={() => void requestQuote()}>
              {busy ? t.common.loading : t.wallet.exchangeQuote}
            </button>
          ) : (
            <button type="button" className="tg-btn modal-action" disabled={busy} onClick={() => void execute()}>
              {busy ? t.common.loading : t.wallet.exchangeConfirm}
            </button>
          )}
        </div>
      )}
    </ModalShell>
  );
}
