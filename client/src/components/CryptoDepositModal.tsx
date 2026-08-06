import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSettings } from '../settings/SettingsContext';
import { ModalShell } from './ModalShell';
import { TonAddressQr } from './TonAddressQr';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import type { CryptoChainDeposit, CryptoDepositAddress } from '../types';

interface Props {
  onClose: () => void;
  onCredited?: () => void;
  /** Skip currency pick when opened from Crypto section. */
  initialCurrency?: 'TON' | 'USDT_TON';
}

type Step = 'pick' | 'address';
type Currency = 'TON' | 'USDT_TON';

function formatCryptoAmount(d: CryptoChainDeposit, locale: string): string {
  const decimals = d.currency === 'TON' ? 9 : 6;
  const major = d.amount / 10 ** decimals;
  return `${major.toLocaleString(locale, { maximumFractionDigits: Math.min(6, decimals) })} ${
    d.currency === 'TON' ? 'TON' : 'USDT'
  }`;
}

function statusLabel(
  status: string,
  labels: { pending: string; confirmed: string; failed: string },
): string {
  if (status === 'confirmed' || status === 'credited') return labels.confirmed;
  if (status === 'failed' || status === 'ignored') return labels.failed;
  return labels.pending;
}

export function CryptoDepositModal({ onClose, onCredited, initialCurrency }: Props) {
  const { t, locale } = useSettings();
  const [step, setStep] = useState<Step>(initialCurrency ? 'address' : 'pick');
  const [currency, setCurrency] = useState<Currency | null>(initialCurrency ?? null);
  const [deposit, setDeposit] = useState<CryptoDepositAddress | null>(null);
  const [deposits, setDeposits] = useState<CryptoChainDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [autoStarted, setAutoStarted] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const status = await api.getCryptoStatus();
      setEnabled(status.enabled);
      if (!status.enabled) {
        setDeposits([]);
        return;
      }
      const list = await api.listCryptoDeposits();
      setDeposits(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.wallet.cryptoDisabled);
    } finally {
      setLoading(false);
    }
  }, [t.wallet.cryptoDisabled]);

  const startDeposit = useCallback(
    async (code: Currency) => {
      setStarting(true);
      setError(null);
      try {
        const { deposit: addr } = await api.startCryptoDeposit(code);
        setCurrency(code);
        setDeposit(addr);
        setStep('address');
      } catch (err) {
        setError(err instanceof Error ? err.message : t.common.error);
        if (initialCurrency) setStep('pick');
      } finally {
        setStarting(false);
      }
    },
    [initialCurrency, t.common.error],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!initialCurrency || !enabled || loading || autoStarted || deposit || starting) return;
    setAutoStarted(true);
    void startDeposit(initialCurrency);
  }, [initialCurrency, enabled, loading, autoStarted, deposit, starting, startDeposit]);

  const copy = async () => {
    if (!deposit?.address) return;
    try {
      await navigator.clipboard.writeText(deposit.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await api.syncCryptoDeposits();
      setDeposits(res.deposits);
      if (res.deposits.some((d) => d.status === 'confirmed' || d.status === 'credited')) {
        onCredited?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSyncing(false);
    }
  };

  const statusLabels = {
    pending: t.wallet.cryptoStatusPending,
    confirmed: t.wallet.cryptoStatusConfirmed,
    failed: t.wallet.cryptoStatusFailed,
  };

  const title =
    currency === 'USDT_TON'
      ? `${t.wallet.cryptoDeposit} · USDT`
      : currency === 'TON'
        ? `${t.wallet.cryptoDeposit} · TON`
        : t.wallet.cryptoDeposit;

  return (
    <ModalShell onClose={onClose} sheetClassName="crypto-deposit-sheet">
      <div className="modal-sheet-body crypto-deposit">
        <div className="tg-section-title">{title}</div>
        {(loading || starting) && <div className="login-status">{t.common.loading}</div>}
        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !enabled && <p className="crypto-deposit-hint">{t.wallet.cryptoDisabled}</p>}

        {!loading && enabled && step === 'pick' && !initialCurrency && (
          <>
            <p className="crypto-deposit-hint">{t.wallet.cryptoPickCurrency}</p>
            <div className="crypto-deposit-currency-list">
              <button
                type="button"
                className="wallet-exchange-btn crypto-deposit-currency-btn"
                disabled={starting}
                onClick={() => void startDeposit('TON')}
              >
                <CryptoAssetIcon currency="TON" size={28} />
                <span>TON</span>
              </button>
              <button
                type="button"
                className="wallet-exchange-btn crypto-deposit-currency-btn"
                disabled={starting}
                onClick={() => void startDeposit('USDT_TON')}
              >
                <CryptoAssetIcon currency="USDT_TON" size={28} />
                <span>USDT (TON)</span>
              </button>
            </div>
          </>
        )}

        {deposit && step === 'address' && (
          <>
            {!initialCurrency && (
              <button
                type="button"
                className="topup-inline-btn"
                onClick={() => {
                  setStep('pick');
                  setDeposit(null);
                  setCurrency(null);
                }}
              >
                {t.wallet.cryptoChangeCurrency}
              </button>
            )}

            <div className="crypto-deposit-meta">
              <div className="crypto-deposit-meta-row">
                <span>{t.wallet.cryptoNetwork}</span>
                <strong>TON</strong>
              </div>
              <div className="crypto-deposit-meta-row">
                <span>{t.wallet.cryptoSelected}</span>
                <strong className="crypto-deposit-selected">
                  <CryptoAssetIcon currency={currency === 'USDT_TON' ? 'USDT_TON' : 'TON'} size={18} />
                  {currency === 'USDT_TON' ? 'USDT (TON)' : 'TON'}
                </strong>
              </div>
              <div className="crypto-deposit-meta-row">
                <span>{t.wallet.cryptoMin}</span>
                <strong className="num">
                  {(deposit.minAmount / 10 ** deposit.decimals).toLocaleString(locale, {
                    maximumFractionDigits: 6,
                  })}{' '}
                  {deposit.symbol}
                </strong>
              </div>
            </div>

            <TonAddressQr address={deposit.address} />

            <div className="crypto-deposit-label">{t.wallet.cryptoAddress}</div>
            <div className="crypto-deposit-address num">{deposit.address}</div>

            <div className="crypto-deposit-actions">
              <button type="button" className="topup-inline-btn" onClick={() => void copy()}>
                {copied ? t.wallet.cryptoCopied : t.wallet.cryptoCopy}
              </button>
              <button
                type="button"
                className="wallet-exchange-btn"
                disabled={syncing}
                onClick={() => void sync()}
              >
                {syncing ? t.common.loading : t.wallet.cryptoSync}
              </button>
            </div>

            <p className="crypto-deposit-hint">
              {deposit.instructions || t.wallet.cryptoListening}
            </p>
          </>
        )}

        <div className="tg-section-title" style={{ marginTop: 16 }}>
          {t.wallet.cryptoDeposits}
        </div>
        {deposits.length === 0 ? (
          <div className="wallet-empty">{t.wallet.cryptoEmpty}</div>
        ) : (
          <div className="wallet-ledger">
            {deposits.map((d) => (
              <div key={d.id} className="wallet-ledger-row">
                <div className="wallet-ledger-main">
                  <span
                    className={`wallet-ledger-type crypto-status crypto-status--${
                      d.status === 'confirmed' || d.status === 'credited'
                        ? 'confirmed'
                        : d.status === 'failed' || d.status === 'ignored'
                          ? 'failed'
                          : 'pending'
                    }`}
                  >
                    {statusLabel(d.status, statusLabels)}
                  </span>
                  <span className="wallet-ledger-cur">{d.currency}</span>
                </div>
                <div className="wallet-ledger-amt num wallet-ledger-amt--in">
                  +{formatCryptoAmount(d, locale)}
                </div>
                <div className="wallet-ledger-time">
                  {d.confirmations}/{d.requiredConfirmations} ·{' '}
                  {new Date(d.detectedAt).toLocaleString(locale, {
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
