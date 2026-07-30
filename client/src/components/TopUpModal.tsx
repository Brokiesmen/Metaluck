import { useEffect, useState } from 'react';
import { api } from '../api';
import { StarIcon } from './StarIcon';
import { useSettings } from '../settings/SettingsContext';
import type { TopupPackage } from '../types';

interface Props {
  onClose: () => void;
  onBalanceUpdate: (newBalance: number) => void;
  isTelegram: boolean;
  openInvoice?: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function TopUpModal({ onClose, onBalanceUpdate, isTelegram, openInvoice }: Props) {
  const { t, locale } = useSettings();
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [done, setDone] = useState<{ amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTopupPackages()
      .then(setPackages)
      .catch((err) => setError(err instanceof Error ? err.message : t.topup.loadFail))
      .finally(() => setLoadingPackages(false));
  }, [t.topup.loadFail]);

  const waitForPayment = async (payload: string) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const status = await api.getTopupStatus(payload);
      if (status.status === 'paid' && status.newBalance !== null) {
        onBalanceUpdate(status.newBalance);
        setDone({ amount: status.balanceAmount });
        return true;
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(t.topup.unpaid);
      }
      await sleep(1200);
    }
    return false;
  };

  const handleBuy = async (pkg: TopupPackage) => {
    if (loading) return;
    setError(null);

    if (!isTelegram || !openInvoice) {
      setError(t.topup.onlyInTelegram);
      return;
    }

    setLoading(true);
    try {
      const { invoiceLink, payload } = await api.createTopupInvoice(pkg.id);

      await new Promise<void>((resolve, reject) => {
        openInvoice(invoiceLink, async (status) => {
          try {
            if (status === 'cancelled' || status === 'failed') {
              reject(new Error(t.topup.cancelled));
              return;
            }

            const paid = await waitForPayment(payload);
            if (!paid) {
              reject(new Error(t.topup.pendingConfirm));
              return;
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.topup.payError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet topup-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        {done ? (
          <div className="topup-success">
            <div className="topup-success-icon">✓</div>
            <div className="topup-success-title">{t.topup.successTitle}</div>
            <div className="topup-success-amount num">
              +{done.amount.toLocaleString(locale)} <StarIcon size={22} />
            </div>
            <button className="tg-btn" onClick={onClose}>{t.topup.successOk}</button>
          </div>
        ) : (
          <div>
            <div className="topup-header">
              <div className="topup-title">{t.topup.title}</div>
              <div className="topup-subtitle">{t.topup.viaTelegram}</div>
            </div>

            {error && <div className="error-banner" style={{ margin: '0 0 12px' }}>{error}</div>}
            {loadingPackages && <div className="loading">{t.topup.loadingPackages}</div>}

            {!loadingPackages && (
              <div className="topup-grid">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    className={`topup-pkg${pkg.popular ? ' topup-pkg--popular' : ''}`}
                    onClick={() => handleBuy(pkg)}
                    disabled={loading}
                  >
                    {pkg.popular && <div className="topup-pkg-badge">{t.topup.hit}</div>}
                    <div className="topup-pkg-amount num">
                      {pkg.balanceAmount.toLocaleString(locale)} <StarIcon size={18} animate={false} />
                    </div>
                    <div className="topup-pkg-label">{pkg.label}</div>
                    <div className="topup-pkg-bonus num">{pkg.xtrAmount} XTR</div>
                  </button>
                ))}
              </div>
            )}

            <button className="topup-cancel" onClick={onClose}>{t.topup.cancel}</button>
          </div>
        )}
      </div>
    </div>
  );
}
