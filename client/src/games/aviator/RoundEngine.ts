/**
 * @deprecated Import from `./LocalRoundSource` or `./RoundSource`.
 * Kept so older paths (`RoundEngine`) resolve during the RoundSource migration.
 */
export type {
  AviatorPhase,
  RoundSnapshot,
  RoundSource,
  RoundListener,
  PlaceBetResult,
  CashoutResult,
} from './RoundSource';
export { LocalRoundSource, RoundEngine } from './LocalRoundSource';
