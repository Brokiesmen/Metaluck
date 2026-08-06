import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  codesToRanks,
  handTotalAndBustFromRanks,
  handValueFromCodes,
  isNaturalBlackjack,
} from './blackjackEngine.js';
import { getSupabase, parseJsonField } from './supabaseStore.js';
import { applyHouseEdge } from './houseEdge.js';
import { onGamePlayXp, onGameWinXp } from './progressAwards.js';
import { XP } from './xp.js';
import {
  CompleteTransaction,
  CreditBalance,
  GetPlayableBalance,
  isPayCurrency,
  ReleaseFunds,
  ReserveAdditional,
  ReserveFunds,
  type GamePayCurrency,
} from './payments/wallet/game.js';

const ALLOWED_BETS = [5, 10, 25, 50, 100] as const;

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const SUITS = ['S', 'H', 'D', 'C'] as const;

const SUIT_SYM: Record<string, string> = {
  S: '\u2660',
  H: '\u2665',
  D: '\u2666',
  C: '\u2663',
};

export type BjPhase = 'player' | 'finished';

export interface BjRowState {
  bet: number;
  /** Wallet reservation — games never see currency. */
  reservationId?: string;
  payCurrency?: GamePayCurrency;
  deck: string[];
  player: string[];
  dealer: string[];
  phase: BjPhase;
  dealerHoleHidden: boolean;
  result?: 'win' | 'lose' | 'push' | 'blackjack' | 'bust';
  payout?: number;
}

const CARD_RE = /^(?:A|[2-9]|10|[JQK])[SHDC]$/;

function isValidCardCode(code: string): boolean {
  return typeof code === 'string' && CARD_RE.test(code);
}

/** Защита от битого JSON / частичных объектов — иначе hit/stand падают с 500. */
function parseStoredState(raw: unknown): BjRowState | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const phase = o.phase;
  const bet = o.bet;
  const deck = o.deck;
  const player = o.player;
  const dealer = o.dealer;
  const dealerHoleHidden = o.dealerHoleHidden;
  if (phase !== 'player' && phase !== 'finished') return null;
  if (typeof bet !== 'number' || bet < 1 || !Number.isFinite(bet)) return null;
  if (!Array.isArray(deck) || !Array.isArray(player) || !Array.isArray(dealer)) return null;
  if (typeof dealerHoleHidden !== 'boolean') return null;
  if (player.length < 1 || dealer.length < 2) return null;
  if (!player.every(isValidCardCode) || !dealer.every(isValidCardCode)) return null;
  for (const c of deck) {
    if (typeof c !== 'string' || !isValidCardCode(c)) return null;
  }
  const st: BjRowState = {
    bet,
    deck: deck as string[],
    player: player as string[],
    dealer: dealer as string[],
    phase,
    dealerHoleHidden,
  };
  if (typeof o.reservationId === 'string' && o.reservationId.length > 0) {
    st.reservationId = o.reservationId;
  }
  if (isPayCurrency(o.payCurrency)) {
    st.payCurrency = o.payCurrency;
  }
  if (o.result !== undefined) {
    const r = o.result;
    if (r === 'win' || r === 'lose' || r === 'push' || r === 'blackjack' || r === 'bust') {
      st.result = r;
    }
  }
  if (o.payout !== undefined && typeof o.payout === 'number' && Number.isFinite(o.payout)) {
    st.payout = o.payout;
  }
  return st;
}

function parseCard(code: string): { rank: string; suit: string } {
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  return { rank, suit };
}

function cardLabel(code: string): string {
  const { rank, suit } = parseCard(code);
  return `${rank}${SUIT_SYM[suit] ?? suit}`;
}

function buildDeck(): string[] {
  const d: string[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      d.push(`${r}${s}`);
    }
  }
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function popCard(deck: string[]): string {
  const c = deck.pop();
  if (!c) throw new Error('DECK_EMPTY');
  return c;
}

function payoutForWin(bet: number): number {
  return applyHouseEdge(bet * 2);
}

function payoutForBlackjack(bet: number): number {
  return applyHouseEdge(Math.floor((bet * 25) / 10));
}

function dealerShouldHit(codes: string[]): boolean {
  return handValueFromCodes(codes) < 17;
}

function playDealer(deck: string[], dealer: string[]): { deck: string[]; dealer: string[] } {
  const d = [...dealer];
  let dk = [...deck];
  while (dealerShouldHit(d)) {
    d.push(popCard(dk));
  }
  return { deck: dk, dealer: d };
}

function settleRound(
  bet: number,
  player: string[],
  dealer: string[],
): { result: BjRowState['result']; payout: number } {
  const pv = handValueFromCodes(player);
  const dv = handValueFromCodes(dealer);
  const pNat = isNaturalBlackjack(player);
  const dNat = isNaturalBlackjack(dealer);

  if (pNat && dNat) return { result: 'push', payout: bet };
  if (pNat && !dNat) return { result: 'blackjack', payout: payoutForBlackjack(bet) };
  if (!pNat && dNat) return { result: 'lose', payout: 0 };

  if (pv > 21) return { result: 'bust', payout: 0 };
  if (dv > 21) return { result: 'win', payout: payoutForWin(bet) };
  if (pv > dv) return { result: 'win', payout: payoutForWin(bet) };
  if (pv < dv) return { result: 'lose', payout: 0 };
  return { result: 'push', payout: bet };
}

async function settleOutcome(
  reservationId: string | undefined,
  result: BjRowState['result'],
  payout: number,
  userId: number,
): Promise<number> {
  if (!reservationId) return GetPlayableBalance(userId);
  if (result === 'push') return (await ReleaseFunds(reservationId)).balance;
  if (result === 'win' || result === 'blackjack') {
    return (await CreditBalance(reservationId, payout)).balance;
  }
  return (await CompleteTransaction(reservationId)).balance;
}

function rowToResponse(state: BjRowState, newBalance: number) {
  const playerCards = state.player.map((code) => ({
    code,
    label: cardLabel(code),
  }));

  let dealerCards: Array<{ code: string; label: string; faceDown?: boolean }>;
  let dealerValue: number | null = null;

  if (state.phase === 'player' && state.dealerHoleHidden) {
    const up = state.dealer[0];
    if (!up) {
      throw new Error('BJ_INVALID_STATE_DEALER');
    }
    dealerCards = [
      { code: up, label: cardLabel(up) },
      { code: 'HIDDEN', label: '', faceDown: true },
    ];
  } else {
    dealerCards = state.dealer.map((code) => ({
      code,
      label: cardLabel(code),
    }));
    dealerValue = handValueFromCodes(state.dealer);
  }

  const dealerUpcardValue =
    state.phase === 'player' && state.dealerHoleHidden && state.dealer[0]
      ? handValueFromCodes([state.dealer[0]])
      : null;

  return {
    newBalance,
    round: {
      phase: state.phase,
      bet: state.bet,
      playerCards,
      playerValue: handValueFromCodes(state.player),
      dealerCards,
      dealerValue,
      /** Очки открытой карты дилера, пока дыра скрыта (для UI «Дилер: 10»). */
      dealerUpcardValue,
      result: state.result ?? null,
      payout: state.payout ?? 0,
    },
  };
}

export function registerBlackjackRoutes(
  app: FastifyInstance,
  deps: {
    getUserId: (req: FastifyRequest) => Promise<number>;
  },
) {
  const { getUserId } = deps;

  async function readState(userId: number): Promise<BjRowState | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('blackjack_games')
      .select('state_json')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`blackjack readState: ${error.message}`);
    if (!data) return null;
    const parsed = parseJsonField<unknown>(data.state_json, null);
    return parseStoredState(parsed);
  }

  async function clearState(userId: number, releaseReservationId?: string | null) {
    if (releaseReservationId) {
      await ReleaseFunds(releaseReservationId).catch(() => undefined);
    }
    const sb = getSupabase();
    const { error } = await sb.from('blackjack_games').delete().eq('user_id', userId);
    if (error) throw new Error(`blackjack clearState: ${error.message}`);
  }

  async function writeState(userId: number, s: BjRowState) {
    const sb = getSupabase();
    const { error } = await sb.from('blackjack_games').upsert(
      { user_id: userId, state_json: s, updated_at: Date.now() },
      { onConflict: 'user_id' },
    );
    if (error) throw new Error(`blackjack writeState: ${error.message}`);
  }

  function jsonError(reply: FastifyReply, statusCode: number, message: string) {
    return reply.status(statusCode).send({ message });
  }

  app.get('/api/blackjack/state', async (req) => {
    const userId = await getUserId(req);
    const s = await readState(userId);
    const bal = await GetPlayableBalance(userId, s?.payCurrency);
    if (!s) return { newBalance: bal, round: null };
    try {
      return rowToResponse(s, bal);
    } catch (err) {
      req.log.warn({ err, userId }, 'blackjack rowToResponse failed, clearing saved game');
      await clearState(userId, s.reservationId);
      return { newBalance: bal, round: null };
    }
  });

  app.post<{ Body: { bet?: number; currency?: string } }>(
    '/api/blackjack/deal',
    {
      schema: {
        body: {
          type: 'object',
          required: ['bet'],
          properties: {
            bet: { type: 'number' },
            currency: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      try {
        const bet = Number(req.body?.bet);
        const currency = req.body?.currency ?? 'STARS';
        if (!ALLOWED_BETS.includes(bet as (typeof ALLOWED_BETS)[number])) {
          return jsonError(reply, 400, 'Некорректная ставка');
        }
        if (!isPayCurrency(currency)) {
          return jsonError(reply, 400, 'Некорректная валюта');
        }

        const existing = await readState(userId);
        if (existing && existing.phase === 'player') {
          return jsonError(reply, 400, 'Сначала завершите текущую партию');
        }

        const reservation = await ReserveFunds(userId, bet, {
          game: 'blackjack',
          refId: crypto.randomUUID(),
          payCurrency: currency,
        });
        if (!reservation) {
          return jsonError(reply, 400, 'Недостаточно средств');
        }

        let deck = shuffle(buildDeck());
        const player: string[] = [popCard(deck), popCard(deck)];
        const dealer: string[] = [popCard(deck), popCard(deck)];
        await onGamePlayXp(userId, 'blackjack');

        let state: BjRowState = {
          bet,
          deck,
          player,
          dealer,
          phase: 'player',
          dealerHoleHidden: true,
          reservationId: reservation.reservationId,
          payCurrency: currency,
        };

        if (isNaturalBlackjack(player)) {
          state.dealerHoleHidden = false;
          if (isNaturalBlackjack(dealer)) {
            const balance = await settleOutcome(state.reservationId, 'push', bet, userId);
            state = {
              ...state,
              phase: 'finished',
              result: 'push',
              payout: bet,
            };
            await writeState(userId, state);
            return rowToResponse(state, balance);
          } else {
            const win = payoutForBlackjack(bet);
            const balance = await settleOutcome(state.reservationId, 'blackjack', win, userId);
            state = {
              ...state,
              phase: 'finished',
              result: 'blackjack',
              payout: win,
            };
            await writeState(userId, state);
            await onGameWinXp(userId, XP.BJ_BLACKJACK, 'blackjack');
            return rowToResponse(state, balance);
          }
        }

        await writeState(userId, state);
        return rowToResponse(state, await GetPlayableBalance(userId, currency));
      } catch (err) {
        req.log.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(reply, 500, msg || 'Ошибка раздачи');
      }
    },
  );

  app.post('/api/blackjack/hit', async (req, reply) => {
    const userId = await getUserId(req);
    try {
      const state = await readState(userId);
      if (!state) {
        return jsonError(reply, 404, 'Игра не найдена. Нажмите «Раздать».');
      }
      if (state.phase !== 'player') {
        return jsonError(reply, 400, 'Нет активного хода. Нажмите «Раздать».');
      }

      let { deck, player, dealer } = state;
      if (deck.length < 1) {
        await clearState(userId, state.reservationId);
        return jsonError(reply, 409, 'Колода повреждена. Нажмите «Раздать» снова.');
      }

      player = [...player, popCard(deck)];

      const { total: pv, bust: playerBust } = handTotalAndBustFromRanks(codesToRanks(player));
      if (playerBust || pv > 21) {
        const finished: BjRowState = {
          ...state,
          deck,
          player,
          dealer,
          phase: 'finished',
          dealerHoleHidden: false,
          result: 'bust',
          payout: 0,
        };
        const balance = await settleOutcome(state.reservationId, 'bust', 0, userId);
        await writeState(userId, finished);
        return rowToResponse(finished, balance);
      }

      if (pv === 21) {
        let dk = deck;
        let dl = dealer;
        const revealed: BjRowState = {
          ...state,
          deck: dk,
          player,
          dealer: dl,
          dealerHoleHidden: false,
          phase: 'player',
        };
        const played = playDealer(dk, dl);
        dk = played.deck;
        dl = played.dealer;
        const { result, payout } = settleRound(state.bet, player, dl);
        const balance = await settleOutcome(state.reservationId, result, payout, userId);
        if (result === 'win') await onGameWinXp(userId, XP.BJ_WIN, 'blackjack');
        if (result === 'blackjack') await onGameWinXp(userId, XP.BJ_BLACKJACK, 'blackjack');
        const done: BjRowState = {
          ...revealed,
          deck: dk,
          dealer: dl,
          phase: 'finished',
          dealerHoleHidden: false,
          result,
          payout,
        };
        await writeState(userId, done);
        return rowToResponse(done, balance);
      }

      const next: BjRowState = { ...state, deck, player };
      await writeState(userId, next);
      return rowToResponse(next, await GetPlayableBalance(userId, state.payCurrency));
    } catch (err) {
      req.log.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'DECK_EMPTY') {
        return jsonError(reply, 409, 'Колода исчерпана. Начните новую партию (Раздать).');
      }
      return jsonError(reply, 500, msg || 'Ошибка хода');
    }
  });

  app.post('/api/blackjack/stand', async (req, reply) => {
    const userId = await getUserId(req);
    try {
      const state = await readState(userId);
      if (!state) {
        return jsonError(reply, 404, 'Игра не найдена. Нажмите «Раздать».');
      }
      if (state.phase !== 'player') {
        return jsonError(reply, 400, 'Нет активного хода. Нажмите «Раздать».');
      }

      let { deck, player, dealer } = state;
      const revealed: BjRowState = {
        ...state,
        deck,
        player,
        dealer,
        dealerHoleHidden: false,
        phase: 'player',
      };
      const played = playDealer(deck, dealer);
      deck = played.deck;
      dealer = played.dealer;
      const { result, payout } = settleRound(state.bet, player, dealer);
      const balance = await settleOutcome(state.reservationId, result, payout, userId);
      if (result === 'win') await onGameWinXp(userId, XP.BJ_WIN, 'blackjack');
      if (result === 'blackjack') await onGameWinXp(userId, XP.BJ_BLACKJACK, 'blackjack');
      const done: BjRowState = {
        ...revealed,
        deck,
        dealer,
        phase: 'finished',
        dealerHoleHidden: false,
        result,
        payout,
      };
      await writeState(userId, done);
      return rowToResponse(done, balance);
    } catch (err) {
      req.log.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'DECK_EMPTY') {
        return jsonError(reply, 409, 'Колода повреждена. Начните новую партию.');
      }
      return jsonError(reply, 500, msg || 'Ошибка хода');
    }
  });

  app.post<{ Body: { currency?: string } }>('/api/blackjack/double', async (req, reply) => {
    const userId = await getUserId(req);
    try {
      const state = await readState(userId);
      if (!state) return jsonError(reply, 404, 'Игра не найдена. Нажмите «Раздать».');
      if (state.phase !== 'player') return jsonError(reply, 400, 'Нет активного хода.');
      if (state.player.length !== 2) return jsonError(reply, 400, 'Удвоение доступно только с двумя картами.');

      if (!state.reservationId) return jsonError(reply, 409, 'Бронь ставки не найдена. Начните новую партию.');
      const currency = req.body?.currency ?? state.payCurrency ?? 'STARS';
      if (!isPayCurrency(currency)) return jsonError(reply, 400, 'Некорректная валюта');

      let { deck } = state;
      if (deck.length < 1) {
        return jsonError(reply, 409, 'Колода исчерпана. Начните новую партию.');
      }

      const reservation = await ReserveAdditional(state.reservationId, state.bet, {
        payCurrency: currency,
      });
      if (!reservation) return jsonError(reply, 400, 'Недостаточно средств для удвоения.');

      const totalBet = state.bet * 2;

      let { player, dealer } = state;
      player = [...player, popCard(deck)];

      const pv = handValueFromCodes(player);
      let result: BjRowState['result'];
      let payout: number;

      if (pv > 21) {
        result = 'bust';
        payout = 0;
      } else {
        const played = playDealer(deck, dealer);
        deck = played.deck;
        dealer = played.dealer;
        const settled = settleRound(totalBet, player, dealer);
        result = settled.result;
        payout = settled.payout;
        if (result === 'win') await onGameWinXp(userId, XP.BJ_WIN, 'blackjack');
        if (result === 'blackjack') await onGameWinXp(userId, XP.BJ_BLACKJACK, 'blackjack');
      }
      const balance = await settleOutcome(state.reservationId, result, payout, userId);

      const done: BjRowState = {
        ...state,
        bet: totalBet,
        deck,
        player,
        dealer,
        phase: 'finished',
        dealerHoleHidden: false,
        result,
        payout,
      };
      await writeState(userId, done);
      return rowToResponse(done, balance);
    } catch (err) {
      req.log.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'DECK_EMPTY') return jsonError(reply, 409, 'Колода исчерпана. Начните новую партию.');
      return jsonError(reply, 500, msg || 'Ошибка удвоения');
    }
  });
}
