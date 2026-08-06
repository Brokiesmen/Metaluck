/**
 * Legacy memo-deposit scanner — uses BlockchainService only (no direct TonAPI).
 */

import { blockchainService } from '../blockchain/index.js';

export interface ChainTransferMatch {
  txHash: string;
  amount: number;
  comment: string | null;
  confirmations: number;
  lt: string | null;
}

/**
 * Scan recent account events for a native TON transfer with matching memo.
 * Amount is in nanotons.
 */
export async function findTonTransfer(args: {
  toAddress: string;
  memo: string;
  minAmount: number;
}): Promise<ChainTransferMatch | null> {
  const txs = await blockchainService.getTransactions(args.toAddress, { limit: 50 });
  const hit = txs.find(
    (t) =>
      t.currency === 'TON' &&
      t.comment === args.memo &&
      t.amount >= args.minAmount,
  );
  if (!hit) return null;
  return {
    txHash: hit.txHash,
    amount: hit.amount,
    comment: hit.comment,
    confirmations: hit.confirmations,
    lt: hit.lt,
  };
}

/**
 * Scan for Jetton USDT transfer to treasury with matching forward comment / memo.
 * Amount in jetton raw units (USDT = 6 decimals).
 */
export async function findUsdtTonTransfer(args: {
  toAddress: string;
  memo: string;
  minAmount: number;
}): Promise<ChainTransferMatch | null> {
  const txs = await blockchainService.getTransactions(args.toAddress, { limit: 50 });
  const hit = txs.find(
    (t) =>
      t.currency === 'USDT_TON' &&
      t.comment === args.memo &&
      t.amount >= args.minAmount,
  );
  if (!hit) return null;
  return {
    txHash: hit.txHash,
    amount: hit.amount,
    comment: hit.comment,
    confirmations: hit.confirmations,
    lt: hit.lt,
  };
}

/** Verify a known deposit via BlockchainService.verifyTransaction. */
export async function verifyDepositTransfer(args: {
  txHash: string;
  toAddress: string;
  memo: string;
  minAmount: number;
  currency: 'TON' | 'USDT_TON';
  minConfirmations?: number;
}) {
  return blockchainService.verifyTransaction({
    txHash: args.txHash,
    accountAddress: args.toAddress,
    expectedTo: args.toAddress,
    expectedComment: args.memo,
    expectedAmount: args.minAmount,
    expectedCurrency: args.currency,
    amountMode: 'min',
    minConfirmations: args.minConfirmations ?? 1,
  });
}
