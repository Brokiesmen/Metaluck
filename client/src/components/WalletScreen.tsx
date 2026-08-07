import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSettings } from '../settings/SettingsContext';
import { StarIcon } from './StarIcon';
import { TopUpModal } from './TopUpModal';
import { WithdrawModal } from './WithdrawModal';
import { ExchangeModal } from './ExchangeModal';
import { CryptoDepositModal } from './CryptoDepositModal';
import { CryptoWithdrawModal } from './CryptoWithdrawModal';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import { WalletLinkPanel } from './WalletLinkPanel';
import type { WalletBalance, WalletLedgerEntry, WalletSnapshot } from '../types';

interface Props {
  onBalanceUpdate: (b: number) => void;
  openInvoice?: (url: string, cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
  isTelegram: boolean;
}

type Panel = 'balances' | 'history';
type CryptoCurrency = 'TON' | 'USDT_TON';

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
  const [cryptoDeposit, setCryptoDeposit] = useState<CryptoCurrency | null>(null);
  const [cryptoWithdraw, setCryptoWithdraw] = useState<CryptoCurrency | null>(null);

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
  const tonBal = snapshot?.balances.find((b) => b.currency === 'TON');
  const usdtBal = snapshot?.balances.find((b) => b.currency === 'USDT_TON');
  const canWithdrawStars = (starsBal?.available ?? 0) > 0;

  const cryptoCards: Array<{
    code: CryptoCurrency;
    title: string;
    bal: WalletBalance | undefined;
    symbol: string;
  }> = [
    { code: 'TON', title: 'TON', bal: tonBal, symbol: 'TON' },
    { code: 'USDT_TON', title: 'USDT', bal: usdtBal, symbol: 'USDT' },
  ];

  return (
    <div className="wallet-screen">
      <div className="tg-section-title">{t.wallet.title}</div>

      <div className="wallet-actions">
        <button type="button" className="wallet-btn wallet-btn--deposit" onClick={() => setShowTopUp(true)}>
          <span className="wallet-btn-ico" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="wallet-btn-label">{t.wallet.deposit}</span>
        </button>
        <button
          type="button"
          className="wallet-btn wallet-btn--withdraw"
          disabled={!canWithdrawStars}
          onClick={() => setShowWithdraw(true)}
        >
          <span className="wallet-btn-ico" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </span>
          <span className="wallet-btn-label">{t.wallet.withdraw}</span>
        </button>
        <button type="button" className="wallet-btn wallet-btn--exchange" onClick={() => setShowExchange(true)}>
          <span className="wallet-btn-ico" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h11l-3-3M17 17H6l3 3" />
            </svg>
          </span>
          <span className="wallet-btn-label">{t.wallet.exchange}</span>
        </button>
        <button
          type="button"
          className={`wallet-btn wallet-btn--history${panel === 'history' ? ' wallet-btn--on' : ''}`}
          onClick={() => setPanel((p) => (p === 'history' ? 'balances' : 'history'))}
        >
          <span className="wallet-btn-ico" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <span className="wallet-btn-label">{t.wallet.history}</span>
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && !snapshot && <div className="tg-section">{t.common.loading}</div>}

      {panel === 'balances' && snapshot && (
        <>
          <div className="tg-section wallet-balances">
            {starsBal && (
              <div className="wallet-asset">
                <div className="wallet-asset-left">
                  <div className="wallet-asset-icon" aria-hidden>
                    <StarIcon size={22} />
                  </div>
                  <div className="wallet-asset-meta">
                    <div className="wallet-asset-name">{t.wallet.assetStars}</div>
                    <div className="wallet-asset-code">STARS</div>
                  </div>
                </div>
                <div className="wallet-asset-right">
                  <div className="wallet-asset-available num">
                    {formatAmount(starsBal, locale)}
                  </div>
                  <div className="wallet-asset-code wallet-asset-code--right">
                    {starsBal.displaySymbol || '★'}
                  </div>
                  {starsBal.locked > 0 && (
                    <div className="wallet-asset-locked">
                      {t.wallet.locked}: {starsBal.locked.toLocaleString(locale)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {cryptoCards.map((c) => {
              const available = c.bal?.available ?? 0;
              const canWd = available > 0;
              return (
                <div key={c.code} className="wallet-asset wallet-asset--crypto">
                  <div className="wallet-asset-main">
                    <div className="wallet-asset-left">
                      <div className="wallet-asset-icon wallet-asset-icon--crypto" aria-hidden>
                        <CryptoAssetIcon currency={c.code} size={22} />
                      </div>
                      <div className="wallet-asset-meta">
                        <div className="wallet-asset-name">{c.title}</div>
                        <div className="wallet-asset-code">{c.symbol}</div>
                      </div>
                    </div>
                    <div className="wallet-asset-right">
                      <div className="wallet-asset-available num">
                        {c.bal ? formatAmount(c.bal, locale) : '0'}
                      </div>
                      <div className="wallet-asset-code wallet-asset-code--right">{c.symbol}</div>
                      {(c.bal?.locked ?? 0) > 0 && (
                        <div className="wallet-asset-locked">
                          {t.wallet.locked}:{' '}
                          {((c.bal!.locked) / 10 ** c.bal!.decimals).toLocaleString(locale, {
                            maximumFractionDigits: 4,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="wallet-crypto-card-actions">
                    <button
                      type="button"
                      className="wallet-btn wallet-btn--deposit wallet-btn--sm"
                      onClick={() => setCryptoDeposit(c.code)}
                    >
                      <span className="wallet-btn-ico" aria-hidden>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                      <span className="wallet-btn-label">{t.wallet.cryptoTopUp}</span>
                    </button>
                    <button
                      type="button"
                      className="wallet-btn wallet-btn--withdraw wallet-btn--sm"
                      disabled={!canWd}
                      onClick={() => setCryptoWithdraw(c.code)}
                    >
                      <span className="wallet-btn-ico" aria-hidden>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 19V5M5 12l7-7 7 7" />
                        </svg>
                      </span>
                      <span className="wallet-btn-label">{t.wallet.cryptoCashOut}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tg-section wallet-link-section">
            <WalletLinkPanel />
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
      {cryptoDeposit && (
        <CryptoDepositModal
          initialCurrency={cryptoDeposit}
          onClose={() => setCryptoDeposit(null)}
          onCredited={() => {
            void reload();
          }}
        />
      )}
      {cryptoWithdraw && snapshot && (
        <CryptoWithdrawModal
          initialCurrency={cryptoWithdraw}
          balances={snapshot.balances}
          onClose={() => setCryptoWithdraw(null)}
          onDone={() => {
            void reload();
          }}
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
          initialBalances={snapshot?.balances}
          onDone={() => {
            void reload();
          }}
          onDepositCrypto={() => {
            setShowExchange(false);
            setCryptoDeposit('TON');
          }}
          onWithdrawCrypto={() => {
            setShowExchange(false);
            setCryptoWithdraw('TON');
          }}
        />
      )}
    </div>
  );
}
