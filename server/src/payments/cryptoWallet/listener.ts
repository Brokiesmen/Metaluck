import {
  listenerActiveWindowMs,
  listenerBatchSize,
  listenerIntervalMs,
  isCryptoWalletEnabled,
} from './config.js';
import { listActiveAddresses, markAddressScanned } from './store.js';
import { listInboundTransfers } from './tonScanner.js';
import { ingestTransfers, processPendingCredits } from './transactionService.js';
import { processPendingWithdrawals } from './withdrawProcessor.js';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/**
 * Blockchain Listener — polls active per-user deposit addresses, then
 * Transaction Service credits confirmed amounts into Wallet Balance.
 * Also processes pending crypto withdrawals (hot wallet send).
 */
export async function runCryptoListenerTick(): Promise<void> {
  if (!isCryptoWalletEnabled()) return;
  if (running) return;
  running = true;
  try {
    const since = new Date(Date.now() - listenerActiveWindowMs()).toISOString();
    const addresses = await listActiveAddresses({
      sinceIso: since,
      limit: listenerBatchSize(),
    });

    for (const addr of addresses) {
      try {
        const transfers = await listInboundTransfers({ toAddress: addr.address, limit: 40 });
        await ingestTransfers(addr, transfers);
        const maxLt = transfers.reduce<string | null>((acc, t) => {
          if (!t.lt) return acc;
          if (!acc) return t.lt;
          return t.lt > acc ? t.lt : acc;
        }, addr.lastLt);
        await markAddressScanned(addr.id, maxLt);
      } catch (err) {
        console.warn(
          '[crypto-listener] scan failed',
          addr.address,
          err instanceof Error ? err.message : err,
        );
      }
    }

    const result = await processPendingCredits();
    if (result.credited > 0 || result.failed > 0) {
      console.log(
        `[crypto-listener] credited=${result.credited} failed=${result.failed} scanned=${addresses.length}`,
      );
    }

    const w = await processPendingWithdrawals();
    if (w.completed > 0 || w.failed > 0 || w.reconcile > 0) {
      console.log(
        `[crypto-withdraw] completed=${w.completed} failed=${w.failed} reconcile=${w.reconcile}`,
      );
    }
  } finally {
    running = false;
  }
}

export function startCryptoDepositListener(): void {
  if (timer) return;
  if (!isCryptoWalletEnabled()) {
    console.warn('[crypto-listener] disabled — set TON_DEPOSIT_MASTER_SEED to enable');
    return;
  }
  const ms = listenerIntervalMs();
  console.log(`[crypto-listener] started interval=${ms}ms`);
  void runCryptoListenerTick();
  timer = setInterval(() => {
    void runCryptoListenerTick();
  }, ms);
  if (typeof timer === 'object' && 'unref' in timer) {
    timer.unref();
  }
}

export function stopCryptoDepositListener(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
