import { useState, useEffect, useCallback } from 'react';
import { api, setInitData } from './api';
import { useTelegram } from './hooks/useTelegram';
import { TabBar, type Tab } from './components/TabBar';
import { CaseGrid } from './components/CaseGrid';
import { StripOpener } from './components/StripOpener';
import { ResultModal } from './components/ResultModal';
import { Cabinet } from './components/Cabinet';
import { Leaders } from './components/Leaders';
import { DailyTab } from './components/DailyTab';
import { StarIcon } from './components/StarIcon';
import { MetaluckBrand } from './components/branding';
import type { Case, Prize } from './types';

export function App() {
  const { tg, user, initData, isDev } = useTelegram();

  const [tab,          setTab]          = useState<Tab>('cases');
  const [balance,      setBalance]      = useState(0);
  const [cases,        setCases]        = useState<Case[]>([]);
  const [prizes,       setPrizes]       = useState<Prize[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [winner,       setWinner]       = useState<Prize | null>(null);
  const [resultPrize,  setResultPrize]  = useState<Prize | null>(null);
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [previewKey,   setPreviewKey]   = useState(0);
  const [error,        setError]        = useState<string | null>(null);
  const [logs,         setLogs]         = useState<string[]>([]);

  useEffect(() => {
    // @ts-ignore
    setLogs(window.startupLog || []);
    // @ts-ignore
    window.log = (m: string) => setLogs(prev => [...prev.slice(-10), m]);
  }, []);

  // ── Init and Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Init Telegram
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#17212b');
      tg.setBackgroundColor('#17212b');
    }
    
    // 2. Set Auth Data
    setInitData(initData);

    // 3. Fetch data (Wait for auth to be set)
    Promise.all([api.getBalance(), api.getCases(), api.getPrizes()])
      .then(([bal, c, p]) => {
        setBalance(bal);
        setCases(c);
        setPrizes(p);
      })
      .catch((err) => {
        console.error('Initial load failed:', err);
        setError('Сервер недоступен. Попробуйте обновить страницу.');
      });
  }, [tg, initData]);

  // ── Open case ─────────────────────────────────────────────────────────────
  const reloadCases = useCallback(() => {
    api.getCases().then(setCases).catch(() => {});
  }, []);

  // Navigate to cases tab and pre-select the free case
  const goToFreeCase = useCallback(() => {
    const freeCase = cases.find(c => c.isFree) ?? null;
    setSelectedCase(freeCase);
    setTab('cases');
  }, [cases]);

  const handleOpen = useCallback(async () => {
    if (!selectedCase || isAnimating) return;
    setError(null);
    setIsAnimating(true);
    setWinner(null);
    try {
      const { prize, newBalance } = await api.openCase(selectedCase.id);
      setBalance(newBalance);
      setWinner(prize);
      // Refresh cases so free-case timer updates
      reloadCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сервера');
      setIsAnimating(false);
    }
  }, [selectedCase, isAnimating, reloadCases]);

  const handleDone = useCallback((prize: Prize) => {
    setIsAnimating(false);
    setWinner(null);
    setResultPrize(prize);
  }, []);

  const handleClose = useCallback(() => {
    setResultPrize(null);
    setPreviewKey(k => k + 1);
  }, []);

  return (
    <div className="app">

      {/* ── Top bar (replaces Telegram's native header in dev mode) ── */}
      <header className="tg-header">
        <div className="tg-header-left">
          {tab !== 'cases' && (
            <button className="back-btn" onClick={() => setTab('cases')}>‹</button>
          )}
        </div>
        <div className="tg-header-title">
          {tab === 'cases' ? (
            <MetaluckBrand layout="horizontal" markSize={24} />
          ) : tab === 'leaders' ? (
            'Лидеры'
          ) : tab === 'daily' ? (
            'Ежедневный подарок'
          ) : (
            'Кабинет'
          )}
        </div>
        <div className="tg-header-right">
          {tab === 'cases' && (
            <span className="header-balance num">
              {balance.toLocaleString('ru-RU')}
              <StarIcon size={18} />
            </span>
          )}
        </div>
      </header>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && <div className="error-banner">{error}</div>}

      {/* ── Pages ─────────────────────────────────────────────────── */}
      <main className="page-content">
        {tab === 'cases' ? (
          <>
            <StripOpener
              selectedCase={selectedCase}
              prizes={prizes}
              winner={winner}
              previewKey={previewKey}
              isAnimating={isAnimating}
              onOpen={handleOpen}
              onDone={handleDone}
            />
            <CaseGrid
              cases={cases}
              selected={selectedCase}
              onSelect={setSelectedCase}
              disabled={isAnimating}
            />
          </>
        ) : tab === 'leaders' ? (
          <Leaders />
        ) : tab === 'daily' ? (
          <DailyTab
            prizes={prizes}
            cases={cases}
            onBalanceUpdate={setBalance}
            onGoToFreeCase={goToFreeCase}
          />
        ) : (
          <Cabinet
            user={user}
            balance={balance}
            isDev={isDev}
            onBalanceUpdate={setBalance}
            openInvoice={tg?.openInvoice?.bind(tg)}
            isTelegram={!!tg}
            tg={tg}
          />
        )}
      </main>

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <TabBar active={tab} onChange={setTab} />

      {/* ── Result modal ──────────────────────────────────────────── */}
      <ResultModal prize={resultPrize} onClose={handleClose} />

      {/* ── Debug Logs (shows on error) ────────────────────────── */}
      {error && (
        <div style={{ padding: 10, fontSize: 10, background: '#000', color: '#0f0', maxHeight: 100, overflow: 'auto' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
