import type { ArenaPlayerView, ArenaRoundView, ArenaStateResponse } from '../types';
import { getDemoBalanceSnapshot, randInt } from './mode';

const ALLOWED_BETS = [1, 5, 10, 25, 50, 100];
const MAX_PLAYERS = 5;
const BETTING_MS = 8_000;
const SPIN_MS = 4_500;
const RESULT_MS = 5_000;
const PLAYER_RTP = 0.75;
const COLORS = ['#5eaee6', '#ff9f43', '#2ecc71', '#e74c3c', '#a78bfa', '#f6c945'] as const;

const BOT_NAMES = [
  'ShadowFox',
  'NeonWolf',
  'StarHunter',
  'LuckyAce',
  'FrostBite',
  'NightOwl',
  'GoldRush',
  'ViperX',
  'CosmoKid',
  'BlazeRun',
  'SilkShot',
  'ZeroGravity',
  'PixelKing',
  'IronPulse',
  'NovaSpin',
  'QuickDraw',
  'MoonJack',
  'CrystalBet',
  'TurboLynx',
  'PhantomAce',
] as const;

interface DemoArenaPlayer {
  userId: number;
  name: string;
  bet: number;
  color: string;
  isBot: boolean;
}

interface DemoArenaRound {
  id: string;
  phase: 'betting' | 'spinning' | 'finished';
  players: DemoArenaPlayer[];
  bettingEndsAt: number;
  spinEndsAt: number;
  finishedAt: number;
  winnerId: number | null;
  winnerAngleDeg: number | null;
  payout: number;
  myUserId: number;
}

let round: DemoArenaRound | null = null;

function pot(r: DemoArenaRound): number {
  return r.players.reduce((s, p) => s + p.bet, 0);
}

function segments(r: DemoArenaRound): Array<{ userId: number; start: number; end: number }> {
  const total = pot(r);
  const out: Array<{ userId: number; start: number; end: number }> = [];
  if (total <= 0) return out;
  let acc = 0;
  for (const p of r.players) {
    const start = (acc / total) * 360;
    acc += p.bet;
    out.push({ userId: p.userId, start, end: (acc / total) * 360 });
  }
  return out;
}

function pickWinner(r: DemoArenaRound): DemoArenaPlayer {
  let roll = randInt(pot(r));
  for (const p of r.players) {
    if (roll < p.bet) return p;
    roll -= p.bet;
  }
  return r.players[r.players.length - 1];
}

function angleFor(r: DemoArenaRound, userId: number): number {
  const seg = segments(r).find((s) => s.userId === userId);
  if (!seg) return 0;
  const span = seg.end - seg.start;
  const pad = Math.min(4, span * 0.15);
  const usable = Math.max(span - pad * 2, 0.1);
  return seg.start + pad + usable * Math.random();
}

function makeBots(r: DemoArenaRound): void {
  const free = MAX_PLAYERS - r.players.length;
  if (free <= 0) return;
  const minAdd = r.players.length < 2 ? 1 : 0;
  const add = minAdd + randInt(free - minAdd + 1);
  const used = new Set(r.players.map((p) => p.name));
  for (let i = 0; i < add; i++) {
    const pool = BOT_NAMES.filter((n) => !used.has(n));
    const name = (pool.length > 0 ? pool : [...BOT_NAMES])[randInt(pool.length > 0 ? pool.length : BOT_NAMES.length)];
    used.add(name);
    const bet = ALLOWED_BETS[randInt(ALLOWED_BETS.length)];
    const botCount = r.players.filter((p) => p.isBot).length;
    r.players.push({
      userId: -1 - botCount,
      name,
      bet,
      color: COLORS[r.players.length % COLORS.length],
      isBot: true,
    });
  }
}

function tick(now = Date.now()): void {
  if (!round) return;

  if (round.phase === 'betting' && now >= round.bettingEndsAt) {
    if (round.players.filter((p) => !p.isBot).length >= 1 && round.players.length < 2) {
      makeBots(round);
    }
    if (round.players.length === 0) {
      round = null;
      return;
    }
    const winner = pickWinner(round);
    round.winnerId = winner.userId;
    round.winnerAngleDeg = angleFor(round, winner.userId);
    round.phase = 'spinning';
    round.spinEndsAt = now + SPIN_MS;
  }

  if (round.phase === 'spinning' && now >= round.spinEndsAt) {
    round.phase = 'finished';
    round.finishedAt = now;
    round.payout = Math.floor(pot(round) * PLAYER_RTP);
  }

  if (round.phase === 'finished' && now >= round.finishedAt + RESULT_MS) {
    round = null;
  }
}

function toView(r: DemoArenaRound): ArenaRoundView {
  const total = pot(r);
  const segs = segments(r);
  const winner = r.players.find((p) => p.userId === r.winnerId) ?? null;
  const players: ArenaPlayerView[] = r.players.map((p) => {
    const seg = segs.find((s) => s.userId === p.userId);
    return {
      userId: p.userId,
      name: p.name,
      bet: p.bet,
      color: p.color,
      share: total > 0 ? p.bet / total : 0,
      startDeg: seg?.start ?? 0,
      endDeg: seg?.end ?? 0,
      isBot: p.isBot,
      isMe: p.userId === r.myUserId,
    };
  });

  return {
    roundId: r.id,
    phase: r.phase,
    pot: total,
    bettingEndsAt: r.bettingEndsAt,
    spinEndsAt: r.spinEndsAt,
    players,
    myBet: r.players.find((p) => p.userId === r.myUserId)?.bet ?? 0,
    winnerAngleDeg: r.phase === 'betting' ? null : r.winnerAngleDeg,
    winner:
      r.phase === 'finished' && winner
        ? {
            userId: winner.userId,
            name: winner.name,
            color: winner.color,
            isMe: winner.userId === r.myUserId,
          }
        : null,
    payout: r.phase === 'finished' ? r.payout : 0,
  };
}

export function resetDemoArena(): void {
  round = null;
}

export function demoArenaState(): ArenaStateResponse {
  tick();
  return {
    round: round ? toView(round) : null,
    balance: getDemoBalanceSnapshot(),
    now: Date.now(),
  };
}

export function demoArenaBet(bet: number): ArenaStateResponse {
  if (!ALLOWED_BETS.includes(bet)) throw new Error('Некорректная ставка');
  tick();
  const now = Date.now();
  const myUserId = 0;

  if (!round || round.phase === 'finished') {
    round = {
      id: `demo-ar-${now}-${randInt(1e6)}`,
      phase: 'betting',
      players: [],
      bettingEndsAt: now + BETTING_MS,
      spinEndsAt: 0,
      finishedAt: 0,
      winnerId: null,
      winnerAngleDeg: null,
      payout: 0,
      myUserId,
    };
  }

  if (round.phase !== 'betting') throw new Error('Ставки закрыты');

  const existing = round.players.find((p) => p.userId === myUserId);
  if (!existing && round.players.length >= MAX_PLAYERS) {
    throw new Error('Арена заполнена — дождитесь следующего раунда');
  }
  if (existing) {
    existing.bet += bet;
  } else {
    round.players.push({
      userId: myUserId,
      name: 'Вы',
      bet,
      color: COLORS[0],
      isBot: false,
    });
    // Seed bots shortly after first bet so the wheel looks populated
    if (round.players.length === 1) makeBots(round);
  }

  return demoArenaState();
}
