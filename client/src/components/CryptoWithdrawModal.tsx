import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSettings } from '../settings/SettingsContext';
import { ModalShell } from './ModalShell';
import type { CryptoWithdrawal, CryptoWithdrawQuote, WalletBalance } from '../types';

interface Props {
  balances: WalletBalance[];
  onClose: () => void;
  onDone?: () => void;
  /** Skip currency pick when opened from Crypto section. */
  initialCurrency?: 'TON' | 'USDT_TON';
}

type Step = 'pick' | 'form' | 'confirm';
type Currency = 'TON' | 'USDT_TON';

function majorToMinor(major: number, decimals: number): number {
  return Math.trunc(Math.round(major * 10 ** decimals));
}

function formatMinor(amount: number, decimals: number, locale: string, symbol: string): string {
  const major = amount / 10 ** decimals;
  return `${major.toLocaleString(locale, {
    maximumFractionDigits: Math.min(6, decimals),
  })} ${symbol}`;
}

function statusLabel(
  status: string,
  labels: Record<'pending' | 'processing' | 'completed' | 'failed', string>,
): string {
  if (status === 'processing') return labels.processing;
  if (status === 'completed') return labels.completed;
  if (status === 'failed') return labels.failed;
  return labels.pending;
}

export function CryptoWithdrawModal({ balances, onClose, onDone, initialCurrency }: Props) {
  const { t, locale } = useSettings();
  const [step, setStep] = useState<Step>(initialCurrency ? 'form' : 'pick');
  const [currency, setCurrency] = useState<Currency | null>(initialCurrency ?? null);
  const [toAddress, setToAddress] = useState('');
  const [amountMajor, setAmountMajor] = useState('');
  const [quote, setQuote] = useState<CryptoWithdrawQuote | null>(null);
  const [list, setList] = useState<CryptoWithdrawal[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decimals = currency === 'USDT_TON' ? 6 : 9;
  const symbol = currency === 'USDT_TON' ? 'USDT' : 'TON';
  const bal = balances.find((b) => b.currency === currency);

  const loadList = useCallback(async () => {
    try {
      const st = await api.getCryptoWithdrawStatus();
      setEnabled(st.enabled);
      if (!st.enabled) {
        setList([]);
        return;
      }
      const rows = await api.listCryptoWithdrawals();
      setList(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t.common.error]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const pick = (code: Currency) => {
    setCurrency(code);
    setQuote(null);
    setError(null);
    setStep('form');
  };

  const requestQuote = async () => {
    if (!currency) return;
    const major = Number(amountMajor.replace(',', '.'));
    if (!Number.isFinite(major) || major <= 0) {
      setError(t.wallet.cryptoWdInvalidAmount);
      return;
    }
    if (!toAddress.trim()) {
      setError(t.wallet.cryptoWdInvalidAddress);
      return;
    }
    setQuoting(true);
    setError(null);
    try {
      const q = await api.quoteCryptoWithdraw({
        currency,
        toAddress: toAddress.trim(),
        amount: majorToMinor(major, decimals),
      });
      setQuote(q);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setQuoting(false);
    }
  };

  const submit = async () => {
    if (!currency || !quote) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createCryptoWithdraw({
        currency,
        toAddress: quote.toAddress,
        amount: quote.amount,
        confirm: true,
      });
      onDone?.();
      setStep(initialCurrency ? 'form' : 'pick');
      if (!initialCurrency) setCurrency(null);
      setQuote(null);
      setToAddress('');
      setAmountMajor('');
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabels = {
    pending: t.wallet.cryptoWdStatusPending,
    processing: t.wallet.cryptoWdStatusProcessing,
    completed: t.wallet.cryptoWdStatusCompleted,
    failed: t.wallet.cryptoWdStatusFailed,
  };

  const title =
    currency === 'USDT_TON'
      ? `${t.wallet.cryptoWithdraw} · USDT`
      : currency === 'TON'
        ? `${t.wallet.cryptoWithdraw} · TON`
        : t.wallet.cryptoWithdraw;

  return (
    <ModalShell onClose={onClose} sheetClassName="crypto-deposit-sheet">
      <div className="modal-sheet-body crypto-deposit">
        <div className="tg-section-title">{title}</div>
        {loading && <div className="login-status">{t.common.loading}</div>}
        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !enabled && <p className="crypto-deposit-hint">{t.wallet.cryptoWdDisabled}</p>}

        {!loading && enabled && step === 'pick' && (
          <>
            <p className="crypto-deposit-hint">{t.wallet.cryptoWdPickCurrency}</p>
            <div className="crypto-deposit-currency-list">
              <button
                type="button"
                className="wallet-exchange-btn crypto-deposit-currency-btn"
                onClick={() => pick('TON')}
              >
                TON
              </button>
              <button
                type="button"
                className="wallet-exchange-btn crypto-deposit-currency-btn"
                onClick={() => pick('USDT_TON')}
              >
                USDT (TON)
              </button>
            </div>
          </>
        )}

        {enabled && step === 'form' && currency && (
          <>
            {!initialCurrency && (
              <button type="button" className="topup-inline-btn" onClick={() => setStep('pick')}>
                {t.wallet.cryptoChangeCurrency}
              </button>
            )}
            <div className="crypto-deposit-meta">
              <div className="crypto-deposit-meta-row">
                <span>{t.wallet.cryptoNetwork}</span>
                <strong>TON</strong>
              </div>
              <div className="crypto-deposit-meta-row">
                <span>{t.wallet.cryptoWdAvailable}</span>
                <strong className="num">
                  {bal
                    ? formatMinor(bal.available, bal.decimals, locale, symbol)
                    : `0 ${symbol}`}
                </strong>
              </div>
            </div>
            <label className="crypto-deposit-label" htmlFor="cwd-addr">
              {t.wallet.cryptoWdAddress}
            </label>
            <input
              id="cwd-addr"
              className="crypto-wd-input"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="UQ..."
              autoComplete="off"
              spellCheck={false}
            />
            <label className="crypto-deposit-label" htmlFor="cwd-amt">
              {t.wallet.cryptoWdAmount}
            </label>
            <input
              id="cwd-amt"
              className="crypto-wd-input"
              inputMode="decimal"
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              placeholder="0.0"
            />
            <button
              type="button"
              className="wallet-exchange-btn"
              disabled={quoting}
              onClick={() => void requestQuote()}
            >
              {quoting ? t.common.loading : t.wallet.cryptoWdContinue}
            </button>
          </>
        )}

        {enabled && step === 'confirm' && quote && (
          <>
            <button type="button" className="topup-inline-btn" onClick={() => setStep('form')}>
              {t.wallet.cryptoWdBack}
            </button>
            <p className="crypto-deposit-hint">{t.wallet.cryptoWdConfirmHint}</p>
            <div className="crypto-wd-summary">
              <div className="crypto-wd-summary-row">
                <span>{t.wallet.cryptoWdAddress}</span>
                <strong className="num crypto-wd-summary-addr">{quote.toAddress}</strong>
              </div>
              <div className="crypto-wd-summary-row">
                <span>{t.wallet.cryptoWdAmount}</span>
                <strong className="num">
                  {formatMinor(quote.amount, quote.decimals, locale, quote.symbol)}
                </strong>
              </div>
              <div className="crypto-wd-summary-row">
                <span>{t.wallet.cryptoWdFee}</span>
                <strong className="num">
                  {formatMinor(quote.networkFee, quote.decimals, locale, quote.symbol)}
                </strong>
              </div>
              <div className="crypto-wd-summary-row crypto-wd-summary-row--total">
                <span>{t.wallet.cryptoWdTotal}</span>
                <strong className="num">
                  {formatMinor(quote.netAmount, quote.decimals, locale, quote.symbol)}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="wallet-exchange-btn"
              disabled={submitting || !quote.canAfford}
              onClick={() => void submit()}
            >
              {submitting ? t.common.loading : t.wallet.cryptoWdConfirm}
            </button>
          </>
        )}

        <div className="tg-section-title" style={{ marginTop: 16 }}>
          {t.wallet.cryptoWdHistory}
        </div>
        {list.length === 0 ? (
          <div className="wallet-empty">{t.wallet.cryptoWdEmpty}</div>
        ) : (
          <div className="wallet-ledger">
            {list.map((w) => (
              <div key={w.id} className="wallet-ledger-row">
                <div className="wallet-ledger-main">
                  <span
                    className={`wallet-ledger-type crypto-status crypto-status--${
                      w.status === 'completed'
                        ? 'confirmed'
                        : w.status === 'failed'
                          ? 'failed'
                          : 'pending'
                    }`}
                  >
                    {statusLabel(w.status, statusLabels)}
                  </span>
                  <span className="wallet-ledger-cur">{w.currency}</span>
                </div>
                <div className="wallet-ledger-amt num wallet-ledger-amt--out">
                  −
                  {formatMinor(
                    w.amount,
                    w.currency === 'TON' ? 9 : 6,
                    locale,
                    w.currency === 'TON' ? 'TON' : 'USDT',
                  )}
                </div>
                <div className="wallet-ledger-time">
                  {w.txHash ? `${w.txHash.slice(0, 10)}… · ` : ''}
                  {new Date(w.createdAt).toLocaleString(locale, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
