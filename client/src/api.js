let _initData = '';
export function setInitData(d) { _initData = d; }
async function request(url, options) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': _initData,
            ...(options?.headers ?? {}),
        },
    });
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.message ?? 'Server error');
    return data;
}
export const api = {
    getBalance: () => request('/api/balance').then(d => d.balance),
    getPrizes:  () => request('/api/prizes').then(d => d.prizes),
    getCases:   () => request('/api/cases').then(d => d.cases),
    getHistory: () => request('/api/history').then(d => d.history),
    getLeaders: () => request('/api/leaders').then(d => d.leaders),
    getDailyStatus:    () => request('/api/daily/status'),
    claimDaily:        () => request('/api/daily/claim', { method: 'POST', body: JSON.stringify({}) }),
    getReferralStatus: () => request('/api/referral/status'),
    activateReferral:  (code) => request('/api/referral/activate', { method: 'POST', body: JSON.stringify({ code }) }),
    topup:     (amount) => request('/api/balance/topup', { method: 'POST', body: JSON.stringify({ amount }) }),
    openCase:  (caseId) => request('/api/case/open', { method: 'POST', body: JSON.stringify({ caseId }) }),
};
