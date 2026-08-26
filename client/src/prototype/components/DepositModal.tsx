import { useState } from 'react';
import type { Wallets } from '../ProtoApp';

interface Props {
  onClose: () => void;
  onDeposit: (currency: keyof Wallets, amount: number) => void;
}

type Currency = keyof Wallets;
type Method = 'card' | 'ton' | 'crypto';

const currencies: { id: Currency; icon: string; name: string; symbol: string }[] = [
  { id: 'stars', icon: '★', name: 'Stars', symbol: '★' },
  { id: 'ton', icon: '💎', name: 'TON', symbol: 'TON' },
  { id: 'usdt', icon: '$', name: 'USDT', symbol: '$' },
];

const methods: { id: Method; icon: string; name: string }[] = [
  { id: 'card', icon: '💳', name: 'Карта' },
  { id: 'ton', icon: '💎', name: 'TON Wallet' },
  { id: 'crypto', icon: '₿', name: 'Крипто' },
];

const presets = [100, 500, 1000, 5000];

export function DepositModal({ onClose, onDeposit }: Props) {
  const [currency, setCurrency] = useState<Currency>('stars');
  const [method, setMethod] = useState<Method>('card');
  const [amount, setAmount] = useState('500');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      onDeposit(currency, numAmount);
      
      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 1000);
  };

  const selectedCurrency = currencies.find(c => c.id === currency)!;

  if (success) {
    return (
      <div className="proto-modal-backdrop" onClick={onClose}>
        <div className="proto-modal" onClick={(e) => e.stopPropagation()}>
          <div className="proto-deposit-success">
            <div className="proto-deposit-success-icon">✓</div>
            <h3 className="proto-deposit-success-title">Успешно!</h3>
            <p className="proto-deposit-success-amount">
              +{parseFloat(amount).toLocaleString('ru-RU')} {selectedCurrency.symbol}
            </p>
            <p className="proto-deposit-success-hint">Баланс обновлён</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="proto-modal-backdrop" onClick={onClose}>
      <div className="proto-modal proto-deposit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="proto-modal-header">
          <h2 className="proto-modal-title">Пополнение</h2>
          <p className="proto-modal-desc">Выберите валюту и сумму</p>
        </div>

        <form className="proto-deposit-form" onSubmit={handleSubmit}>
          {/* Currency selector */}
          <div className="proto-form-field">
            <label className="proto-form-label">Валюта</label>
            <div className="proto-currency-selector">
              {currencies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`proto-currency-btn${currency === c.id ? ' active' : ''}`}
                  onClick={() => setCurrency(c.id)}
                >
                  <span className="proto-currency-icon">{c.icon}</span>
                  <span className="proto-currency-name">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div className="proto-form-field">
            <label className="proto-form-label">Сумма</label>
            <div className="proto-amount-input">
              <span className="proto-amount-icon">{selectedCurrency.icon}</span>
              <input
                type="number"
                className="proto-input proto-amount-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="1"
              />
            </div>
            <div className="proto-amount-presets">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`proto-preset-btn${amount === String(preset) ? ' active' : ''}`}
                  onClick={() => setAmount(String(preset))}
                >
                  {preset.toLocaleString('ru-RU')}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="proto-form-field">
            <label className="proto-form-label">Способ оплаты</label>
            <div className="proto-method-list">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`proto-method-btn${method === m.id ? ' active' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="proto-method-icon">{m.icon}</span>
                  <span className="proto-method-name">{m.name}</span>
                  <span className="proto-method-check">{method === m.id ? '●' : '○'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="proto-btn proto-btn--gold proto-btn--full proto-btn--lg"
            disabled={processing || !amount || parseFloat(amount) <= 0}
          >
            {processing ? (
              <span className="proto-spinner">⏳</span>
            ) : (
              <>Пополнить {parseFloat(amount || '0').toLocaleString('ru-RU')} {selectedCurrency.symbol}</>
            )}
          </button>
        </form>

        <button 
          type="button" 
          className="proto-modal-close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
