/**
 * Deposit address scanner — thin adapter over BlockchainService.getTransactions.
 * No direct TonAPI / RPC calls. Strict address matching for TON + USDT.
 */

import { blockchainService, addressesEqual } from '../blockchain/index.js';
import type { CryptoCurrency } from './config.js';

export interface ObservedTransfer {
  txHash: string;
  lt: string | null;
  currency: CryptoCurrency;
  amount: number;
  fromAddress: string | null;
  toAddress: string;
  comment: string | null;
  confirmations: number;
}

/**
 * List inbound TON + USDT jetton transfers to a deposit address.
 */
export async function listInboundTransfers(args: {
  toAddress: string;
  limit?: number;
}): Promise<ObservedTransfer[]> {
  const txs = await blockchainService.getTransactions(args.toAddress, {
    limit: args.limit ?? 50,
  });

  return txs
    .filter((t) => {
      // Only credit transfers that belong to this deposit address (anti wrong-address)
      if (t.currency === 'TON') {
        return addressesEqual(t.toAddress, args.toAddress);
      }
      // USDT: account events are scoped to owner; require toAddress match when present
      if (!t.toAddress) return false;
      return addressesEqual(t.toAddress, args.toAddress);
    })
    .map((t) => ({
      txHash: t.txHash,
      lt: t.lt,
      currency: t.currency,
      amount: t.amount,
      fromAddress: t.fromAddress,
      toAddress: args.toAddress,
      comment: t.comment,
      confirmations: t.confirmations,
    }));
}
