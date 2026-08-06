/**
 * On-chain sender for Crypto Withdrawal — delegates to BlockchainService.
 * No direct TonClient / mnemonic usage outside BlockchainService.
 */

import { blockchainService } from '../blockchain/index.js';
import type { CryptoCurrency } from './config.js';

export interface SendResult {
  txHash: string;
  fromAddress: string;
  seqno: number;
}

/**
 * Send netAmount (minor units) of TON or USDT jetton to destination via hot wallet.
 */
export async function sendCryptoWithdrawal(args: {
  currency: CryptoCurrency;
  toAddress: string;
  netAmount: number;
}): Promise<SendResult> {
  const result = await blockchainService.sendTransaction({
    currency: args.currency,
    toAddress: args.toAddress,
    amount: args.netAmount,
    wallet: 'hot',
  });
  return {
    txHash: result.txHash,
    fromAddress: result.fromAddress,
    seqno: result.seqno,
  };
}

export async function hotWalletAddress(): Promise<string | null> {
  return blockchainService.getHotWalletAddress();
}
