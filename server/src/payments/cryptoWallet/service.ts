import { deriveUserTonAddress } from './address.js';
import {
  isCryptoWalletEnabled,
  resolveConfirmationsRequired,
  resolveMinTonNanotons,
  resolveMinUsdtMicros,
  type CryptoCurrency,
} from './config.js';
import {
  getAddressByUser,
  listUserChainTx,
  upsertDepositAddress,
  type DepositAddressRow,
} from './store.js';
import { isCryptoCurrency, toTxView } from './transactionService.js';
import { ensureUserWallets } from '../wallet/index.js';
import { cryptoWithdrawStatus } from './withdrawService.js';

export interface DepositAddressView {
  network: 'ton';
  address: string;
  addressRaw: string;
  currency: CryptoCurrency;
  decimals: number;
  minAmount: number;
  symbol: string;
  currencies: Array<{
    code: CryptoCurrency;
    decimals: number;
    minAmount: number;
    symbol: string;
  }>;
  requiredConfirmations: number;
  memoHint: string | null;
  createdAt: string;
  instructions: string;
}

async function currencyMeta(currency: CryptoCurrency) {
  if (currency === 'TON') {
    return {
      code: 'TON' as const,
      decimals: 9,
      minAmount: await resolveMinTonNanotons(),
      symbol: 'TON',
      instructions:
        'Send TON (native) on TON Network to this address. Do not use other networks.',
    };
  }
  return {
    code: 'USDT_TON' as const,
    decimals: 6,
    minAmount: await resolveMinUsdtMicros(),
    symbol: 'USDT',
    instructions:
      'Send USDT jetton on TON Network to this address. Do not send ERC-20 or other chains.',
  };
}

export async function startCryptoDeposit(
  userId: number,
  currencyRaw: string,
): Promise<DepositAddressView> {
  if (!isCryptoWalletEnabled()) {
    throw Object.assign(new Error('Crypto wallet is not configured (TON_DEPOSIT_MASTER_SEED)'), {
      statusCode: 503,
    });
  }
  if (!isCryptoCurrency(currencyRaw)) {
    throw Object.assign(new Error('Unsupported currency. Use TON or USDT_TON.'), {
      statusCode: 400,
    });
  }
  if (!(userId > 0)) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }

  await ensureUserWallets(userId);
  const derived = deriveUserTonAddress(userId);
  const row = await upsertDepositAddress({
    userId,
    address: derived.address,
    addressRaw: derived.addressRaw,
    derivationVersion: derived.derivationVersion,
  });

  return toAddressView(row, currencyRaw);
}

export async function getOrCreateDepositAddress(userId: number): Promise<DepositAddressView> {
  return startCryptoDeposit(userId, 'TON');
}

export async function getDepositAddress(
  userId: number,
  currency: CryptoCurrency = 'TON',
): Promise<DepositAddressView | null> {
  const row = await getAddressByUser(userId);
  if (!row) return null;
  await upsertDepositAddress({
    userId: row.userId,
    address: row.address,
    addressRaw: row.addressRaw,
    derivationVersion: row.derivationVersion,
  });
  return toAddressView(row, currency);
}

async function toAddressView(row: DepositAddressRow, currency: CryptoCurrency): Promise<DepositAddressView> {
  const selected = await currencyMeta(currency);
  const ton = await currencyMeta('TON');
  const usdt = await currencyMeta('USDT_TON');
  return {
    network: 'ton',
    address: row.address,
    addressRaw: row.addressRaw,
    currency: selected.code,
    decimals: selected.decimals,
    minAmount: selected.minAmount,
    symbol: selected.symbol,
    currencies: [
      { code: ton.code, decimals: ton.decimals, minAmount: ton.minAmount, symbol: ton.symbol },
      { code: usdt.code, decimals: usdt.decimals, minAmount: usdt.minAmount, symbol: usdt.symbol },
    ],
    requiredConfirmations: await resolveConfirmationsRequired(),
    memoHint: null,
    createdAt: row.createdAt,
    instructions: selected.instructions,
  };
}

export async function listCryptoDeposits(userId: number, limit = 30) {
  const rows = await listUserChainTx(userId, limit);
  return rows.map(toTxView);
}

export function cryptoWalletStatus() {
  return {
    enabled: isCryptoWalletEnabled(),
    network: 'ton' as const,
    currencies: ['TON', 'USDT_TON'] as const,
    statuses: ['pending', 'confirmed', 'failed'] as const,
    withdraw: cryptoWithdrawStatus(),
  };
}
