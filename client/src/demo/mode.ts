/** Module-level demo flag (usable from api.ts outside React). */

const STORAGE_KEY = 'metaluck_demo_mode';

let demoMode = false;
let balanceSnapshot = 0;

try {
  demoMode = localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  /* ignore */
}

type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

export function isDemoMode(): boolean {
  return demoMode;
}

export function setDemoMode(on: boolean): void {
  demoMode = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn(on));
}

export function subscribeDemoMode(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Real user balance — demo responses always echo this unchanged. */
export function setDemoBalanceSnapshot(balance: number): void {
  balanceSnapshot = Math.max(0, Math.floor(balance));
}

export function getDemoBalanceSnapshot(): number {
  return balanceSnapshot;
}

export function delay(ms = 40): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}
