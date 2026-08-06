/**
 * BlockchainService — single gateway for all TON chain I/O.
 *
 * Uses:
 * - TON Blockchain API (TonAPI) — balances, events, verify
 * - TON RPC (TonCenter / TonClient) — send, get-methods
 * - TON wallet integration (Wallet V4) — generateAddress, sign & broadcast
 *
 * No other module should call TonAPI / TonClient / fetch chain endpoints directly.
 */

import crypto from 'crypto';
import { mnemonicToPrivateKey, keyPairFromSeed } from '@ton/crypto';
import { Address, beginCell, type Cell } from '@ton/core';
import {
  internal,
  SendMode,
  TonClient,
  WalletContractV4,
} from '@ton/ton';
import {
  jettonTransferGasNanotons,
  tonApiBase,
  tonApiKey,
  tonCenterApiKey,
  tonRpcEndpoint,
  usdtJettonMaster,
  withdrawHotMnemonic,
} from './config.js';
import { addressesEqual, parseTonAddress, toFriendlyAddress } from './addressUtils.js';
import type {
  BlockchainBalance,
  BlockchainCurrency,
  BlockchainTransaction,
  GenerateAddressInput,
  GeneratedAddress,
  SendTransactionInput,
  SendTransactionResult,
  VerifyTransactionInput,
  VerifyTransactionResult,
} from './types.js';

function apiHeaders(): Record<string, string> {
  const key = tonApiKey();
  return {
    Accept: 'application/json',
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

function eventHash(ev: Record<string, unknown>): string {
  const h = ev.event_id ?? ev.hash ?? ev.tx_hash;
  if (typeof h === 'string' && h) return h;
  return `lt:${String(ev.lt ?? Date.now())}`;
}

function extractComment(msg: unknown): string | null {
  if (!msg || typeof msg !== 'object') return null;
  const m = msg as Record<string, unknown>;
  const decoded = m.decoded_body ?? m.decoded;
  if (decoded && typeof decoded === 'object') {
    const d = decoded as Record<string, unknown>;
    if (typeof d.text === 'string') return d.text.trim();
    if (typeof d.comment === 'string') return d.comment.trim();
    if (d.payload && typeof d.payload === 'object') {
      const p = d.payload as Record<string, unknown>;
      if (typeof p.text === 'string') return p.text.trim();
      if (typeof p.comment === 'string') return p.comment.trim();
    }
  }
  if (typeof m.comment === 'string') return m.comment.trim();
  return null;
}

function addrField(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const a = (v as { address?: unknown }).address;
    if (typeof a === 'string') return a;
  }
  return null;
}

function jettonMatchesUsdt(jt: Record<string, unknown>): boolean {
  const master = usdtJettonMaster().toLowerCase();
  const jetton = jt.jetton as Record<string, unknown> | undefined;
  const jettonAddr = String(jetton?.address ?? jt.jetton_address ?? '').toLowerCase();
  const symbol = String(jetton?.symbol ?? '').toUpperCase();
  if (symbol === 'USD₮' || symbol === 'USDT') return true;
  if (!master || !jettonAddr) return false;
  const norm = (s: string) => s.replace(/^0:/, '').toLowerCase();
  return (
    jettonAddr === master ||
    norm(jettonAddr) === norm(master) ||
    jettonAddr.endsWith(master.slice(-12).toLowerCase())
  );
}

function jettonTransferBody(args: {
  amount: bigint;
  destination: Address;
  responseTo: Address;
  comment?: string;
}): Cell {
  let builder = beginCell()
    .storeUint(0x0f8a7ea5, 32)
    .storeUint(0, 64)
    .storeCoins(args.amount)
    .storeAddress(args.destination)
    .storeAddress(args.responseTo)
    .storeBit(0)
    .storeCoins(args.comment ? 1n : 1n);

  if (args.comment) {
    const forward = beginCell().storeUint(0, 32).storeStringTail(args.comment).endCell();
    builder = builder.storeBit(1).storeRef(forward);
  } else {
    builder = builder.storeBit(0);
  }
  return builder.endCell();
}

export class BlockchainService {
  private rpcClient: TonClient | null = null;

  /** TonAPI HTTP — all REST calls go here. */
  private async tonApiGet<T>(path: string, timeoutMs = 15_000): Promise<T> {
    const base = tonApiBase();
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`TON API error ${res.status} (${path})`);
    }
    return (await res.json()) as T;
  }

  /** TON RPC via @ton/ton TonClient. */
  getRpcClient(): TonClient {
    if (!this.rpcClient) {
      const apiKey = tonCenterApiKey();
      this.rpcClient = new TonClient({
        endpoint: tonRpcEndpoint(),
        apiKey: apiKey || undefined,
      });
    }
    return this.rpcClient;
  }

  // ── generateAddress ──────────────────────────────────────────

  /**
   * Generate / derive a Wallet V4 address (local crypto — no network).
   */
  generateAddress(input: GenerateAddressInput): GeneratedAddress {
    let seed: Buffer;
    let derivationVersion = 1;

    if (input.kind === 'user') {
      if (!(input.userId > 0)) throw new Error('Invalid userId');
      seed = crypto
        .createHmac('sha256', input.masterSeed)
        .update(`metaluck:ton:deposit:v1:${input.userId}`)
        .digest();
      derivationVersion = 1;
    } else if (input.kind === 'mnemonic') {
      // Sync path unavailable for mnemonic — use generateAddressFromMnemonic async
      throw new Error('Use generateAddressFromMnemonic() for mnemonic wallets');
    } else {
      if (input.seed.length !== 32) throw new Error('seed must be 32 bytes');
      seed = input.seed;
    }

    const keyPair = keyPairFromSeed(seed);
    return this.fromKeyPair(keyPair.publicKey, keyPair.secretKey, derivationVersion);
  }

  async generateAddressFromMnemonic(mnemonic: string[]): Promise<GeneratedAddress> {
    if (mnemonic.length < 12) throw new Error('Invalid mnemonic');
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    return this.fromKeyPair(keyPair.publicKey, keyPair.secretKey, 0);
  }

  private fromKeyPair(
    publicKey: Buffer | Uint8Array,
    secretKey: Buffer | Uint8Array,
    derivationVersion: number,
  ): GeneratedAddress {
    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: Buffer.from(publicKey),
    });
    const address = wallet.address.toString({
      urlSafe: true,
      bounceable: false,
      testOnly: false,
    });
    const addressRaw = `${wallet.address.workChain}:${wallet.address.hash.toString('hex')}`;
    return {
      network: 'ton',
      address,
      addressRaw,
      publicKey: Buffer.from(publicKey),
      secretKey: Buffer.from(secretKey),
      derivationVersion,
    };
  }

  // ── getBalance ───────────────────────────────────────────────

  async getBalance(address: string): Promise<BlockchainBalance> {
    const friendly = toFriendlyAddress(address);
    const enc = encodeURIComponent(friendly);

    const account = await this.tonApiGet<{
      balance?: number | string;
      address?: string;
    }>(`/v2/accounts/${enc}`);

    const tonNanotons = Math.trunc(Number(account.balance ?? 0));
    let usdtMicros: number | null = null;

    try {
      const jets = await this.tonApiGet<{
        balances?: Array<{
          balance?: string | number;
          jetton?: { address?: string; symbol?: string };
        }>;
      }>(`/v2/accounts/${enc}/jettons`);

      const master = usdtJettonMaster().toLowerCase();
      for (const row of jets.balances ?? []) {
        const jAddr = String(row.jetton?.address ?? '').toLowerCase();
        const symbol = String(row.jetton?.symbol ?? '').toUpperCase();
        const isUsdt =
          symbol === 'USDT' ||
          symbol === 'USD₮' ||
          jAddr === master.toLowerCase() ||
          jAddr.includes(master.replace(/^eq/i, '').toLowerCase().slice(0, 16));
        if (isUsdt) {
          usdtMicros = Math.trunc(Number(row.balance ?? 0));
          break;
        }
      }
    } catch {
      usdtMicros = null;
    }

    return {
      network: 'ton',
      address: friendly,
      tonNanotons: Number.isFinite(tonNanotons) ? tonNanotons : 0,
      usdtMicros,
    };
  }

  // ── getTransactions ──────────────────────────────────────────

  async getTransactions(
    address: string,
    opts: { limit?: number } = {},
  ): Promise<BlockchainTransaction[]> {
    const friendly = toFriendlyAddress(address);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
    const enc = encodeURIComponent(friendly);
    const body = await this.tonApiGet<{ events?: unknown[] }>(
      `/v2/accounts/${enc}/events?limit=${limit}`,
    );
    return this.parseEvents(body.events ?? [], friendly);
  }

  private parseEvents(events: unknown[], accountAddress: string): BlockchainTransaction[] {
    const out: BlockchainTransaction[] = [];

    for (const raw of events) {
      if (!raw || typeof raw !== 'object') continue;
      const ev = raw as Record<string, unknown>;
      const confirmations = Number(ev.confirmations ?? (ev.is_pending ? 0 : 1));
      const conf = Number.isFinite(confirmations) ? Math.max(0, Math.trunc(confirmations)) : 1;
      const timestamp =
        typeof ev.timestamp === 'number'
          ? ev.timestamp
          : typeof ev.utime === 'number'
            ? ev.utime
            : null;
      const actions = Array.isArray(ev.actions) ? ev.actions : [];

      for (const action of actions) {
        if (!action || typeof action !== 'object') continue;
        const a = action as Record<string, unknown>;
        const type = String(a.type ?? '');

        if (type === 'TonTransfer') {
          const tonTransfer = (a.TonTransfer ?? a.ton_transfer) as
            | Record<string, unknown>
            | undefined;
          if (!tonTransfer) continue;
          const to = addrField(tonTransfer, 'recipient') ?? addrField(tonTransfer, 'to');
          const amount = Math.trunc(Number(tonTransfer.amount ?? 0));
          if (!(amount > 0)) continue;
          out.push({
            network: 'ton',
            txHash: eventHash(ev),
            lt: ev.lt != null ? String(ev.lt) : null,
            currency: 'TON',
            amount,
            fromAddress: addrField(tonTransfer, 'sender') ?? addrField(tonTransfer, 'from'),
            toAddress: to ?? accountAddress,
            comment:
              typeof tonTransfer.comment === 'string'
                ? tonTransfer.comment.trim()
                : extractComment(tonTransfer),
            confirmations: conf,
            timestamp,
          });
        }

        if (type === 'JettonTransfer') {
          const jt = (a.JettonTransfer ?? a.jetton_transfer) as Record<string, unknown> | undefined;
          if (!jt || !jettonMatchesUsdt(jt)) continue;
          const to =
            addrField(jt, 'recipient') ?? addrField(jt, 'to') ?? addrField(jt, 'recipients_wallet');
          const amount = Math.trunc(Number(jt.amount ?? 0));
          if (!(amount > 0)) continue;
          // Prefer owner account as toAddress when jetton wallet is listed
          const toAddress =
            to && addressesEqual(to, accountAddress) ? to : accountAddress;
          out.push({
            network: 'ton',
            txHash: `${eventHash(ev)}:usdt`,
            lt: ev.lt != null ? String(ev.lt) : null,
            currency: 'USDT_TON',
            amount,
            fromAddress: addrField(jt, 'sender') ?? addrField(jt, 'from'),
            toAddress,
            comment: typeof jt.comment === 'string' ? jt.comment.trim() : extractComment(jt),
            confirmations: conf,
            timestamp,
          });
        }
      }
    }

    return out;
  }

  // ── verifyTransaction ────────────────────────────────────────

  async verifyTransaction(input: VerifyTransactionInput): Promise<VerifyTransactionResult> {
    const hash = String(input.txHash ?? '').trim();
    if (!hash || hash.length < 8) {
      return { ok: false, reason: 'invalid_tx_hash' };
    }

    let tx: BlockchainTransaction | undefined;

    // 1) Direct event lookup (strip :usdt suffix used by our indexer)
    const eventId = hash.replace(/:usdt$/i, '');
    try {
      const enc = encodeURIComponent(eventId);
      const ev = await this.tonApiGet<Record<string, unknown>>(`/v2/events/${enc}`);
      const parsed = this.parseEvents([ev], input.accountAddress ?? input.expectedTo ?? '');
      tx =
        parsed.find((t) => t.txHash === hash || t.txHash.startsWith(eventId)) ?? parsed[0];
      if (input.expectedCurrency) {
        tx = parsed.find((t) => t.currency === input.expectedCurrency) ?? tx;
      }
    } catch {
      // fall through to account scan
    }

    // 2) Scan account events
    if (!tx && input.accountAddress) {
      const list = await this.getTransactions(input.accountAddress, { limit: 80 });
      tx = list.find(
        (t) =>
          t.txHash === hash ||
          t.txHash.replace(/:usdt$/i, '') === eventId ||
          hash.startsWith(t.txHash.replace(/:usdt$/i, '').slice(0, 16)),
      );
    }

    if (!tx && input.expectedTo) {
      const list = await this.getTransactions(input.expectedTo, { limit: 80 });
      tx = list.find(
        (t) => t.txHash === hash || t.txHash.replace(/:usdt$/i, '') === eventId,
      );
    }

    if (!tx) return { ok: false, reason: 'transaction_not_found' };

    if (input.expectedCurrency && tx.currency !== input.expectedCurrency) {
      return { ok: false, reason: 'currency_mismatch', transaction: tx };
    }
    if (input.expectedTo && !addressesEqual(tx.toAddress, input.expectedTo)) {
      // For jettons toAddress may be owner; also accept accountAddress match
      if (
        !input.accountAddress ||
        !addressesEqual(tx.toAddress, input.accountAddress)
      ) {
        return { ok: false, reason: 'address_mismatch', transaction: tx };
      }
    }
    if (input.expectedFrom && tx.fromAddress && !addressesEqual(tx.fromAddress, input.expectedFrom)) {
      return { ok: false, reason: 'from_mismatch', transaction: tx };
    }
    if (input.expectedComment != null && tx.comment !== input.expectedComment) {
      return { ok: false, reason: 'comment_mismatch', transaction: tx };
    }
    if (input.expectedAmount != null) {
      const mode = input.amountMode ?? 'exact';
      if (mode === 'exact' && tx.amount !== input.expectedAmount) {
        return { ok: false, reason: 'amount_mismatch', transaction: tx };
      }
      if (mode === 'min' && tx.amount < input.expectedAmount) {
        return { ok: false, reason: 'amount_below_expected', transaction: tx };
      }
    }
    const minConf = input.minConfirmations ?? 1;
    if (tx.confirmations < minConf) {
      return { ok: false, reason: 'insufficient_confirmations', transaction: tx };
    }

    return { ok: true, transaction: tx };
  }

  // ── sendTransaction ──────────────────────────────────────────

  async sendTransaction(input: SendTransactionInput): Promise<SendTransactionResult> {
    if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
      throw new Error('invalid_amount');
    }
    const dest = Address.parse(input.toAddress);
    const { contract, keyPair, address } = await this.openWallet(input.wallet ?? 'hot');
    const seqno = await contract.getSeqno();
    const secretKey = keyPair.secretKey;

    let message;
    if (input.currency === 'TON') {
      let body: Cell | undefined;
      if (input.comment) {
        body = beginCell().storeUint(0, 32).storeStringTail(input.comment).endCell();
      }
      message = internal({
        to: dest,
        value: BigInt(Math.trunc(input.amount)),
        bounce: false,
        body,
      });
    } else {
      const client = this.getRpcClient();
      const master = Address.parse(usdtJettonMaster());
      const jettonWallet = await this.resolveJettonWallet(client, master, address);
      const body = jettonTransferBody({
        amount: BigInt(Math.trunc(input.amount)),
        destination: dest,
        responseTo: address,
        comment: input.comment,
      });
      message = internal({
        to: jettonWallet,
        value: BigInt(jettonTransferGasNanotons()),
        bounce: true,
        body,
      });
    }

    const transfer = contract.createTransfer({
      seqno,
      secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message],
    });

    await contract.send(transfer);

    const txHash = transfer.hash().toString('hex');
    const fromAddress = address.toString({ urlSafe: true, bounceable: false, testOnly: false });

    return {
      network: 'ton',
      txHash,
      fromAddress,
      seqno,
      currency: input.currency,
      amount: Math.trunc(input.amount),
      toAddress: parseTonAddress(input.toAddress).friendly,
    };
  }

  private async openWallet(
    wallet: NonNullable<SendTransactionInput['wallet']>,
  ): Promise<{
    // Opened WalletContractV4 — provider-bound methods from TonClient.open
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contract: any;
    keyPair: { publicKey: Buffer; secretKey: Buffer };
    address: Address;
  }> {
    let publicKey: Buffer;
    let secretKey: Buffer;

    if (wallet === 'hot') {
      const mnemonic = withdrawHotMnemonic();
      if (!mnemonic) {
        throw Object.assign(new Error('Hot wallet not configured (TON_WITHDRAW_HOT_MNEMONIC)'), {
          statusCode: 503,
        });
      }
      const kp = await mnemonicToPrivateKey(mnemonic);
      publicKey = Buffer.from(kp.publicKey);
      secretKey = Buffer.from(kp.secretKey);
    } else if ('mnemonic' in wallet) {
      const kp = await mnemonicToPrivateKey(wallet.mnemonic);
      publicKey = Buffer.from(kp.publicKey);
      secretKey = Buffer.from(kp.secretKey);
    } else {
      publicKey = wallet.publicKey;
      secretKey = wallet.secretKey;
    }

    const w = WalletContractV4.create({ workchain: 0, publicKey });
    const client = this.getRpcClient();
    const contract = client.open(w);
    return { contract, keyPair: { publicKey, secretKey }, address: w.address };
  }

  private async resolveJettonWallet(
    client: TonClient,
    master: Address,
    owner: Address,
  ): Promise<Address> {
    const result = await client.runMethod(master, 'get_wallet_address', [
      { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
    ]);
    return result.stack.readAddress();
  }

  /** Convenience: hot wallet friendly address (or null if not configured). */
  async getHotWalletAddress(): Promise<string | null> {
    try {
      const mnemonic = withdrawHotMnemonic();
      if (!mnemonic) return null;
      const gen = await this.generateAddressFromMnemonic(mnemonic);
      return gen.address;
    } catch {
      return null;
    }
  }

  isCurrency(v: unknown): v is BlockchainCurrency {
    return v === 'TON' || v === 'USDT_TON';
  }
}

/** Process-wide singleton — all chain I/O goes through this instance. */
export const blockchainService = new BlockchainService();
