/** Shared blockchain domain types (TON Network). */

export type BlockchainNetwork = 'ton';
export type BlockchainCurrency = 'TON' | 'USDT_TON';

export interface BlockchainBalance {
  network: BlockchainNetwork;
  address: string;
  /** Native TON balance in nanotons. */
  tonNanotons: number;
  /** USDT jetton balance in micros (6 decimals), null if not queried / missing. */
  usdtMicros: number | null;
}

export interface BlockchainTransaction {
  network: BlockchainNetwork;
  txHash: string;
  lt: string | null;
  currency: BlockchainCurrency;
  /** Minor units: nanotons or USDT micros. */
  amount: number;
  fromAddress: string | null;
  toAddress: string;
  comment: string | null;
  confirmations: number;
  timestamp: number | null;
}

export interface VerifyTransactionInput {
  txHash: string;
  /** Optional account whose events to search when event lookup fails. */
  accountAddress?: string;
  expectedTo?: string;
  expectedFrom?: string;
  expectedAmount?: number;
  expectedCurrency?: BlockchainCurrency;
  expectedComment?: string;
  minConfirmations?: number;
  /** Allow amount >= expected (default exact match when expectedAmount set). */
  amountMode?: 'exact' | 'min';
}

export interface VerifyTransactionResult {
  ok: boolean;
  reason?: string;
  transaction?: BlockchainTransaction;
}

export interface SendTransactionInput {
  currency: BlockchainCurrency;
  toAddress: string;
  /** Minor units to send on-chain. */
  amount: number;
  /**
   * Wallet to sign with:
   * - `hot` — TON_WITHDRAW_HOT_MNEMONIC
   * - mnemonic words
   * - raw Wallet V4 keypair
   */
  wallet?: 'hot' | { mnemonic: string[] } | { publicKey: Buffer; secretKey: Buffer };
  comment?: string;
}

export interface SendTransactionResult {
  network: BlockchainNetwork;
  txHash: string;
  fromAddress: string;
  seqno: number;
  currency: BlockchainCurrency;
  amount: number;
  toAddress: string;
}

export type GenerateAddressInput =
  | { kind: 'user'; userId: number; masterSeed: Buffer }
  | { kind: 'mnemonic'; mnemonic: string[] }
  | { kind: 'seed'; seed: Buffer };

export interface GeneratedAddress {
  network: BlockchainNetwork;
  address: string;
  addressRaw: string;
  publicKey: Buffer;
  secretKey: Buffer;
  derivationVersion: number;
}
