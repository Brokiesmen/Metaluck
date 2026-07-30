import { useEffect, useState } from 'react';
import { api } from '../api';
import { StarIcon } from './StarIcon';

interface Props {
  balance: number;
  onClose: () => void;
  onBalanceUpdate: (newBalance: number) => void;
}

const FALLBACK_PRESETS = [50, 100, 250, 500, 1000, 5000];

export function WithdrawModal({ balance, onClose, onBalanceUpdate }: Props) {
  const [presets, setPresets] = useState<number[]>(FALLBACK_PRESETS);
  const [minAmount, setMinAmount] = useState(50);
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
      setError(e instanceof Error ? e.message : 'Ошибка вывода');
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
            <div className="topup-success-title">Заявка принята</div>
            <div className="topup-success-amount num">
              −{done.amount.toLocaleString('ru-RU')} <StarIcon size={22} />
            </div>
            <div className="topup-subtitle" style={{ marginBottom: 16 }}>
              Заявка #{done.orderId}. Звёзды будут отправлены вручную в Telegram.
            </div>
            <button className="tg-btn" onClick={onClose}>Понятно</button>
          </div>
        ) : (
          <div>
            <div className="topup-header">
              <div className="topup-title">Вывести звёзды</div>
              <div className="topup-subtitle">
                Доступно: {balance.toLocaleString('ru-RU')} ★ · мин. {minAmount} ★
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
                    {p.toLocaleString('ru-RU')} <StarIcon size={16} />
                  </div>
                </button>
              ))}
            </div>

            <label className="withdraw-custom">
              <span>Своя сумма</span>
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
              className="tg-btn withdraw-submit"
              disabled={!canSubmit}
              onClick={submit}
            >
              {loading ? 'Отправка…' : `Вывести ${Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount.toLocaleString('ru-RU') : '—'} ★`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
