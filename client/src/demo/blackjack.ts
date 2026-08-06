import type { BlackjackPublicCard, BlackjackStateResponse } from '../types';
import { getDemoBalanceSnapshot, randInt } from './mode';

type BjResult = 'win' | 'lose' | 'push' | 'blackjack' | 'bust';
type BjPhase = 'player' | 'finished';

interface BjState {
  bet: number;
  deck: string[];
  player: string[];
  dealer: string[];
  phase: BjPhase;
  dealerHoleHidden: boolean;
  result?: BjResult;
  payout?: number;
}

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const SUITS = ['S', 'H', 'D', 'C'] as const;
const SUIT_SYM: Record<string, string> = {
  S: '\u2660',
  H: '\u2665',
  D: '\u2666',
  C: '\u2663',
};
const PLAYER_RTP = 0.75;
const ALLOWED_BETS = [5, 10, 25, 50, 100];

let state: BjState | null = null;

function handValue(codes: string[]): { total: number; bust: boolean } {
  let total = 0;
  let aces = 0;
  for (const code of codes) {
    const r = code.slice(0, -1);
    if (r === 'A') {
      aces += 1;
      total += 11;
    } else if (r === 'J' || r === 'Q' || r === 'K' || r === '10') {
      total += 10;
    } else {
      total += Number(r) || 0;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, bust: total > 21 };
}

function isNatural(codes: string[]): boolean {
  if (codes.length !== 2) return false;
  const { total, bust } = handValue(codes);
  return total === 21 && !bust;
}

function cardLabel(code: string): string {
  return `${code.slice(0, -1)}${SUIT_SYM[code.slice(-1)] ?? code.slice(-1)}`;
}

function toPublic(code: string, faceDown?: boolean): BlackjackPublicCard {
  if (faceDown) return { code: 'HIDDEN', label: '', faceDown: true };
  return { code, label: cardLabel(code) };
}

function buildDeck(): string[] {
  const d: string[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push(`${r}${s}`);
  return d;
}

function shuffle(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pop(deck: string[]): string {
  const c = deck.pop();
  if (!c) throw new Error('Колода пуста');
  return c;
}

function applyEdge(payout: number): number {
  return Math.floor(payout * PLAYER_RTP);
}

function payoutWin(bet: number): number {
  return applyEdge(bet * 2);
}

function payoutBj(bet: number): number {
  return applyEdge(Math.floor((bet * 25) / 10));
}

function settle(bet: number, player: string[], dealer: string[]): { result: BjResult; payout: number } {
  const pv = handValue(player).total;
  const dv = handValue(dealer).total;
  const pNat = isNatural(player);
  const dNat = isNatural(dealer);
  if (pNat && dNat) return { result: 'push', payout: bet };
  if (pNat && !dNat) return { result: 'blackjack', payout: payoutBj(bet) };
  if (!pNat && dNat) return { result: 'lose', payout: 0 };
  if (pv > 21) return { result: 'bust', payout: 0 };
  if (dv > 21) return { result: 'win', payout: payoutWin(bet) };
  if (pv > dv) return { result: 'win', payout: payoutWin(bet) };
  if (pv < dv) return { result: 'lose', payout: 0 };
  return { result: 'push', payout: bet };
}

function playDealer(deck: string[], dealer: string[]): { deck: string[]; dealer: string[] } {
  const d = [...dealer];
  let dk = [...deck];
  while (handValue(d).total < 17) d.push(pop(dk));
  return { deck: dk, dealer: d };
}

function toResponse(s: BjState): BlackjackStateResponse {
  const bal = getDemoBalanceSnapshot();
  let dealerCards: BlackjackPublicCard[];
  let dealerValue: number | null = null;
  let dealerUpcardValue: number | null = null;

  if (s.phase === 'player' && s.dealerHoleHidden) {
    dealerCards = [toPublic(s.dealer[0]), toPublic(s.dealer[1], true)];
    dealerUpcardValue = handValue([s.dealer[0]]).total;
  } else {
    dealerCards = s.dealer.map((c) => toPublic(c));
    dealerValue = handValue(s.dealer).total;
  }

  return {
    newBalance: bal,
    round: {
      phase: s.phase,
      bet: s.bet,
      playerCards: s.player.map((c) => toPublic(c)),
      playerValue: handValue(s.player).total,
      dealerCards,
      dealerValue,
      dealerUpcardValue,
      result: s.result ?? null,
      payout: s.payout ?? 0,
    },
  };
}

export function resetDemoBlackjack(): void {
  state = null;
}

export function demoBlackjackState(): BlackjackStateResponse {
  if (!state) return { newBalance: getDemoBalanceSnapshot(), round: null };
  return toResponse(state);
}

export function demoBlackjackDeal(bet: number): BlackjackStateResponse {
  if (!ALLOWED_BETS.includes(bet)) throw new Error('Некорректная ставка');
  if (state?.phase === 'player') throw new Error('Сначала завершите текущую партию');

  let deck = shuffle(buildDeck());
  const player = [pop(deck), pop(deck)];
  const dealer = [pop(deck), pop(deck)];

  let next: BjState = {
    bet,
    deck,
    player,
    dealer,
    phase: 'player',
    dealerHoleHidden: true,
  };

  if (isNatural(player)) {
    next.dealerHoleHidden = false;
    if (isNatural(dealer)) {
      next = { ...next, phase: 'finished', result: 'push', payout: bet };
    } else {
      next = { ...next, phase: 'finished', result: 'blackjack', payout: payoutBj(bet) };
    }
  }

  state = next;
  return toResponse(state);
}

export function demoBlackjackHit(): BlackjackStateResponse {
  if (!state || state.phase !== 'player') throw new Error('Нет активного хода');
  const player = [...state.player, pop(state.deck)];
  const { total, bust } = handValue(player);

  if (bust || total > 21) {
    state = {
      ...state,
      player,
      phase: 'finished',
      dealerHoleHidden: false,
      result: 'bust',
      payout: 0,
    };
    return toResponse(state);
  }

  if (total === 21) {
    const played = playDealer(state.deck, state.dealer);
    const settled = settle(state.bet, player, played.dealer);
    state = {
      ...state,
      deck: played.deck,
      player,
      dealer: played.dealer,
      dealerHoleHidden: false,
      phase: 'finished',
      result: settled.result,
      payout: settled.payout,
    };
    return toResponse(state);
  }

  state = { ...state, player };
  return toResponse(state);
}

export function demoBlackjackStand(): BlackjackStateResponse {
  if (!state || state.phase !== 'player') throw new Error('Нет активного хода');
  const played = playDealer(state.deck, state.dealer);
  const settled = settle(state.bet, state.player, played.dealer);
  state = {
    ...state,
    deck: played.deck,
    dealer: played.dealer,
    dealerHoleHidden: false,
    phase: 'finished',
    result: settled.result,
    payout: settled.payout,
  };
  return toResponse(state);
}

export function demoBlackjackDouble(): BlackjackStateResponse {
  if (!state || state.phase !== 'player') throw new Error('Нет активного хода');
  if (state.player.length !== 2) throw new Error('Удвоение только с двумя картами');
  const bet = state.bet * 2;
  const player = [...state.player, pop(state.deck)];
  const { bust } = handValue(player);
  if (bust) {
    state = {
      ...state,
      bet,
      player,
      phase: 'finished',
      dealerHoleHidden: false,
      result: 'bust',
      payout: 0,
    };
    return toResponse(state);
  }
  const played = playDealer(state.deck, state.dealer);
  const settled = settle(bet, player, played.dealer);
  state = {
    ...state,
    bet,
    deck: played.deck,
    player,
    dealer: played.dealer,
    dealerHoleHidden: false,
    phase: 'finished',
    result: settled.result,
    payout: settled.payout,
  };
  return toResponse(state);
}
