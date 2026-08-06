import { Address } from '@ton/ton';

/** Normalize TON address to raw `workchain:hex`. */
export function toAddressRaw(addr: string): string {
  const a = Address.parse(addr);
  return `${a.workChain}:${a.hash.toString('hex')}`;
}

export function addressesEqual(a: string, b: string): boolean {
  try {
    return toAddressRaw(a) === toAddressRaw(b);
  } catch {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
}

export function parseTonAddress(addr: string): { friendly: string; raw: string } {
  const a = Address.parse(addr.trim());
  return {
    friendly: a.toString({ urlSafe: true, bounceable: false, testOnly: false }),
    raw: `${a.workChain}:${a.hash.toString('hex')}`,
  };
}

export function toFriendlyAddress(addr: string): string {
  return parseTonAddress(addr).friendly;
}
