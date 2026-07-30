import type {
  Prize,
  Case,
  TopupPackage,
  LeaderPage,
  HistoryPage,
  BlackjackStateResponse,
  CoinflipResult,
  CoinSide,
  MineRushDifficulty,
  MineRushGameView,
  MineRushRevealResult,
  MineRushCashoutResult,
  ArenaStateResponse,
} from './types';

let _initData = '';
export function setInitData(d: string) { _initData = d; }

/**
 * База для API. Пустая строка = относительные `/api/...` (тот же origin — правильно для туннеля,
 * если и фронт, и API отдаёт один процесс/nginx на одном домене).
 * Для отдельного домена API задайте VITE_API_BASE_URL при сборке или window.__MINIGAMES_API_BASE__ в index.html.
 */
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.__MINIGAMES_API_BASE__ != null && window.__MINIGAMES_API_BASE__ !== '') {
    return String(window.__MINIGAMES_API_BASE__).trim().replace(/\/$/, '');
  }
  return String(import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/$/, '');
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBase()}${path}`;
}

function contentTypeLooksJson(ct: string): boolean {
  const c = ct.toLowerCase();
  return c.includes('application/json') || c.includes('+json');
}

function bodyLooksJson(raw: string): boolean {
  const t = raw.trimStart();
  return t.startsWith('{') || t.startsWith('[');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(resolveUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Send Telegram initData so server knows who is making the request
        'X-Telegram-Init-Data': _initData,
        ...(options?.headers ?? {}),
      },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const isNetwork =
      reason.includes('Failed to fetch') ||
      reason.includes('NetworkError') ||
      reason.includes('Network request failed') ||
      reason.includes('LOAD_FAILED') ||
      reason.includes('ECONNREFUSED');
    const hint = isNetwork
      ? ' Запустите бэкенд (из папки minigames: npm run dev — сервер и Vite вместе; или только server: npm run dev). Клиент открывайте с dev-сервера (http://127.0.0.1:5173), не через vite preview. Проверка: в браузере http://127.0.0.1:3001/api/health — должен ответить JSON с ok. Если страница по https, а API по http — браузер может блокировать запросы.'
      : '';
    throw new Error(
      `Нет соединения с API (${reason}).${hint}`,
    );
  }

  // Vite proxy при выключенном бэкенде часто отдаёт 502/504 с HTML
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error(
      'Прокси не достучался до бэкенда (порт 3001). Запустите сервер: в папке server — npm run dev, или из корня minigames — npm run dev.',
    );
  }

  const raw = await res.text();
  const ct = res.headers.get('content-type') ?? '';
  const head = raw.trimStart().slice(0, 80);

  if (head.startsWith('<!') || head.toLowerCase().startsWith('<html')) {
    throw new Error(
      'Сервер вернул HTML вместо JSON (часто index.html или 404 nginx). Проверьте: 1) URL мини-приложения = тот же origin, что и API, или задайте VITE_API_BASE_URL; 2) location /api проксирует на бэкенд, а не на try_files /index.html; 3) бэкенд запущен на 3001.',
    );
  }

  const allowParse = contentTypeLooksJson(ct) || bodyLooksJson(raw);
  if (!allowParse) {
    throw new Error(raw.slice(0, 200) || 'Некорректный ответ сервера (ожидался JSON)');
  }

  let data: { message?: string };
  try {
    data = JSON.parse(raw) as { message?: string };
  } catch {
    throw new Error('Некорректный JSON в ответе сервера');
  }

  if (!res.ok) throw new Error(data.message ?? `Ошибка ${res.status}`);
  return data as T;
}

export const api = {
  getBalance: () =>
    request<{ balance: number }>('/api/balance').then(d => d.balance),

  getPrizes: () =>
    request<{ prizes: Prize[] }>('/api/prizes').then(d => d.prizes),

  getCases: () =>
    request<{ cases: Case[] }>('/api/cases').then(d => d.cases),

  getHistory: (page = 0, limit = 20) =>
    request<HistoryPage>(`/api/history?page=${page}&limit=${limit}`),

  getLeaders: (page = 0, limit = 50) =>
    request<LeaderPage>(`/api/leaders?page=${page}&limit=${limit}`),

  getDailyStatus: () =>
    request<{ currentDay: number; canClaim: boolean; nextClaimAt: number; claimedDays: boolean[] }>('/api/daily/status'),

  claimDaily: () =>
    request<{ prize: { id: number; name: string; rarity: string; icon: string; stars?: number }; newBalance: number; day: number }>('/api/daily/claim', { method: 'POST', body: '{}' }),

  getReferralStatus: () =>
    request<{
      code: string;
      link: string | null;
      referredBy: number | null;
      referredCount: number;
      totalEarned: number;
      rewardPerInvite: number;
      cashbackPercent: number;
    }>('/api/referral/status'),

  activateReferral: (code: string) =>
    request<{ success: boolean; reward: number }>('/api/referral/activate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getTopupPackages: () =>
    request<{ packages: TopupPackage[] }>('/api/topup/packages').then(d => d.packages),

  createTopupInvoice: (packageId: string) =>
    request<{ invoiceLink: string; payload: string }>('/api/topup/create-invoice', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    }),

  getTopupStatus: (payload: string) =>
    request<{ status: string; balanceAmount: number; newBalance: number | null }>(
      `/api/topup/status/${encodeURIComponent(payload)}`
    ),

  getWithdrawInfo: () =>
    request<{
      balance: number;
      minAmount: number;
      presets: number[];
      recent: { id: number; amount: number; status: string; createdAt: number }[];
    }>('/api/withdraw/info'),

  createWithdraw: (amount: number) =>
    request<{ ok: boolean; orderId: number; amount: number; status: string; newBalance: number }>(
      '/api/withdraw/create',
      { method: 'POST', body: JSON.stringify({ amount }) },
    ),

  openCase: (caseId: number) =>
    request<{ prize: Prize; newBalance: number }>('/api/case/open', {
      method: 'POST',
      body: JSON.stringify({ caseId }),
    }),

  getBlackjackState: () => request<BlackjackStateResponse>('/api/blackjack/state'),

  blackjackDeal: (bet: number) =>
    request<BlackjackStateResponse>('/api/blackjack/deal', {
      method: 'POST',
      body: JSON.stringify({ bet }),
    }),

  blackjackHit: () =>
    request<BlackjackStateResponse>('/api/blackjack/hit', {
      method: 'POST',
      body: '{}',
    }),

  blackjackStand: () =>
    request<BlackjackStateResponse>('/api/blackjack/stand', {
      method: 'POST',
      body: '{}',
    }),

  blackjackDouble: () =>
    request<BlackjackStateResponse>('/api/blackjack/double', {
      method: 'POST',
      body: '{}',
    }),

  // ── Coinflip ─────────────────────────────────────────────────────────────

  coinflipPlay: (bet: number, choice: CoinSide) =>
    request<CoinflipResult>('/api/coinflip/play', {
      method: 'POST',
      body: JSON.stringify({ bet, choice }),
    }),

  // ── MineRush ─────────────────────────────────────────────────────────────

  mineRushState: () =>
    request<{ game: MineRushGameView | null; balance: number }>('/api/minerush/state'),

  mineRushStart: (difficulty: MineRushDifficulty, bet: number) =>
    request<MineRushGameView>('/api/minerush/start', {
      method: 'POST',
      body: JSON.stringify({ difficulty, bet }),
    }),

  mineRushReveal: (gameId: string, x: number, y: number) =>
    request<MineRushRevealResult>('/api/minerush/reveal', {
      method: 'POST',
      body: JSON.stringify({ gameId, x, y }),
    }),

  mineRushFlag: (gameId: string, x: number, y: number) =>
    request<MineRushGameView>('/api/minerush/flag', {
      method: 'POST',
      body: JSON.stringify({ gameId, x, y }),
    }),

  mineRushCashout: (gameId: string) =>
    request<MineRushCashoutResult>('/api/minerush/cashout', {
      method: 'POST',
      body: JSON.stringify({ gameId }),
    }),

  // ── Arena ────────────────────────────────────────────────────────────────

  arenaState: () => request<ArenaStateResponse>('/api/arena/state'),

  arenaBet: (bet: number) =>
    request<ArenaStateResponse>('/api/arena/bet', {
      method: 'POST',
      body: JSON.stringify({ bet }),
    }),

  // ── PvP ──────────────────────────────────────────────────────────────────

  pvpStats: () =>
    request<{
      level: number; xp: number; xpForNextLevel: number;
      rating: number; wins: number; losses: number; draws: number;
    }>('/api/pvp/stats'),

  pvpFind: () =>
    request<{ status: 'matched' | 'queuing'; matchId?: string; queuedAt?: number }>(
      '/api/pvp/find', { method: 'POST', body: '{}' },
    ),

  pvpLeaveQueue: () =>
    request<{ ok: boolean }>('/api/pvp/queue', { method: 'DELETE' }),

  pvpGetMatch: (matchId: string) =>
    request<PvpMatchView>(`/api/pvp/match/${encodeURIComponent(matchId)}`),

  pvpChoose: (matchId: string, card: 'attack' | 'defense' | 'speed') =>
    request<PvpMatchView>(`/api/pvp/match/${encodeURIComponent(matchId)}/choose`, {
      method: 'POST',
      body: JSON.stringify({ card }),
    }),
};

// ── PvP types (used by PvpGame.tsx) ──────────────────────────────────────────

export interface PvpRound {
  myCard: 'attack' | 'defense' | 'speed';
  opponentCard: 'attack' | 'defense' | 'speed';
  result: 'win' | 'lose' | 'draw';
}

export interface PvpMatchView {
  matchId: string;
  isBot: boolean;
  opponentName: string;
  myRole: 'p1' | 'p2';
  phase: 'choosing' | 'finished';
  currentRound: number;
  roundEndsAt: number;
  scores: { me: number; opponent: number };
  myCardThisRound: 'attack' | 'defense' | 'speed' | null;
  rounds: PvpRound[];
  matchResult: 'win' | 'lose' | 'draw' | null;
  xpGained: number;
  ratingChange: number;
}
