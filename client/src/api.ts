import type { Prize, Case, HistoryEntry, Leader, TopupPackage, LeaderPage, HistoryPage } from './types';

let _initData = '';
export function setInitData(d: string) { _initData = d; }

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Send Telegram initData so server knows who is making the request
      'X-Telegram-Init-Data': _initData,
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Server error');
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
    request<{ code: string; referredCount: number; totalEarned: number }>('/api/referral/status'),

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

  openCase: (caseId: number) =>
    request<{ prize: Prize; newBalance: number }>('/api/case/open', {
      method: 'POST',
      body: JSON.stringify({ caseId }),
    }),
};
