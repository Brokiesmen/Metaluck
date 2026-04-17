import type { Prize, Case, HistoryEntry, Leader } from './types';

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

  getHistory: () =>
    request<{ history: HistoryEntry[] }>('/api/history').then(d => d.history),

  getLeaders: () =>
    request<{ leaders: Leader[] }>('/api/leaders').then(d => d.leaders),

  openCase: (caseId: number) =>
    request<{ prize: Prize; newBalance: number }>('/api/case/open', {
      method: 'POST',
      body: JSON.stringify({ caseId }),
    }),
};
