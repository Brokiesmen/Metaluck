import { depositMasterSeed } from './config.js';
import {
  blockchainService,
  addressesEqual,
  parseTonAddress,
  toAddressRaw,
} from '../blockchain/index.js';

export interface DerivedDepositAddress {
  address: string;
  addressRaw: string;
  derivationVersion: number;
}

export interface DerivedDepositKeyPair extends DerivedDepositAddress {
  publicKey: Buffer;
  secretKey: Buffer;
}

export { addressesEqual, parseTonAddress, toAddressRaw };

/**
 * Deterministic Wallet V4 address per user (via BlockchainService.generateAddress).
 */
export function deriveUserTonAddress(userId: number): DerivedDepositAddress {
  const master = depositMasterSeed();
  if (!master) {
    throw Object.assign(new Error('CRYPTO_WALLET_DISABLED'), { statusCode: 503 });
  }
  const gen = blockchainService.generateAddress({
    kind: 'user',
    userId,
    masterSeed: master,
  });
  return {
    address: gen.address,
    addressRaw: gen.addressRaw,
    derivationVersion: gen.derivationVersion,
  };
}

/** Full keypair for rare ops (e.g. sweep). Prefer hot wallet for withdrawals. */
export function deriveUserTonKeyPair(userId: number): DerivedDepositKeyPair {
  const master = depositMasterSeed();
  if (!master) {
    throw Object.assign(new Error('CRYPTO_WALLET_DISABLED'), { statusCode: 503 });
  }
  const gen = blockchainService.generateAddress({
    kind: 'user',
    userId,
    masterSeed: master,
  });
  return {
    address: gen.address,
    addressRaw: gen.addressRaw,
    derivationVersion: gen.derivationVersion,
    publicKey: gen.publicKey,
    secretKey: gen.secretKey,
  };
}
