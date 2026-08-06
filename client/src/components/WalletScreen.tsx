import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSettings } from '../settings/SettingsContext';
import { StarIcon } from './StarIcon';
import { TopUpModal } from './TopUpModal';
import { WithdrawModal } from './WithdrawModal';
import { ExchangeModal } from './ExchangeModal';
import type { WalletBalance, WalletLedgerEntry, WalletSnapshot } from '../types';

interface Props {
  onBalanceUpdate: (b: number) => void;
  openInvoice?: (url: string, cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
  isTelegram: boolean;
}

type Panel = 'balances' | 'history';

function formatAmount(b: WalletBalance, locale: string): string {
  if (b.decimals <= 0) return b.available.toLocaleString(locale);
  const major = b.available / 10 ** b.decimals;
  return major.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(6, b.decimals),
  });
}

function formatLedgerAmount(e: WalletLedgerEntry, locale: string): string {
  const decimals = e.currency === 'TON' ? 9 : e.currency === 'USDT_TON' ? 6 : 0;
  const major = decimals > 0 ? e.amount / 10 ** decimals : e.amount;
  const sign = e.direction === 'credit' ? '+' : '−';
  const body =
    decimals > 0
      ? major.toLocaleString(locale, { maximumFractionDigits: Math.min(6, decimals) })
      : major.toLocaleString(locale);
  return `${sign}${body}`;
}

function currencyTitle(code: string, t: { stars: string; ton: string; usdt: string }): string {
  if (code === 'STARS') return t.stars;
  if (code === 'TON') return t.ton;
  if (code === 'USDT_TON') return t.usdt;
  return code;
}

export function WalletScreen({ onBalanceUpdate, openInvoice, isTelegram }: Props) {
  const { t, locale } = useSettings();
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [panel, setPanel] = useState<Panel>('balances');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showExchange, setShowExchange] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [w, led] = await Promise.all([
        api.getWallet(),
        api.getWalletLedger({ limit: 30 }),
      ]);
      setSnapshot(w);
      setLedger(led.entries);
      onBalanceUpdate(w.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [onBalanceUpdate, t.common.error]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const starsBal = snapshot?.balances.find((b) => b.currency === 'STARS');
  const canWithdraw = (starsBal?.available ?? 0) > 0;

  return (
    <div className="wallet-screen">
      <div className="tg-section-title">{t.wallet.title}</div>

      <div className="wallet-actions">
        <button type="button" className="topup-inline-btn" onClick={() => setShowTopUp(true)}>
          {t.wallet.deposit}
        </button>
        <button
          type="button"
          className="withdraw-inline-btn"
          disabled={!canWithdraw}
          onClick={() => setShowWithdraw(true)}
        >
          {t.wallet.withdraw}
        </button>
        <button type="button" className="wallet-exchange-btn" onClick={() => setShowExchange(true)}>
          {t.wallet.exchange}
        </button>
        <button
          type="button"
          className={`wallet-history-btn${panel === 'history' ? ' wallet-history-btn--on' : ''}`}
          onClick={() => setPanel((p) => (p === 'history' ? 'balances' : 'history'))}
        >
          {t.wallet.history}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && !snapshot && <div className="tg-section">{t.common.loading}</div>}

      {panel === 'balances' && snapshot && (
        <>
          <div className="tg-section-title">{t.wallet.balances}</div>
          <div className="tg-section wallet-balances">
            {snapshot.balances.map((b) => (
              <div key={b.currency} className="wallet-asset">
                <div className="wallet-asset-left">
                  <div className="wallet-asset-icon" aria-hidden>
                    {b.currency === 'STARS' ? <StarIcon size={22} /> : b.displaySymbol.slice(0, 1)}
                  </div>
                  <div>
                    <div className="wallet-asset-name">
                      {currencyTitle(b.currency, {
                        stars: t.wallet.assetStars,
                        ton: t.wallet.assetTon,
                        usdt: t.wallet.assetUsdt,
                      })}
                    </div>
                    <div className="wallet-asset-code">{b.currency}</div>
                  </div>
                </div>
                <div className="wallet-asset-right">
                  <div className="wallet-asset-available num">
                    {formatAmount(b, locale)}{' '}
                    <span className="wallet-asset-unit">{b.displaySymbol}</span>
                  </div>
                  {b.locked > 0 && (
                    <div className="wallet-asset-locked">
                      {t.wallet.locked}:{' '}
                      {(b.decimals > 0 ? b.locked / 10 ** b.decimals : b.locked).toLocaleString(locale, {
                        maximumFractionDigits: 4,
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {panel === 'history' && (
        <>
          <div className="tg-section-title">{t.wallet.ledgerTitle}</div>
          <div className="tg-section">
            {ledger.length === 0 ? (
              <div className="wallet-empty">{t.wallet.ledgerEmpty}</div>
            ) : (
              <div className="wallet-ledger">
                {ledger.map((e) => (
                  <div key={e.id} className="wallet-ledger-row">
                    <div className="wallet-ledger-main">
                      <span className="wallet-ledger-type">{e.entryType}</span>
                      <span className="wallet-ledger-cur">{e.currency}</span>
                    </div>
                    <div
                      className={`wallet-ledger-amt num${
                        e.direction === 'credit' ? ' wallet-ledger-amt--in' : ' wallet-ledger-amt--out'
                      }`}
                    >
                      {formatLedgerAmount(e, locale)}
                    </div>
                    <div className="wallet-ledger-time">
                      {new Date(e.createdAt).toLocaleString(locale, {
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
        </>
      )}

      {showTopUp && (
        <TopUpModal
          onClose={() => setShowTopUp(false)}
          onBalanceUpdate={(b) => {
            onBalanceUpdate(b);
            void reload();
          }}
          isTelegram={isTelegram}
          openInvoice={openInvoice}
        />
      )}
      {showWithdraw && (
        <WithdrawModal
          balance={starsBal?.available ?? 0}
          onClose={() => setShowWithdraw(false)}
          onBalanceUpdate={(b) => {
            onBalanceUpdate(b);
            void reload();
          }}
        />
      )}
      {showExchange && (
        <ExchangeModal
          onClose={() => setShowExchange(false)}
          onDone={() => {
            void reload();
          }}
        />
      )}
    </div>
  );
}
