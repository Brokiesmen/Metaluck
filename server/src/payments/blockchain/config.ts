/** TON Blockchain Service configuration (API + RPC + wallet). */

export function tonApiBase(): string {
  return String(process.env.TON_API_BASE ?? 'https://tonapi.io').replace(/\/+$/, '');
}

export function tonApiKey(): string {
  return String(process.env.TONAPI_KEY ?? process.env.TON_API_KEY ?? '').trim();
}

export function tonRpcEndpoint(): string {
  return String(
    process.env.TON_RPC_ENDPOINT ?? 'https://toncenter.com/api/v2/jsonRPC',
  ).trim();
}

export function tonCenterApiKey(): string {
  return String(process.env.TONCENTER_API_KEY ?? process.env.TON_API_KEY ?? '').trim();
}

export function usdtJettonMaster(): string {
  return String(
    process.env.USDT_TON_JETTON_MASTER ?? 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  ).trim();
}

export function jettonTransferGasNanotons(): number {
  const n = Number(process.env.WITHDRAW_JETTON_GAS_NANOTONS ?? 50_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 50_000_000;
}

export function withdrawHotMnemonic(): string[] | null {
  const raw = String(process.env.TON_WITHDRAW_HOT_MNEMONIC ?? '').trim();
  if (!raw) return null;
  const words = raw.split(/\s+/).filter(Boolean);
  return words.length >= 12 ? words : null;
}
