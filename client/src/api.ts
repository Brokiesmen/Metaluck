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
  AviatorStateResponse,
  AviatorBetResponse,
  AviatorCashoutResponse,
  WebUser,
  AuthResponse,
  ProgressView,
  WalletBalance,
  WalletCurrency,
  WalletCurrencyInfo,
  WalletLedgerPage,
  WalletSnapshot,
  DepositMethod,
  DepositOrderView,
  CryptoDepositAddress,
  CryptoChainDeposit,
  CryptoWithdrawQuote,
  CryptoWithdrawal,
  ExchangePairInfo,
  ExchangeQuote,
  ExchangeExecuteResult,
  ExchangeOrder,
  MarketRate,
} from './types';
import {
  isDemoMode,
  delay,
  demoOpenCase,
  demoCoinflipPlay,
  demoBlackjackState,
  demoBlackjackDeal,
  demoBlackjackHit,
  demoBlackjackStand,
  demoBlackjackDouble,
  demoMineRushState,
  demoMineRushStart,
  demoMineRushReveal,
  demoMineRushFlag,
  demoMineRushCashout,
  demoArenaState,
  demoArenaBet,
  demoAviatorState,
  demoAviatorBet,
  demoAviatorCashout,
} from './demo';

let _initData = '';
export function setInitData(d: string) { _initData = d; }

/**
 * Bearer-токен web-сессии (Google / Telegram Login вне Mini App).
 * Храним в localStorage и шлём заголовком Authorization. В Mini App токена нет —
 * там авторизация идёт через X-Telegram-Init-Data, этот слой её не трогает.
 */
const TOKEN_KEY = 'metaluck_session_v1';
let _token: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
})();

export function getAuthToken(): string | null { return _token; }
export function setAuthToken(token: string | null) {
  _token = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode */ }
}

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

/**
 * ws://-адрес для того же бэкенда, что и REST (Aviator-лента).
 * Пустая база → тот же origin, что и страница (работает через Vite-proxy и туннель).
 */
export function resolveWsUrl(path: string): string {
  const base = getApiBase();
  if (base) {
    const u = new URL(base.endsWith('/') ? base : `${base}/`);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${u.origin}${p}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}${path.startsWith('/') ? path : `/${path}`}`;
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
        // Bearer только когда нет Mini App initData (иначе приоритет у Telegram).
        ...(_token && !_initData ? { Authorization: `Bearer ${_token}` } : {}),
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

  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/api/auth/')) {
      setAuthToken(null);
    }
    throw new Error(data.message ?? `Ошибка ${res.status}`);
  }
  return data as T;
}

export const api = {
  // ── Web auth ───────────────────────────────────────────────────────────────
  authMe: () =>
    request<{ user: WebUser; token?: string }>('/api/auth/me').then((d) => {
      if (d.token) setAuthToken(d.token);
      return d.user;
    }),

  authConfig: () =>
    request<{
      telegramBot: string | null;
      googleClientId: string | null;
      sessionReady: boolean;
      telegramLoginReady: boolean;
      googleLoginReady: boolean;
      webAppUrl?: string | null;
    }>('/api/auth/config'),

  authTelegramStart: () =>
    request<{
      challengeId: string;
      deepLink: string;
      expiresAt: string;
      pollIntervalMs: number;
    }>('/api/auth/telegram/start', { method: 'POST', body: '{}' }),

  authTelegramPoll: (challengeId: string) =>
    request<{
      status: 'pending' | 'expired' | 'ready';
      token?: string;
      user?: WebUser;
    }>(`/api/auth/telegram/poll?id=${encodeURIComponent(challengeId)}`),

  authGoogle: (credential: string) =>
    request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }).then((d) => {
      setAuthToken(d.token);
      return d;
    }),

  authTelegram: (payload: Record<string, string | number>) =>
    request<AuthResponse>('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((d) => {
      setAuthToken(d.token);
      return d;
    }),

  authRefresh: () =>
    request<AuthResponse>('/api/auth/refresh', { method: 'POST' }).then((d) => {
      setAuthToken(d.token);
      return d;
    }),

  authLogout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).finally(() => {
      setAuthToken(null);
    }),

  getBalance: () =>
    request<{ balance: number }>('/api/balance').then(d => d.balance),

  getWallet: () =>
    request<WalletSnapshot>('/api/wallet'),

  getWalletBalance: (currency: WalletCurrency) =>
    request<WalletBalance>(`/api/wallet/${encodeURIComponent(currency)}`),

  getWalletCurrencies: () =>
    request<{ currencies: WalletCurrencyInfo[] }>('/api/wallet/currencies').then((d) => d.currencies),

  getWalletLedger: (opts: { currency?: WalletCurrency; page?: number; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.currency) q.set('currency', opts.currency);
    if (opts.page != null) q.set('page', String(opts.page));
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<WalletLedgerPage>(`/api/wallet/ledger${qs ? `?${qs}` : ''}`);
  },

  getProgress: () =>
    request<ProgressView>('/api/progress'),

  getPrizes: () =>
    request<{ prizes: Prize[] }>('/api/prizes').then(d => d.prizes),

  getCases: () =>
    request<{ cases: Case[] }>('/api/cases').then((d) => {
      if (!isDemoMode()) return d.cases;
      return d.cases.map((c) =>
        c.isFree ? { ...c, freeAvailable: true, nextFreeAt: null } : c,
      );
    }),

  getHistory: (page = 0, limit = 20) =>
    request<HistoryPage>(`/api/history?page=${page}&limit=${limit}`),

  getLeaders: (page = 0, limit = 50) =>
    request<LeaderPage>(`/api/leaders?page=${page}&limit=${limit}`),

  getDailyStatus: () =>
    request<{ currentDay: number; canClaim: boolean; nextClaimAt: number; claimedDays: boolean[] }>('/api/daily/status'),

  claimDaily: () =>
    request<{ prize: { id: number; name: string; rarity: string; icon: string; stars?: number }; newBalance: number; day: number }>('/api/daily/claim', { method: 'POST', body: '{}' }),

  getWheelStatus: () =>
    request<{
      available: boolean;
      nextAt: number | null;
      coupons: number;
      segments: { id: number; label: string; color: string }[];
      premiumSegments: { id: number; label: string; color: string }[];
      premiumXtr: number;
    }>('/api/wheel/status'),

  spinWheel: () =>
    request<{
      prize: { id: number; name: string; rarity: string; icon: string; stars?: number; coupons?: number };
      newBalance: number;
      coupons: number;
      segmentIndex: number;
      empty?: boolean;
      nextAt: number;
    }>('/api/wheel/spin', { method: 'POST', body: '{}' }),

  spinPremiumWheel: (body: { method: 'coupon' } | { method: 'xtr'; payload: string }) =>
    request<{
      prize: { id: number; name: string; rarity: string; icon: string; stars?: number; coupons?: number };
      newBalance: number;
      coupons: number;
      segmentIndex: number;
      empty?: boolean;
    }>('/api/wheel/premium/spin', { method: 'POST', body: JSON.stringify(body) }),

  createPremiumWheelInvoice: () =>
    request<{ invoiceLink: string; payload: string; xtrAmount: number }>(
      '/api/wheel/premium/create-invoice',
      { method: 'POST', body: '{}' },
    ),

  getPremiumWheelPayStatus: (payload: string) =>
    request<{ status: string; readyToSpin: boolean; used: boolean }>(
      `/api/wheel/premium/status/${encodeURIComponent(payload)}`,
    ),

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

  getDepositMethods: () =>
    request<{ methods: DepositMethod[] }>('/api/deposit/methods').then((d) => d.methods),

  getDepositPackages: () =>
    request<{ packages: TopupPackage[] }>('/api/deposit/packages').then((d) => d.packages),

  createStarsDepositInvoice: (packageId: string) =>
    request<{ id: string; invoiceLink: string; payload: string; packageId: string | null; expectedAmount: number }>(
      '/api/deposit/stars/invoice',
      { method: 'POST', body: JSON.stringify({ packageId }) },
    ),

  getStarsDepositStatus: (id: string) =>
    request<{
      id: string;
      status: string;
      balanceAmount: number;
      receivedAmount: number | null;
      newBalance: number | null;
      packageId: string | null;
    }>(`/api/deposit/stars/status/${encodeURIComponent(id)}`),

  createCryptoDepositIntent: (currency: 'TON' | 'USDT_TON', amount: number) =>
    request<DepositOrderView>('/api/deposit/crypto/intent', {
      method: 'POST',
      body: JSON.stringify({ currency, amount }),
    }),

  getDeposit: (id: string) =>
    request<DepositOrderView>(`/api/deposit/${encodeURIComponent(id)}`),

  verifyDeposit: (id: string) =>
    request<DepositOrderView>(`/api/deposit/${encodeURIComponent(id)}/verify`, { method: 'POST' }),

  getCryptoStatus: () =>
    request<{
      enabled: boolean;
      network: string;
      currencies: string[];
      requiredConfirmations: number;
      statuses?: string[];
    }>('/api/crypto/status'),

  /** TON / USDT_TON balances (alias of wallet slice). Prefer getWallet for full snapshot. */
  getCryptoBalance: () =>
    request<{
      network: 'ton';
      enabled: boolean;
      balances: Array<{
        currency: 'TON' | 'USDT_TON';
        available: number;
        locked: number;
        decimals: number;
        displaySymbol: string;
      }>;
    }>('/api/crypto/balance'),

  /** Combined deposits + withdrawals. */
  getCryptoHistory: (limit = 40) =>
    request<{
      deposits: CryptoChainDeposit[];
      withdrawals: CryptoWithdrawal[];
      network: 'ton';
    }>(`/api/crypto/history?limit=${encodeURIComponent(String(limit))}`),

  getCryptoDepositAddress: (currency: 'TON' | 'USDT_TON' = 'TON') =>
    request<{ deposit: CryptoDepositAddress | null; enabled: boolean }>(
      `/api/crypto/deposit-address?currency=${encodeURIComponent(currency)}`,
    ),

  /** Start deposit: pick currency → personal address. Uses deposit-address (live on Railway). */
  startCryptoDeposit: (currency: 'TON' | 'USDT_TON') =>
    request<{ deposit: CryptoDepositAddress }>('/api/crypto/deposit-address', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    }),

  /** @deprecated same as startCryptoDeposit */
  createCryptoDepositAddress: (currency: 'TON' | 'USDT_TON' = 'TON') =>
    request<{ deposit: CryptoDepositAddress }>('/api/crypto/deposit-address', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    }),

  listCryptoDeposits: () =>
    request<{ deposits: CryptoChainDeposit[] }>('/api/crypto/deposits').then((d) => d.deposits),

  syncCryptoDeposits: () =>
    request<{ ok: boolean; deposits: CryptoChainDeposit[]; withdrawals?: CryptoWithdrawal[] }>(
      '/api/crypto/sync',
      { method: 'POST' },
    ),

  getCryptoWithdrawStatus: async () => {
    try {
      return await request<{
        enabled: boolean;
        network: string;
        currencies: string[];
        statuses: string[];
        fees: Record<string, number>;
        mins: Record<string, number>;
        maxes: Record<string, number>;
        dailyLimits: Record<string, number>;
      }>('/api/crypto/withdraw/status');
    } catch {
      // Older Railway deploys omit withdraw routes — treat as disabled.
      return {
        enabled: false,
        network: 'ton',
        currencies: [] as string[],
        statuses: [] as string[],
        fees: {} as Record<string, number>,
        mins: {} as Record<string, number>,
        maxes: {} as Record<string, number>,
        dailyLimits: {} as Record<string, number>,
      };
    }
  },

  quoteCryptoWithdraw: (body: {
    currency: 'TON' | 'USDT_TON';
    toAddress: string;
    amount: number;
  }) =>
    request<{ quote: CryptoWithdrawQuote }>('/api/crypto/withdraw/quote', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((d) => d.quote),

  createCryptoWithdraw: (body: {
    currency: 'TON' | 'USDT_TON';
    toAddress: string;
    amount: number;
    confirm: true;
  }) =>
    request<{ withdrawal: CryptoWithdrawal }>('/api/crypto/withdraw', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((d) => d.withdrawal),

  listCryptoWithdrawals: () =>
    request<{ withdrawals: CryptoWithdrawal[] }>('/api/crypto/withdrawals')
      .then((d) => d.withdrawals)
      .catch(() => [] as CryptoWithdrawal[]),

  listDeposits: (opts: { limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; deposits: DepositOrderView[] }>(
      `/api/deposit${qs ? `?${qs}` : ''}`,
    );
  },

  getRates: () =>
    request<{
      usd: {
        'TON/USD': number;
        'USDT/USD': number;
        'STARS/USD': number;
        source: string;
        fetchedAt: string;
      };
      rates: MarketRate[];
      refreshedAt: string | null;
      lastError: string | null;
      redisConfigured: boolean;
    }>('/api/rates'),

  getUsdRates: () =>
    request<{
      'TON/USD': number;
      'USDT/USD': number;
      'STARS/USD': number;
      source: string;
      fetchedAt: string;
    }>('/api/rates/usd'),

  getRate: (from: WalletCurrency, to: WalletCurrency) =>
    request<MarketRate>(`/api/rates/${encodeURIComponent(from)}/${encodeURIComponent(to)}`),

  getExchangePairs: () =>
    request<{
      pairs: ExchangePairInfo[];
      rates: MarketRate[];
      currencies?: string[];
      rails?: { deposit: boolean; withdraw: boolean };
    }>('/api/exchange/pairs'),

  getExchangeStatus: async () => {
    type ExchangeStatus = {
      balances: Array<{
        currency: WalletCurrency;
        available: number;
        locked: number;
        decimals: number;
        displaySymbol: string;
      }>;
      deposit: { enabled: boolean; currencies: Array<'TON' | 'USDT_TON'> };
      withdraw: { enabled: boolean; currencies: Array<'TON' | 'USDT_TON'> };
      flows: Array<{
        id: string;
        from: WalletCurrency | null;
        to: WalletCurrency | null;
        depositCurrency: WalletCurrency | null;
        withdrawCurrency: WalletCurrency | null;
      }>;
      currencies: WalletCurrency[];
    };
    try {
      return await request<ExchangeStatus>('/api/exchange/status');
    } catch {
      // Compose from live routes when /api/exchange/status is missing on older deploys.
      const [wallet, crypto, pairs] = await Promise.all([
        request<WalletSnapshot>('/api/wallet'),
        request<{ enabled: boolean }>('/api/crypto/status').catch(() => ({ enabled: false })),
        request<{ rails?: { deposit: boolean; withdraw: boolean } }>('/api/exchange/pairs').catch(
          () => ({ rails: { deposit: false, withdraw: false } }),
        ),
      ]);
      const depositOn = crypto.enabled || Boolean(pairs.rails?.deposit);
      const withdrawOn = Boolean(pairs.rails?.withdraw);
      return {
        balances: wallet.balances,
        deposit: { enabled: depositOn, currencies: ['TON', 'USDT_TON'] },
        withdraw: { enabled: withdrawOn, currencies: ['TON', 'USDT_TON'] },
        flows: [
          {
            id: 'deposit_ton_to_stars',
            from: 'TON' as WalletCurrency,
            to: 'STARS' as WalletCurrency,
            depositCurrency: 'TON' as WalletCurrency,
            withdrawCurrency: null,
          },
          {
            id: 'deposit_usdt_to_ton',
            from: 'USDT_TON' as WalletCurrency,
            to: 'TON' as WalletCurrency,
            depositCurrency: 'USDT_TON' as WalletCurrency,
            withdrawCurrency: null,
          },
          {
            id: 'withdraw_ton',
            from: null,
            to: null,
            depositCurrency: null,
            withdrawCurrency: 'TON' as WalletCurrency,
          },
        ],
        currencies: ['STARS', 'TON', 'USDT_TON'] as WalletCurrency[],
      } satisfies ExchangeStatus;
    }
  },

  createExchangeQuote: (from: WalletCurrency, to: WalletCurrency, amount: number) =>
    request<ExchangeQuote>('/api/exchange/quote', {
      method: 'POST',
      body: JSON.stringify({ from, to, amount }),
    }),

  executeExchange: (quoteId: string) =>
    request<ExchangeExecuteResult>('/api/exchange/execute', {
      method: 'POST',
      body: JSON.stringify({ quoteId }),
    }),

  getExchangeHistory: (opts: { limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; orders: ExchangeOrder[] }>(
      `/api/exchange/history${qs ? `?${qs}` : ''}`,
    );
  },

  getTransactions: (opts: { limit?: number; offset?: number; kind?: 'all' | 'exchange' | 'ledger' } = {}) => {
    const q = new URLSearchParams();
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    if (opts.kind) q.set('kind', opts.kind);
    const qs = q.toString();
    return request<{ total: number; items: unknown[] }>(`/api/transactions${qs ? `?${qs}` : ''}`);
  },

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

  // ── Payment Hub Admin ────────────────────────────────────────────────────

  adminMe: () =>
    request<{ isAdmin: boolean; actorId: number | null; via: 'secret' | 'user' | null }>(
      '/api/admin/payments/me',
    ),

  adminGetSettings: () =>
    request<{ settings: Record<string, unknown>; keys: string[] }>('/api/admin/payments/settings'),

  adminPutSettings: (patch: Record<string, unknown>) =>
    request<{ ok: boolean; settings: Record<string, unknown> }>('/api/admin/payments/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  adminListAdmins: () =>
    request<{ admins: { userId: number; note: string; createdAt: string }[] }>(
      '/api/admin/payments/admins',
    ),

  adminAddAdmin: (userId: number, note = '') =>
    request<{ ok: boolean; admins: { userId: number; note: string; createdAt: string }[] }>(
      '/api/admin/payments/admins',
      { method: 'POST', body: JSON.stringify({ userId, note }) },
    ),

  adminRemoveAdmin: (userId: number) =>
    request<{ ok: boolean }>(`/api/admin/payments/admins/${userId}`, { method: 'DELETE' }),

  adminGetRates: () => request<Record<string, unknown>>('/api/admin/payments/rates'),

  adminRefreshRates: () =>
    request<Record<string, unknown>>('/api/admin/payments/rates/refresh', {
      method: 'POST',
      body: '{}',
    }),

  adminSetManualRate: (base: string, quote: string, mid: number) =>
    request<{ ok: boolean; rate: unknown }>('/api/admin/payments/rates/manual', {
      method: 'POST',
      body: JSON.stringify({ base, quote, mid }),
    }),

  adminSetStarsUsd: (usd: number, manual: boolean) =>
    request<{ ok: boolean; stars: { usd: number; manual: boolean } }>(
      '/api/admin/payments/rates/stars-usd',
      { method: 'POST', body: JSON.stringify({ usd, manual }) },
    ),

  adminListPairs: () =>
    request<{
      pairs: {
        from: string;
        to: string;
        spreadBps: number;
        feeBps: number;
        minFromAmount: number;
        maxFromAmount: number;
        isActive: boolean;
        updatedAt: string;
      }[];
    }>('/api/admin/payments/pairs'),

  adminUpdatePair: (
    from: string,
    to: string,
    patch: {
      spreadBps?: number;
      feeBps?: number;
      minFromAmount?: number;
      maxFromAmount?: number;
      isActive?: boolean;
    },
  ) =>
    request<{ ok: boolean; pair: unknown }>(
      `/api/admin/payments/pairs/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),

  adminListDeposits: (opts: { status?: string; userId?: number; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.status) q.set('status', opts.status);
    if (opts.userId != null) q.set('userId', String(opts.userId));
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; items: Record<string, unknown>[] }>(
      `/api/admin/payments/deposits${qs ? `?${qs}` : ''}`,
    );
  },

  adminListWithdrawals: (opts: {
    status?: string;
    userId?: number;
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (opts.status) q.set('status', opts.status);
    if (opts.userId != null) q.set('userId', String(opts.userId));
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; items: Record<string, unknown>[] }>(
      `/api/admin/payments/withdrawals${qs ? `?${qs}` : ''}`,
    );
  },

  adminListCryptoDeposits: (opts: {
    status?: string;
    userId?: number;
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (opts.status) q.set('status', opts.status);
    if (opts.userId != null) q.set('userId', String(opts.userId));
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; items: Record<string, unknown>[] }>(
      `/api/admin/payments/crypto/deposits${qs ? `?${qs}` : ''}`,
    );
  },

  adminListCryptoWithdrawals: (opts: {
    status?: string;
    userId?: number;
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (opts.status) q.set('status', opts.status);
    if (opts.userId != null) q.set('userId', String(opts.userId));
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; items: Record<string, unknown>[] }>(
      `/api/admin/payments/crypto/withdrawals${qs ? `?${qs}` : ''}`,
    );
  },

  adminSetWithdrawStatus: (id: number, status: 'paid' | 'rejected' | 'pending') =>
    request<{ id: number; status: string; refunded: boolean }>(
      `/api/admin/payments/withdrawals/${id}/status`,
      { method: 'POST', body: JSON.stringify({ status }) },
    ),

  adminListExchanges: (opts: { userId?: number; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.userId != null) q.set('userId', String(opts.userId));
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; items: Record<string, unknown>[] }>(
      `/api/admin/payments/exchanges${qs ? `?${qs}` : ''}`,
    );
  },

  adminListTransactions: (opts: {
    userId?: number;
    currency?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (opts.userId != null) q.set('userId', String(opts.userId));
    if (opts.currency) q.set('currency', opts.currency);
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return request<{ total: number; items: Record<string, unknown>[] }>(
      `/api/admin/payments/transactions${qs ? `?${qs}` : ''}`,
    );
  },

  adminSearchUser: (q: string) =>
    request<{
      users: {
        userId: number;
        name: string | null;
        photoUrl: string | null;
        username: string | null;
        balances: WalletBalance[];
      }[];
    }>(`/api/admin/payments/users/search?q=${encodeURIComponent(q)}`),

  adminWalletCredit: (userId: number, currency: WalletCurrency, amount: number, reason?: string) =>
    request<{ ok: boolean; balance: WalletBalance }>('/api/admin/payments/wallet/credit', {
      method: 'POST',
      body: JSON.stringify({ userId, currency, amount, reason }),
    }),

  adminWalletDebit: (userId: number, currency: WalletCurrency, amount: number, reason?: string) =>
    request<{ ok: boolean; balance: WalletBalance }>('/api/admin/payments/wallet/debit', {
      method: 'POST',
      body: JSON.stringify({ userId, currency, amount, reason }),
    }),

  adminExchangeProfit: (opts: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (opts.from) q.set('from', opts.from);
    if (opts.to) q.set('to', opts.to);
    const qs = q.toString();
    return request<{
      orderCount: number;
      feeTotals: Record<string, number>;
      byPair: Record<string, { count: number; feeByCurrency: Record<string, number> }>;
    }>(`/api/admin/payments/stats/exchange-profit${qs ? `?${qs}` : ''}`);
  },

  openCase: async (caseId: number, currency: WalletCurrency = 'STARS') => {
    if (isDemoMode()) {
      await delay(80);
      return demoOpenCase(caseId);
    }
    return request<{ prize: Prize; newBalance: number }>('/api/case/open', {
      method: 'POST',
      body: JSON.stringify({ caseId, currency }),
    });
  },

  getBlackjackState: async () => {
    if (isDemoMode()) {
      await delay(30);
      return demoBlackjackState();
    }
    return request<BlackjackStateResponse>('/api/blackjack/state');
  },

  blackjackDeal: async (bet: number, currency: WalletCurrency = 'STARS') => {
    if (isDemoMode()) {
      await delay(60);
      return demoBlackjackDeal(bet);
    }
    return request<BlackjackStateResponse>('/api/blackjack/deal', {
      method: 'POST',
      body: JSON.stringify({ bet, currency }),
    });
  },

  blackjackHit: async () => {
    if (isDemoMode()) {
      await delay(40);
      return demoBlackjackHit();
    }
    return request<BlackjackStateResponse>('/api/blackjack/hit', {
      method: 'POST',
      body: '{}',
    });
  },

  blackjackStand: async () => {
    if (isDemoMode()) {
      await delay(40);
      return demoBlackjackStand();
    }
    return request<BlackjackStateResponse>('/api/blackjack/stand', {
      method: 'POST',
      body: '{}',
    });
  },

  blackjackDouble: async (currency: WalletCurrency = 'STARS') => {
    if (isDemoMode()) {
      await delay(40);
      return demoBlackjackDouble();
    }
    return request<BlackjackStateResponse>('/api/blackjack/double', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    });
  },

  // ── Coinflip ─────────────────────────────────────────────────────────────

  coinflipPlay: async (bet: number, choice: CoinSide, currency: WalletCurrency = 'STARS') => {
    if (isDemoMode()) {
      await delay(50);
      return demoCoinflipPlay(bet, choice);
    }
    return request<CoinflipResult>('/api/coinflip/play', {
      method: 'POST',
      body: JSON.stringify({ bet, choice, currency }),
    });
  },

  // ── MineRush ─────────────────────────────────────────────────────────────

  mineRushState: async () => {
    if (isDemoMode()) {
      await delay(30);
      return demoMineRushState();
    }
    return request<{ game: MineRushGameView | null; balance: number }>('/api/minerush/state');
  },

  mineRushStart: async (
    difficulty: MineRushDifficulty,
    bet: number,
    currency: WalletCurrency = 'STARS',
  ) => {
    if (isDemoMode()) {
      await delay(50);
      return demoMineRushStart(difficulty, bet);
    }
    return request<MineRushGameView>('/api/minerush/start', {
      method: 'POST',
      body: JSON.stringify({ difficulty, bet, currency }),
    });
  },

  mineRushReveal: async (gameId: string, x: number, y: number) => {
    if (isDemoMode()) {
      await delay(20);
      return demoMineRushReveal(gameId, x, y);
    }
    return request<MineRushRevealResult>('/api/minerush/reveal', {
      method: 'POST',
      body: JSON.stringify({ gameId, x, y }),
    });
  },

  mineRushFlag: async (gameId: string, x: number, y: number) => {
    if (isDemoMode()) {
      await delay(15);
      return demoMineRushFlag(gameId, x, y);
    }
    return request<MineRushGameView>('/api/minerush/flag', {
      method: 'POST',
      body: JSON.stringify({ gameId, x, y }),
    });
  },

  mineRushCashout: async (gameId: string) => {
    if (isDemoMode()) {
      await delay(40);
      return demoMineRushCashout(gameId);
    }
    return request<MineRushCashoutResult>('/api/minerush/cashout', {
      method: 'POST',
      body: JSON.stringify({ gameId }),
    });
  },

  // ── Arena ────────────────────────────────────────────────────────────────

  arenaState: async () => {
    if (isDemoMode()) {
      await delay(20);
      return demoArenaState();
    }
    return request<ArenaStateResponse>('/api/arena/state');
  },

  arenaBet: async (bet: number, currency: WalletCurrency = 'STARS') => {
    if (isDemoMode()) {
      await delay(40);
      return demoArenaBet(bet);
    }
    return request<ArenaStateResponse>('/api/arena/bet', {
      method: 'POST',
      body: JSON.stringify({ bet, currency }),
    });
  },

  // ── Aviator ──────────────────────────────────────────────────────────────

  aviatorState: async () => {
    if (isDemoMode()) {
      await delay(20);
      return demoAviatorState();
    }
    return request<AviatorStateResponse>('/api/aviator/state');
  },

  aviatorBet: async (
    bet: number,
    autoCashout: number | null,
    currency: WalletCurrency = 'STARS',
  ) => {
    if (isDemoMode()) {
      await delay(40);
      return demoAviatorBet(bet, autoCashout);
    }
    return request<AviatorBetResponse>('/api/aviator/bet', {
      method: 'POST',
      body: JSON.stringify({ bet, autoCashout, currency }),
    });
  },

  aviatorCashout: async (roundId: string) => {
    if (isDemoMode()) {
      await delay(25);
      return demoAviatorCashout(roundId);
    }
    return request<AviatorCashoutResponse>('/api/aviator/cashout', {
      method: 'POST',
      body: JSON.stringify({ roundId }),
    });
  },

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
