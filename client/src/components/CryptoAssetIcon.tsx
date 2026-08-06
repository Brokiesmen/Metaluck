/** Official brand marks: TON diamond (ton.org / Toncoin) and USDT circle (tether.to). */

type CryptoAsset = 'TON' | 'USDT_TON';

interface Props {
  currency: CryptoAsset;
  size?: number;
  className?: string;
}

const SRC: Record<CryptoAsset, string> = {
  TON: '/crypto/ton.svg',
  USDT_TON: '/crypto/usdt.svg',
};

const ALT: Record<CryptoAsset, string> = {
  TON: 'TON',
  USDT_TON: 'USDT',
};

export function CryptoAssetIcon({ currency, size = 40, className }: Props) {
  return (
    <img
      src={SRC[currency]}
      alt={ALT[currency]}
      width={size}
      height={size}
      className={`crypto-asset-icon${className ? ` ${className}` : ''}`}
      draggable={false}
    />
  );
}
