import type {
  MineRushCashoutResult,
  MineRushDifficulty,
  MineRushGameView,
  MineRushRevealResult,
} from '../types';
import { getDemoBalanceSnapshot, randInt } from './mode';
import {
  ALLOWED_BETS,
  GRID_SIZE,
  mineCountFor,
  payoutForCashout,
  payoutForWin,
} from '../lib/mineRushOdds';

interface DemoMrGame {
  gameId: string;
  bet: number;
  difficulty: MineRushDifficulty;
  mines: Set<string>;
  revealed: Set<string>;
  flags: Set<string>;
  status: 'active' | 'lost' | 'won' | 'cashed';
  score: number;
  startedAt: number;
  firstClick: boolean;
}

let game: DemoMrGame | null = null;

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function generateMines(count: number, avoid?: { x: number; y: number }): Set<string> {
  const mines = new Set<string>();
  const max = GRID_SIZE * GRID_SIZE;
  while (mines.size < count) {
    const idx = randInt(max);
    const x = idx % GRID_SIZE;
    const y = Math.floor(idx / GRID_SIZE);
    if (avoid && x === avoid.x && y === avoid.y) continue;
    mines.add(key(x, y));
  }
  return mines;
}

function countAdjacent(mines: Set<string>, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      if (mines.has(key(nx, ny))) n++;
    }
  }
  return n;
}

function floodReveal(mines: Set<string>, revealed: Set<string>, x: number, y: number): void {
  const stack = [{ x, y }];
  while (stack.length) {
    const cur = stack.pop()!;
    const ck = key(cur.x, cur.y);
    if (revealed.has(ck) || mines.has(ck)) continue;
    revealed.add(ck);
    if (countAdjacent(mines, cur.x, cur.y) === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
          const nk = key(nx, ny);
          if (!revealed.has(nk) && !mines.has(nk)) stack.push({ x: nx, y: ny });
        }
      }
    }
  }
}

function toView(g: DemoMrGame): MineRushGameView {
  const cells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const k = key(x, y);
      if (!g.revealed.has(k)) {
        cells.push({ key: k, state: 'hidden' as const });
      } else if (g.mines.has(k)) {
        cells.push({ key: k, state: 'mine' as const });
      } else {
        cells.push({ key: k, state: 'number' as const, value: countAdjacent(g.mines, x, y) });
      }
    }
  }
  return {
    gameId: g.gameId,
    bet: g.bet,
    difficulty: g.difficulty,
    status: g.status,
    score: g.score,
    balance: getDemoBalanceSnapshot(),
    mineCount: g.mines.size,
    gridSize: GRID_SIZE,
    flags: [...g.flags],
    cells,
    startedAt: g.startedAt,
  };
}

export function resetDemoMineRush(): void {
  game = null;
}

export function demoMineRushState(): { game: MineRushGameView | null; balance: number } {
  const balance = getDemoBalanceSnapshot();
  if (!game || game.status !== 'active') return { game: null, balance };
  return { game: toView(game), balance };
}

export function demoMineRushStart(difficulty: MineRushDifficulty, bet: number): MineRushGameView {
  if (!(ALLOWED_BETS as readonly number[]).includes(bet)) throw new Error('Некорректная ставка');
  if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
    throw new Error('Выберите сложность');
  }
  if (game?.status === 'active') throw new Error('Завершите текущую игру');

  const count = mineCountFor(difficulty, bet);
  game = {
    gameId: `demo-mr-${Date.now()}-${randInt(1e6)}`,
    bet,
    difficulty,
    mines: generateMines(count),
    revealed: new Set(),
    flags: new Set(),
    status: 'active',
    score: 0,
    startedAt: Date.now(),
    firstClick: false,
  };
  return toView(game);
}

export function demoMineRushReveal(gameId: string, x: number, y: number): MineRushRevealResult {
  if (!game || game.gameId !== gameId || game.status !== 'active') {
    throw new Error('Игра не найдена');
  }
  const k = key(x, y);
  if (game.flags.has(k)) throw new Error('Снимите флаг');
  if (game.revealed.has(k)) return { ...toView(game), exploded: null };

  if (!game.firstClick) {
    if (game.mines.has(k)) {
      game.mines = generateMines(mineCountFor(game.difficulty, game.bet), { x, y });
    }
    game.firstClick = true;
  }

  let exploded: string | null = null;
  if (game.mines.has(k)) {
    game.revealed.add(k);
    game.status = 'lost';
    exploded = k;
  } else {
    floodReveal(game.mines, game.revealed, x, y);
    game.score = game.revealed.size;
    const safe = GRID_SIZE * GRID_SIZE - game.mines.size;
    if (game.score >= safe) {
      game.status = 'won';
    }
  }

  return { ...toView(game), exploded };
}

export function demoMineRushFlag(gameId: string, x: number, y: number): MineRushGameView {
  if (!game || game.gameId !== gameId || game.status !== 'active') {
    throw new Error('Игра не найдена');
  }
  const k = key(x, y);
  if (game.revealed.has(k)) return toView(game);
  if (game.flags.has(k)) game.flags.delete(k);
  else game.flags.add(k);
  return toView(game);
}

export function demoMineRushCashout(gameId: string): MineRushCashoutResult {
  if (!game || game.gameId !== gameId || game.status !== 'active') {
    throw new Error('Игра не найдена');
  }
  if (game.score <= 0) throw new Error('Откройте хотя бы одну клетку');
  const payout = payoutForCashout(game.bet, game.score, game.mines.size, game.difficulty);
  game.status = 'cashed';
  return { ...toView(game), payout };
}

export function demoMineRushWinPayoutHint(g: DemoMrGame): number {
  return payoutForWin(g.bet, g.difficulty);
}
