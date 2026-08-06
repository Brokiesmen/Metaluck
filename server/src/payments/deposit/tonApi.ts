import { tonApiBase, tonApiKey, usdtJettonMaster } from './config.js';

export interface ChainTransferMatch {
  txHash: string;
  amount: number;
  comment: string | null;
  confirmations: number;
  lt: string | null;
}

function authHeaders(): Record<string, string> {
  const key = tonApiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
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

function eventHash(ev: Record<string, unknown>): string {
  const h = ev.event_id ?? ev.hash ?? ev.tx_hash;
  if (typeof h === 'string' && h) return h;
  const lt = ev.lt ?? ev.logical_time;
  return `lt:${String(lt ?? Date.now())}`;
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
  const base = tonApiBase();
  const addr = encodeURIComponent(args.toAddress);
  const url = `${base}/v2/accounts/${addr}/events?limit=50`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...authHeaders() },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`TON API error ${res.status}`);
  }
  const body = (await res.json()) as { events?: unknown[] };
  const events = Array.isArray(body.events) ? body.events : [];

  for (const raw of events) {
    if (!raw || typeof raw !== 'object') continue;
    const ev = raw as Record<string, unknown>;
    const actions = Array.isArray(ev.actions) ? ev.actions : [];
    for (const action of actions) {
      if (!action || typeof action !== 'object') continue;
      const a = action as Record<string, unknown>;
      const type = String(a.type ?? '');
      if (type !== 'TonTransfer') continue;
      const tonTransfer = (a.TonTransfer ?? a.ton_transfer) as Record<string, unknown> | undefined;
      if (!tonTransfer) continue;
      const comment =
        typeof tonTransfer.comment === 'string'
          ? tonTransfer.comment.trim()
          : extractComment(tonTransfer);
      if (comment !== args.memo) continue;
      const amount = Number(tonTransfer.amount ?? 0);
      if (!Number.isFinite(amount) || amount < args.minAmount) continue;
      const confirmations = Number(ev.confirmations ?? (ev.is_pending ? 0 : 1));
      return {
        txHash: eventHash(ev),
        amount: Math.trunc(amount),
        comment,
        confirmations: Number.isFinite(confirmations) ? Math.max(0, Math.trunc(confirmations)) : 1,
        lt: ev.lt != null ? String(ev.lt) : null,
      };
    }
  }
  return null;
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
  const base = tonApiBase();
  const master = usdtJettonMaster().toLowerCase();
  const addr = encodeURIComponent(args.toAddress);
  const url = `${base}/v2/accounts/${addr}/events?limit=50`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...authHeaders() },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`TON API error ${res.status}`);
  }
  const body = (await res.json()) as { events?: unknown[] };
  const events = Array.isArray(body.events) ? body.events : [];

  for (const raw of events) {
    if (!raw || typeof raw !== 'object') continue;
    const ev = raw as Record<string, unknown>;
    const actions = Array.isArray(ev.actions) ? ev.actions : [];
    for (const action of actions) {
      if (!action || typeof action !== 'object') continue;
      const a = action as Record<string, unknown>;
      if (String(a.type ?? '') !== 'JettonTransfer') continue;
      const jt = (a.JettonTransfer ?? a.jetton_transfer) as Record<string, unknown> | undefined;
      if (!jt) continue;

      const jetton = jt.jetton as Record<string, unknown> | undefined;
      const jettonAddr = String(jetton?.address ?? jt.jetton_address ?? '').toLowerCase();
      if (master && jettonAddr && !jettonAddr.includes(master.replace(/^eq/i, '').toLowerCase()) && jettonAddr !== master) {
        // Compare loosely — tonapi may return friendly or raw forms
        const norm = (s: string) => s.replace(/^0:/, '').toLowerCase();
        if (norm(jettonAddr) !== norm(master) && !jettonAddr.endsWith(master.slice(-10).toLowerCase())) {
          // Still accept if symbol is USD₮ / USDT
          const symbol = String(jetton?.symbol ?? '').toUpperCase();
          if (symbol !== 'USD₮' && symbol !== 'USDT') continue;
        }
      }

      const comment =
        typeof jt.comment === 'string'
          ? jt.comment.trim()
          : extractComment(jt);
      if (comment !== args.memo) continue;

      const amount = Number(jt.amount ?? 0);
      if (!Number.isFinite(amount) || amount < args.minAmount) continue;

      const confirmations = Number(ev.confirmations ?? (ev.is_pending ? 0 : 1));
      return {
        txHash: eventHash(ev),
        amount: Math.trunc(amount),
        comment,
        confirmations: Number.isFinite(confirmations) ? Math.max(0, Math.trunc(confirmations)) : 1,
        lt: ev.lt != null ? String(ev.lt) : null,
      };
    }
  }
  return null;
}
