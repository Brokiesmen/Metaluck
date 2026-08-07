import { useEffect, useState } from 'react';
import { api } from '../../api';
import { StarIcon } from '../StarIcon';
import { CryptoAssetIcon } from '../CryptoAssetIcon';
import type { WalletBalance } from '../../types';

interface Props {
  title?: string;
  showBalance?: boolean;
  compact?: boolean;
  onMenu?: () => void;
  /** Stars amount (live). Prefer over balanceLabel. */
  starsBalance?: number;
  /** Legacy text label for stars (preview / fallback). */
  balanceLabel?: string;
  userName?: string;
  userAvatar?: string | null;
  onBalanceClick?: () => void;
  onSettings?: () => void;
}

function formatCrypto(b: WalletBalance | undefined, locale = 'ru-RU'): string {
  if (!b) return '0';
  if (b.decimals <= 0) return b.available.toLocaleString(locale);
  const major = b.available / 10 ** b.decimals;
  return major.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(4, b.decimals),
  });
}

function formatStars(n: number, locale = 'ru-RU'): string {
  return Math.floor(n).toLocaleString(locale);
}

/**
 * TopBar: только балансы по центру — ★ / TON / USDT, иконка + сумма в одну линию.
 */
export function TopBar({
  compact = false,
  starsBalance,
  balanceLabel,
  onBalanceClick,
}: Props) {
  const [ton, setTon] = useState<WalletBalance | undefined>();
  const [usdt, setUsdt] = useState<WalletBalance | undefined>();
  const [starsFromWallet, setStarsFromWallet] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .getWallet()
        .then((w) => {
          if (!alive) return;
          setTon(w.balances.find((b) => b.currency === 'TON'));
          setUsdt(w.balances.find((b) => b.currency === 'USDT_TON'));
          const stars = w.balances.find((b) => b.currency === 'STARS');
          if (stars) setStarsFromWallet(stars.available);
        })
        .catch(() => {
          /* offline / anon preview — keep zeros */
        });
    };
    load();
    const id = window.setInterval(load, 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [starsBalance, balanceLabel]);

  const starsText =
    starsBalance != null
      ? formatStars(starsBalance)
      : starsFromWallet != null
        ? formatStars(starsFromWallet)
        : (balanceLabel ?? '0');

  return (
    <header className={`sh-topbar sh-topbar--balances${compact ? ' sh-topbar--compact' : ''}`}>
      <div className="sh-topbar-balances" role="group" aria-label="Balances">
        <button
          type="button"
          className="sh-bal"
          onClick={onBalanceClick}
          disabled={!onBalanceClick}
        >
          <StarIcon size={16} animate={false} glow={false} />
          <span className="sh-bal-amt">{starsText}</span>
        </button>

        <button
          type="button"
          className="sh-bal"
          onClick={onBalanceClick}
          disabled={!onBalanceClick}
        >
          <CryptoAssetIcon currency="TON" size={16} />
          <span className="sh-bal-amt">{formatCrypto(ton)}</span>
        </button>

        <button
          type="button"
          className="sh-bal"
          onClick={onBalanceClick}
          disabled={!onBalanceClick}
        >
          <CryptoAssetIcon currency="USDT_TON" size={16} />
          <span className="sh-bal-amt">{formatCrypto(usdt)}</span>
        </button>
      </div>
    </header>
  );
}
