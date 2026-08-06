import type { WalletCurrency } from '../types';
import { currencyLabel, useWagerCurrency } from '../hooks/useWagerCurrency';
import { useSettings } from '../settings/SettingsContext';

interface Props {
  className?: string;
  disabled?: boolean;
}

const OPTIONS: WalletCurrency[] = ['STARS', 'TON', 'USDT_TON'];

/** Chip row to choose which wallet currency pays the stake. */
export function BetCurrencyPicker({ className = '', disabled }: Props) {
  const { t } = useSettings();
  const { currency, setCurrency } = useWagerCurrency();

  return (
    <div className={`bet-currency ${className}`.trim()}>
      <div className="bet-currency-label">{t.wallet.betCurrency}</div>
      <div className="bet-currency-chips" role="group" aria-label={t.wallet.betCurrency}>
        {OPTIONS.map((code) => (
          <button
            key={code}
            type="button"
            disabled={disabled}
            className={`bet-currency-chip${currency === code ? ' bet-currency-chip--on' : ''}`}
            onClick={() => setCurrency(code)}
          >
            {currencyLabel(code)}
          </button>
        ))}
      </div>
    </div>
  );
}
