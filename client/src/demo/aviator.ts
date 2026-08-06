import type {
  AviatorConfig,
  AviatorPlayerView,
  AviatorRoundView,
  AviatorStateResponse,
  AviatorBetResponse,
  AviatorCashoutResponse,
} from '../types';
import { getDemoBalanceSnapshot, randInt } from './mode';
import { multiplierAt, timeToReachMs } from '../lib/aviatorOdds';

/** Локальный двойник crash-раунда: та же кривая и та же экономика, но без денег. */

const ALLOWED_BETS = [1, 5, 10, 25, 50, 100];
const HOUSE_EDGE = 0.25;
const MAX_CRASH = 100;
const BETTING_MS = 6_000;
const CRASHED_MS = 3_500;
const HISTORY_LEN = 20;
const MY_ID = 0;

const COLORS = ['#5eaee6', '#ff9f43', '#2ecc71', '#e74c3c', '#a78bfa', '#f6c945'] as const;

const BOT_NAMES = [
  'ShadowFox', 'NeonWolf', 'StarHunter', 'LuckyAce', 'FrostBite', 'NightOwl',
  'GoldRush', 'ViperX', 'CosmoKid', 'BlazeRun', 'SilkShot', 'ZeroGravity',
] as const;

const config: AviatorConfig = {
  allowedBets: ALLOWED_BETS,
  maxTotalBetPerPlayer: 500,
  minCashout: 1.01,
  maxCrash: MAX_CRASH,
  bettingWindowMs: BETTING_MS,
};

interface DemoBet {
  userId: number;
  name: string;
  bet: number;
  color: string;
  isBot: boolean;
  autoCashout: number | null;
  cashedOutMult: number | null;
  payout: number;
}

interface DemoRound {
  id: string;
  phase: 'betting' | 'flying' | 'crashed';
  bets: DemoBet[];
  bettingEndsAt: number;
  startedAt: number;
  crashMult: number;
  crashAtWall: number;
  crashedAt: number;
  nextRoundAt: number;
}

let round: DemoRound | null = null;
const history: number[] = [];

function floor2(x: number): number {
  return Math.floor(x * 100) / 100;
}

/** То же распределение, что на сервере: P(crash ≥ m) = (1 − edge)/m. */
function generateCrashPoint(): number {
  if (Math.random() < HOUSE_EDGE) return 1.0;
  const raw = 1 / (1 - Math.random());
  return Math.min(MAX_CRASH, Math.max(1.01, floor2(raw)));
}

function seedBots(r: DemoRound): void {
  const count = 1 + randInt(3);
  const used = new Set(r.bets.map((b) => b.name));
  for (let i = 0; i < count; i++) {
    const pool = BOT_NAMES.filter((n) => !used.has(n));
    const name = (pool.length > 0 ? pool : [...BOT_NAMES])[randInt(pool.length > 0 ? pool.length : BOT_NAMES.length)];
    used.add(name);
    r.bets.push({
      userId: -1 - i,
      name,
      bet: ALLOWED_BETS[randInt(ALLOWED_BETS.length)],
      color: COLORS[r.bets.length % COLORS.length],
      isBot: true,
      autoCashout: floor2(1.2 + Math.random() * 3.8),
      cashedOutMult: null,
      payout: 0,
    });
  }
}

function newRound(now: number): DemoRound {
  const r: DemoRound = {
    id: `demo-av-${now}-${randInt(1e6)}`,
    phase: 'betting',
    bets: [],
    bettingEndsAt: now + BETTING_MS,
    startedAt: 0,
    crashMult: 0,
    crashAtWall: 0,
    crashedAt: 0,
    nextRoundAt: 0,
  };
  seedBots(r);
  return r;
}

function liveMultiplier(r: DemoRound, now: number): number {
  if (r.phase === 'crashed') return r.crashMult;
  if (r.phase !== 'flying') return 1.0;
  return Math.min(multiplierAt(now - r.startedAt), r.crashMult);
}

function cashout(b: DemoBet, mult: number): number {
  if (b.cashedOutMult !== null) return b.payout;
  b.cashedOutMult = mult;
  b.payout = Math.floor(b.bet * mult);
  return b.payout;
}

function tick(now = Date.now()): void {
  if (!round) return;
  const r = round;

  if (r.phase === 'betting' && now >= r.bettingEndsAt) {
    r.phase = 'flying';
    r.startedAt = now;
    r.crashMult = generateCrashPoint();
    r.crashAtWall = now + timeToReachMs(r.crashMult);
  }

  if (r.phase === 'flying') {
    const reached = liveMultiplier(r, now);
    for (const b of r.bets) {
      if (b.cashedOutMult === null && b.autoCashout !== null) {
        if (b.autoCashout < r.crashMult && b.autoCashout <= reached) cashout(b, b.autoCashout);
      }
    }
    if (now >= r.crashAtWall) {
      for (const b of r.bets) {
        if (b.cashedOutMult === null && b.autoCashout !== null && b.autoCashout < r.crashMult) {
          cashout(b, b.autoCashout);
        }
      }
      r.phase = 'crashed';
      r.crashedAt = now;
      r.nextRoundAt = now + CRASHED_MS;
      history.push(r.crashMult);
      if (history.length > HISTORY_LEN) history.shift();
    }
  }

  if (r.phase === 'crashed' && now >= r.nextRoundAt) {
    round = newRound(now);
  }
}

function toView(r: DemoRound, now: number): AviatorRoundView {
  const mine = r.bets.find((b) => b.userId === MY_ID && !b.isBot) ?? null;
  const players: AviatorPlayerView[] = r.bets.map((b) => ({
    userId: b.userId,
    name: b.name,
    bet: b.bet,
    color: b.color,
    isBot: b.isBot,
    autoCashout: b.autoCashout,
    cashedOutMult: b.cashedOutMult,
    payout: b.payout,
    isMe: b.userId === MY_ID && !b.isBot,
  }));

  return {
    roundId: r.id,
    phase: r.phase,
    startedAt: r.phase === 'flying' ? r.startedAt : null,
    bettingEndsAt: r.phase === 'betting' ? r.bettingEndsAt : null,
    nextRoundAt: r.phase === 'crashed' ? r.nextRoundAt : null,
    multiplier: liveMultiplier(r, now),
    crashMultiplier: r.phase === 'crashed' ? r.crashMult : null,
    players,
    myBet: mine?.bet ?? 0,
    myAutoCashout: mine?.autoCashout ?? null,
    myCashedOutMult: mine?.cashedOutMult ?? null,
    myPayout: mine?.payout ?? 0,
    history: [...history],
    config,
  };
}

export function resetDemoAviator(): void {
  round = null;
  history.length = 0;
}

export function demoAviatorState(): AviatorStateResponse {
  const now = Date.now();
  if (!round) round = newRound(now);
  tick(now);
  return {
    round: round ? toView(round, now) : null,
    balance: getDemoBalanceSnapshot(),
    config,
    history: [...history],
    now,
  };
}

export function demoAviatorBet(bet: number, autoCashout: number | null): AviatorBetResponse {
  if (!ALLOWED_BETS.includes(bet)) throw new Error('Некорректная ставка');
  const now = Date.now();
  if (!round) round = newRound(now);
  tick(now);
  const r = round;
  if (r.phase !== 'betting') throw new Error('Ставки закрыты — дождитесь следующего раунда');

  const existing = r.bets.find((b) => b.userId === MY_ID && !b.isBot);
  if (existing) {
    if (existing.bet + bet > config.maxTotalBetPerPlayer) {
      throw new Error(`Максимум ${config.maxTotalBetPerPlayer} звёзд на раунд`);
    }
    existing.bet += bet;
    if (autoCashout !== null) existing.autoCashout = autoCashout;
  } else {
    r.bets.push({
      userId: MY_ID,
      name: 'Вы',
      bet,
      color: COLORS[0],
      isBot: false,
      autoCashout,
      cashedOutMult: null,
      payout: 0,
    });
  }

  return { round: toView(r, now), balance: getDemoBalanceSnapshot(), now };
}

export function demoAviatorCashout(roundId: string): AviatorCashoutResponse {
  const now = Date.now();
  tick(now);
  const r = round;
  if (!r || r.id !== roundId) throw new Error('Раунд уже завершён');
  if (r.phase !== 'flying') throw new Error('Сейчас забрать нельзя');

  const mine = r.bets.find((b) => b.userId === MY_ID && !b.isBot);
  if (!mine) throw new Error('Ставка не найдена');
  if (mine.cashedOutMult !== null) {
    return {
      round: toView(r, now),
      balance: getDemoBalanceSnapshot(),
      payout: mine.payout,
      multiplier: mine.cashedOutMult,
      now,
    };
  }

  const mult = liveMultiplier(r, now);
  if (mult < config.minCashout || mult >= r.crashMult) throw new Error('Опоздали — самолёт улетел');

  const payout = cashout(mine, mult);
  return { round: toView(r, now), balance: getDemoBalanceSnapshot(), payout, multiplier: mult, now };
}
