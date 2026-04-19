import { useEffect, useState } from 'react';
import { api } from '../api';
import { StarIcon } from './StarIcon';
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
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [done, setDone] = useState<{ amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTopupPackages()
      .then(setPackages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить пакеты'))
      .finally(() => setLoadingPackages(false));
  }, []);

  const waitForPayment = async (payload: string) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const status = await api.getTopupStatus(payload);
      if (status.status === 'paid' && status.newBalance !== null) {
        onBalanceUpdate(status.newBalance);
        setDone({ amount: status.balanceAmount });
        return true;
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error('Платеж не был завершен');
      }
      await sleep(1200);
    }
    return false;
  };

  const handleBuy = async (pkg: TopupPackage) => {
    if (loading) return;
    setError(null);

    if (!isTelegram || !openInvoice) {
      setError('Оплата Telegram Stars доступна только внутри Telegram Mini App');
      return;
    }

    setLoading(true);
    try {
      const { invoiceLink, payload } = await api.createTopupInvoice(pkg.id);

      await new Promise<void>((resolve, reject) => {
        openInvoice(invoiceLink, async (status) => {
          try {
            if (status === 'cancelled' || status === 'failed') {
              reject(new Error('Платеж отменен'));
              return;
            }

            const paid = await waitForPayment(payload);
            if (!paid) {
              reject(new Error('Платеж создан, но подтверждение еще не пришло. Проверьте баланс через пару секунд.'));
              return;
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка оплаты');
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
            <div className="topup-success-icon">⭐</div>
            <div className="topup-success-title">Баланс пополнен</div>
            <div className="topup-success-amount num">
              +{done.amount.toLocaleString('ru-RU')} <StarIcon size={22} />
            </div>
            <button className="tg-btn" onClick={onClose}>Отлично</button>
          </div>
        ) : (
          <div>
            <div className="topup-header">
              <div className="topup-title">Пополнить звёзды</div>
              <div className="topup-subtitle">Оплата пройдёт через Telegram Stars</div>
            </div>

            {error && <div className="error-banner" style={{ margin: '0 0 12px' }}>{error}</div>}
            {loadingPackages && <div className="loading">Загрузка пакетов...</div>}

            {!loadingPackages && (
              <div className="topup-grid">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    className={`topup-pkg${pkg.popular ? ' topup-pkg--popular' : ''}`}
                    onClick={() => handleBuy(pkg)}
                    disabled={loading}
                  >
                    {pkg.popular && <div className="topup-pkg-badge">ХИТ</div>}
                    <div className="topup-pkg-icon"><StarIcon size={28} /></div>
                    <div className="topup-pkg-amount num">{pkg.balanceAmount.toLocaleString('ru-RU')}</div>
                    <div className="topup-pkg-label">{pkg.label}</div>
                    <div className="topup-pkg-bonus num">{pkg.xtrAmount} XTR</div>
                  </button>
                ))}
              </div>
            )}

            <button className="topup-cancel" onClick={onClose}>Отмена</button>
          </div>
        )}
      </div>
    </div>
  );
}
