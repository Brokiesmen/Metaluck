import type { FastifyInstance } from 'fastify';
import type { GetUserId } from './helpers.js';
import { httpError } from './helpers.js';
import {
  createLinkChallenge,
  consumeLinkChallenge,
  listLinkedWallets,
  upsertLinkedWallet,
  deleteLinkedWallet,
  type WalletChain,
} from '../payments/walletLink/store.js';
import { verifyTonProof, type TonProofPayload } from '../payments/walletLink/tonProof.js';
import {
  verifyEvmProof,
  buildEvmLinkMessage,
  type EvmProofPayload,
} from '../payments/walletLink/siwe.js';

function evmEnabled(): boolean {
  // Клиентский WalletConnect живёт за projectId; сервер линкует только когда он задан.
  return Boolean(String(process.env.WALLETCONNECT_PROJECT_ID ?? '').trim());
}

function publicWallet(w: {
  id: number;
  chain: WalletChain;
  address: string;
  addressDisplay: string | null;
  verifiedAt: string;
}) {
  return {
    id: w.id,
    chain: w.chain,
    address: w.addressDisplay || w.address,
    verifiedAt: w.verifiedAt,
  };
}

export function registerWalletLinkRoutes(
  app: FastifyInstance,
  deps: { getUserId: GetUserId },
): void {
  const { getUserId } = deps;

  const rl = { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } };

  /** Список привязанных кошельков текущего аккаунта. */
  app.get('/api/wallet-link', async (req) => {
    const accountId = await getUserId(req);
    const wallets = await listLinkedWallets(accountId);
    return { wallets: wallets.map(publicWallet), evmEnabled: evmEnabled() };
  });

  /** Выдать challenge-nonce для доказательства владения. */
  app.get<{ Querystring: { chain?: string } }>(
    '/api/wallet-link/challenge',
    rl,
    async (req, reply) => {
      const accountId = await getUserId(req);
      const chain = String(req.query?.chain ?? '').trim() as WalletChain;
      if (chain !== 'ton' && chain !== 'evm') throw httpError(400, 'bad chain');
      if (chain === 'evm' && !evmEnabled()) {
        return reply.status(503).send({ message: 'EVM linking is not configured' });
      }
      const { nonce, expiresAt } = await createLinkChallenge(accountId, chain);
      return { nonce, expiresAt };
    },
  );

  /** Привязать TON-кошелёк по ton_proof. */
  app.post<{ Body: TonProofPayload }>('/api/wallet-link/ton', rl, async (req, reply) => {
    const accountId = await getUserId(req);
    const body = req.body;
    const nonce = String(body?.proof?.payload ?? '');
    if (!(await consumeLinkChallenge(nonce, accountId, 'ton'))) {
      return reply.status(400).send({ message: 'invalid or expired challenge' });
    }
    let verified;
    try {
      verified = await verifyTonProof(body);
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.message : err }, '[wallet-link] ton verify failed');
      return reply.status(400).send({ message: 'proof verification failed' });
    }
    const res = await upsertLinkedWallet({
      accountId,
      chain: 'ton',
      address: verified.addressRaw,
      addressDisplay: verified.addressFriendly,
      publicKey: verified.publicKey,
    });
    if (!res.ok) return reply.status(409).send({ message: 'wallet already linked to another account' });
    return { wallet: publicWallet(res.wallet) };
  });

  /** Привязать EVM-кошелёк по personal_sign. */
  app.post<{ Body: EvmProofPayload }>('/api/wallet-link/evm', rl, async (req, reply) => {
    if (!evmEnabled()) return reply.status(503).send({ message: 'EVM linking is not configured' });
    const accountId = await getUserId(req);
    const body = req.body;
    const nonce = String(body?.nonce ?? '');
    if (!(await consumeLinkChallenge(nonce, accountId, 'evm'))) {
      return reply.status(400).send({ message: 'invalid or expired challenge' });
    }
    let verified;
    try {
      verified = await verifyEvmProof(body);
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.message : err }, '[wallet-link] evm verify failed');
      return reply.status(400).send({ message: 'proof verification failed' });
    }
    const res = await upsertLinkedWallet({
      accountId,
      chain: 'evm',
      address: verified.address,
      addressDisplay: verified.addressDisplay,
    });
    if (!res.ok) return reply.status(409).send({ message: 'wallet already linked to another account' });
    return { wallet: publicWallet(res.wallet) };
  });

  /** Отвязать кошелёк. */
  app.delete<{ Params: { id: string } }>('/api/wallet-link/:id', rl, async (req, reply) => {
    const accountId = await getUserId(req);
    const id = Number(req.params?.id);
    if (!Number.isFinite(id) || id <= 0) throw httpError(400, 'bad id');
    const ok = await deleteLinkedWallet(accountId, id);
    if (!ok) return reply.status(404).send({ message: 'not found' });
    return { ok: true as const };
  });

  // Хелпер для клиента: собрать текст EVM-сообщения (чтобы подпись совпала).
  app.get<{ Querystring: { address?: string; nonce?: string } }>(
    '/api/wallet-link/evm/message',
    rl,
    async (req, reply) => {
      if (!evmEnabled()) return reply.status(503).send({ message: 'EVM linking is not configured' });
      await getUserId(req);
      const address = String(req.query?.address ?? '').trim();
      const nonce = String(req.query?.nonce ?? '').trim();
      if (!address || !nonce) throw httpError(400, 'missing params');
      const domain = (() => {
        try {
          return new URL(String(process.env.WEB_APP_URL ?? 'https://metaluck-eight.vercel.app')).host;
        } catch {
          return 'metaluck-eight.vercel.app';
        }
      })();
      const message = buildEvmLinkMessage({
        address,
        nonce,
        domain,
        issuedAt: new Date().toISOString(),
      });
      return { message };
    },
  );
}
