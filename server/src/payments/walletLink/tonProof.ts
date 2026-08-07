/**
 * Проверка TON Connect ton_proof (доказательство владения TON-адресом).
 * Спека: https://docs.ton.org/develop/dapps/ton-connect/sign
 *
 * Алгоритм:
 *   message  = "ton-proof-item-v2/" ++ workchain(4,BE) ++ addrHash(32)
 *              ++ domainLen(4,LE) ++ domain ++ ts(8,LE) ++ payload
 *   signed   = sha256( 0xffff ++ "ton-connect" ++ sha256(message) )
 *   verify ed25519(signed, signature, publicKey)
 * Привязка publicKey→address: сверяем с on-chain get_public_key (авторитетно).
 */

import crypto from 'crypto';
import { Address } from '@ton/core';
import { signVerify } from '@ton/crypto';
import { blockchainService } from '../blockchain/index.js';

export interface TonProofPayload {
  address: string; // raw "0:hex" (account.address из TonConnect)
  network?: string; // "-239" mainnet / "-3" testnet
  publicKey?: string; // hex (account.publicKey)
  proof: {
    timestamp: number;
    domain: { lengthBytes?: number; value: string };
    signature: string; // base64
    payload: string; // наш nonce
  };
}

const PROOF_TTL_SEC = 15 * 60;
const PREFIX = Buffer.from('ton-proof-item-v2/');
const CONNECT = Buffer.from('ton-connect');

function sha256(buf: Buffer): Buffer {
  return crypto.createHash('sha256').update(buf).digest();
}

/** Разрешённые домены фронта (откуда пришёл ton_proof). */
export function allowedProofDomains(): Set<string> {
  const out = new Set<string>(['localhost:5173', 'localhost:3000']);
  const push = (raw: string | undefined | null) => {
    const v = String(raw ?? '').trim();
    if (!v) return;
    try {
      out.add(new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).host.toLowerCase());
    } catch {
      /* ignore */
    }
  };
  push(process.env.WEB_APP_URL);
  push(process.env.PUBLIC_WEB_URL);
  String(process.env.WALLET_LINK_DOMAINS ?? '')
    .split(',')
    .forEach(push);
  String(process.env.CORS_ORIGIN ?? '')
    .split(',')
    .forEach((o) => {
      if (!/telegram\.org/i.test(o)) push(o);
    });
  return out;
}

export interface VerifiedTonWallet {
  addressRaw: string; // "0:hex" (нормализованный, для хранения)
  addressFriendly: string; // EQ…/UQ… (для показа)
  publicKey: string; // hex
}

export async function verifyTonProof(input: TonProofPayload): Promise<VerifiedTonWallet> {
  const { proof } = input;
  if (!proof?.signature || !proof.payload) throw new Error('malformed proof');

  // 1. Домен
  const domain = String(proof.domain?.value ?? '').toLowerCase();
  if (!allowedProofDomains().has(domain)) {
    throw new Error(`domain not allowed: ${domain}`);
  }

  // 2. Свежесть
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(proof.timestamp);
  if (!Number.isFinite(ts) || now - ts > PROOF_TTL_SEC || ts - now > 300) {
    throw new Error('proof expired');
  }

  // 3. Адрес
  const address = Address.parse(input.address);
  const providedPk = String(input.publicKey ?? '').toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(providedPk)) throw new Error('bad public key');

  // 4. Сообщение
  const domainBuf = Buffer.from(proof.domain.value);
  const wc = Buffer.alloc(4);
  wc.writeInt32BE(address.workChain);
  const domainLen = Buffer.alloc(4);
  domainLen.writeUInt32LE(domainBuf.byteLength);
  const tsBuf = Buffer.alloc(8);
  tsBuf.writeBigUint64LE(BigInt(ts));
  const message = Buffer.concat([
    PREFIX,
    wc,
    address.hash,
    domainLen,
    domainBuf,
    tsBuf,
    Buffer.from(proof.payload),
  ]);
  const signed = sha256(Buffer.concat([Buffer.from([0xff, 0xff]), CONNECT, sha256(message)]));

  // 5. Подпись
  const sig = Buffer.from(proof.signature, 'base64');
  const pk = Buffer.from(providedPk, 'hex');
  if (!signVerify(signed, sig, pk)) {
    throw new Error('invalid signature');
  }

  // 6. Привязка ключа к адресу через on-chain get_public_key (авторитетно).
  await assertOnChainPublicKey(address, providedPk);

  return {
    addressRaw: address.toRawString(),
    addressFriendly: address.toString({ urlSafe: true, bounceable: false }),
    publicKey: providedPk,
  };
}

async function assertOnChainPublicKey(address: Address, publicKeyHex: string): Promise<void> {
  let chainPk: bigint;
  try {
    const client = blockchainService.getRpcClient();
    const res = await client.runMethod(address, 'get_public_key', []);
    chainPk = res.stack.readBigNumber();
  } catch (err) {
    // Кошелёк не задеплоен или RPC недоступен — подтвердить владение нельзя.
    throw new Error(
      'cannot verify on-chain public key (wallet not deployed or RPC unavailable)',
    );
  }
  const claimed = BigInt(`0x${publicKeyHex}`);
  if (chainPk !== claimed) {
    throw new Error('public key does not match on-chain wallet');
  }
}
