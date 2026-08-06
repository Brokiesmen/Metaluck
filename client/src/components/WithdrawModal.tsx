import { useEffect, useState } from 'react';
import { api } from '../api';
import { StarIcon } from './StarIcon';
import { ModalShell } from './ModalShell';
import { useSettings } from '../settings/SettingsContext';
import { tf } from '../i18n/tf';

interface Props {
  balance: number;
  onClose: () => void;
  onBalanceUpdate: (newBalance: number) => void;
}

const FALLBACK_PRESETS = [100, 250, 500, 1000, 5000];

export function WithdrawModal({ balance, onClose, onBalanceUpdate }: Props) {
  const { t, locale } = useSettings();
  const [presets, setPresets] = useState<number[]>(FALLBACK_PRESETS);
  const [minAmount, setMinAmount] = useState(100);
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; orderId: number } | null>(null);

  useEffect(() => {
    api.getWithdrawInfo()
      .then((info) => {
        setMinAmount(info.minAmount);
        setPresets(info.presets);
        onBalanceUpdate(info.balance);
      })
      .catch(() => {});
  }, [onBalanceUpdate]);

  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  const canSubmit =
    !loading &&
    Number.isFinite(numericAmount) &&
    numericAmount >= minAmount &&
    numericAmount <= balance;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.createWithdraw(numericAmount);
      onBalanceUpdate(res.newBalance);
      setDone({ amount: res.amount, orderId: res.orderId });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.withdraw.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose} sheetClassName="topup-sheet">
      <div className="modal-handle" />

      {done ? (
        <div className="topup-success">
          <div className="topup-success-icon">✓</div>
          <div className="topup-success-title">{t.withdraw.successTitle}</div>
          <div className="topup-success-amount num">
            −{done.amount.toLocaleString(locale)} <StarIcon size={22} />
          </div>
          <div className="topup-subtitle" style={{ marginBottom: 16 }}>
            {tf(t.withdraw.successBody, { id: done.orderId })}
          </div>
          <button type="button" className="tg-btn modal-action" onClick={onClose}>{t.withdraw.ok}</button>
        </div>
      ) : (
        <div className="modal-sheet-body">
          <div className="topup-header">
            <div className="topup-title">{t.withdraw.title}</div>
            <div className="topup-subtitle">
              {tf(t.withdraw.available, {
                balance: balance.toLocaleString(locale),
                min: minAmount.toLocaleString(locale),
              })}
            </div>
          </div>

          {error && <div className="error-banner" style={{ margin: '0 0 12px' }}>{error}</div>}

          <div className="topup-grid">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`topup-pkg${amount === p ? ' topup-pkg--popular' : ''}`}
                disabled={loading || p > balance}
                onClick={() => setAmount(p)}
              >
                <div className="topup-pkg-amount num">
                  {p.toLocaleString(locale)} <StarIcon size={16} />
                </div>
              </button>
            ))}
          </div>

          <label className="withdraw-custom">
            <span>{t.withdraw.customAmount}</span>
            <input
              className="withdraw-input num"
              type="number"
              min={minAmount}
              max={balance}
              inputMode="numeric"
              placeholder={`${minAmount}…`}
              value={amount}
              disabled={loading}
              onChange={(e) => {
                const v = e.target.value;
                setAmount(v === '' ? '' : Math.max(0, Math.floor(Number(v)) || 0));
              }}
            />
          </label>

          <button
            type="button"
            className="tg-btn withdraw-submit modal-action"
            disabled={!canSubmit}
            onClick={submit}
          >
            {loading
              ? t.withdraw.sending
              : tf(t.withdraw.withdrawBtn, {
                  n:
                    Number.isFinite(numericAmount) && numericAmount > 0
                      ? numericAmount.toLocaleString(locale)
                      : '—',
                })}
          </button>
        </div>
      )}
    </ModalShell>
  );
}
