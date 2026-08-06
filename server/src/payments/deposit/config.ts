import type { DepositMethod } from './types.js';

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

/** Min deposit amounts in smallest units. */
export function minTonNanotons(): number {
  return envInt('DEPOSIT_MIN_TON_NANOTONS', 100_000_000); // 0.1 TON
}

export function minUsdtMicros(): number {
  return envInt('DEPOSIT_MIN_USDT_MICROS', 1_000_000); // 1 USDT
}

export function tonDepositAddress(): string {
  return String(process.env.TON_DEPOSIT_ADDRESS ?? '').trim();
}

export function usdtJettonMaster(): string {
  // Official Tether USD₮ master on TON (mainnet)
  return String(
    process.env.USDT_TON_JETTON_MASTER ?? 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  ).trim();
}

export function tonConfirmationsRequired(): number {
  return Math.max(1, envInt('TON_DEPOSIT_CONFIRMATIONS', 1));
}

export function cryptoDepositTtlMs(): number {
  return envInt('TON_DEPOSIT_TTL_MS', 60 * 60 * 1000);
}

export function tonApiBase(): string {
  return String(process.env.TON_API_BASE ?? 'https://tonapi.io').replace(/\/+$/, '');
}

export function tonApiKey(): string {
  return String(process.env.TONAPI_KEY ?? process.env.TON_API_KEY ?? '').trim();
}

export async function listDepositMethods(): Promise<DepositMethod[]> {
  const tonAddr = tonDepositAddress();
  const cryptoEnabled = Boolean(tonAddr);

  let minStars = 25;
  let minTon = minTonNanotons();
  let minUsdt = minUsdtMicros();
  try {
    const hub = await import('../hub/settings.js');
    minStars = await hub.getDepositMinStars();
    minTon = await hub.getDepositMinTonNanotons();
    minUsdt = await hub.getDepositMinUsdtMicros();
  } catch {
    /* hub settings optional at boot */
  }

  return [
    {
      rail: 'telegram_stars',
      currency: 'STARS',
      label: 'Telegram Stars',
      network: null,
      decimals: 0,
      minAmount: minStars,
      enabled: true,
      hint: 'Оплата через Telegram Invoice (XTR → ★).',
    },
    {
      rail: 'ton',
      currency: 'TON',
      label: 'TON',
      network: 'ton',
      decimals: 9,
      minAmount: minTon,
      enabled: cryptoEnabled,
      hint: cryptoEnabled
        ? 'Перевод TON на адрес депозита с уникальным memo.'
        : 'Задайте TON_DEPOSIT_ADDRESS на сервере.',
    },
    {
      rail: 'usdt_ton',
      currency: 'USDT_TON',
      label: 'USDT (TON)',
      network: 'ton',
      decimals: 6,
      minAmount: minUsdt,
      enabled: cryptoEnabled,
      hint: cryptoEnabled
        ? 'Jetton USDT на адрес депозита с уникальным memo.'
        : 'Задайте TON_DEPOSIT_ADDRESS на сервере.',
    },
  ];
}
