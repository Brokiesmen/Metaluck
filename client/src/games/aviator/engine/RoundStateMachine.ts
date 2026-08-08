import type { RoundPhase } from '../transport/types';
import { RoundPhase as Phase } from '../transport/types';

export type PhaseListener = (phase: RoundPhase, prev: RoundPhase) => void;

/**
 * Thin client-side mirror of server round phases for visual reactions.
 * Source of truth remains GameTransport.
 */
export class RoundStateMachine {
  private phase: RoundPhase = Phase.IDLE;
  private listeners = new Set<PhaseListener>();

  get current(): RoundPhase {
    return this.phase;
  }

  subscribe(listener: PhaseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setPhase(next: RoundPhase): void {
    if (next === this.phase) return;
    const prev = this.phase;
    this.phase = next;
    for (const l of this.listeners) l(next, prev);
  }

  reset(): void {
    this.setPhase(Phase.IDLE);
  }
}
