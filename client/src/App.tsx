import { useState, useEffect, useCallback } from 'react';
import { api, setInitData } from './api';
import { useTelegram } from './hooks/useTelegram';
import { TabBar, type Tab } from './components/TabBar';
import { Cabinet } from './components/Cabinet';
import { Leaders } from './components/Leaders';
import { DailyTab } from './components/DailyTab';
import { StarIcon } from './components/StarIcon';
import type { Case, Prize } from './types';
import { GamesScreen } from './components/GamesScreen';
import { CaseGame } from './components/CaseGame';
import { BlackjackGame } from './components/BlackjackGame';

type GameView = 'lobby' | 'cases' | 'blackjack';

export function App() {
  const { tg, user, initData, isDev } = useTelegram();
  // До первого useEffect дочерних компонентов: иначе /api/blackjack/state уходит без init, а /deal — уже с init (другой user_id → «завершите партию»).
  setInitData(initData);

  const [tab,          setTab]          = useState<Tab>('games');
  const [gameView,     setGameView]     = useState<GameView>('lobby');
  const [freeCaseJump, setFreeCaseJump] = useState(0);
  const [balance,      setBalance]      = useState(0);
  const [cases,        setCases]        = useState<Case[]>([]);
  const [prizes,       setPrizes]       = useState<Prize[]>([]);
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
    
    // 2. Fetch data (init уже выставлен синхронно в теле App)
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

  const openCasesGame = useCallback(() => {
    setGameView('cases');
    setTab('games');
  }, []);

  const openBlackjackGame = useCallback(() => {
    setGameView('blackjack');
    setTab('games');
  }, []);

  const goToFreeCase = useCallback(() => {
    setTab('games');
    setGameView('cases');
    setFreeCaseJump(v => v + 1);
  }, []);

  const handleTabChange = useCallback((nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab === 'games') setGameView('lobby');
  }, []);

  return (
    <div className="app">

      {/* ── Top bar (replaces Telegram's native header in dev mode) ── */}
      <header className="tg-header">
        <div className="tg-header-left">
          {tab !== 'games' && (
            <button className="back-btn" onClick={() => setTab('games')}>‹</button>
          )}
        </div>
        <div className="tg-header-title">
          {tab === 'games' ? (
            gameView === 'cases' ? (
              'Кейсы'
            ) : gameView === 'blackjack' ? (
              'Блэкджек'
            ) : (
              'Игры'
            )
          ) : tab === 'leaders' ? (
            'Лидеры'
          ) : tab === 'daily' ? (
            'Ежедневный подарок'
          ) : (
            'Кабинет'
          )}
        </div>
        <div className="tg-header-right">
          {tab === 'games' && (
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
      <main
        className={`page-content${tab === 'games' && gameView === 'blackjack' ? ' page-content--blackjack' : ''}`}
      >
        {tab === 'games' ? (
          gameView === 'cases' ? (
            <CaseGame
              cases={cases}
              prizes={prizes}
              onBack={() => setGameView('lobby')}
              onBalanceUpdate={setBalance}
              onCasesReload={reloadCases}
              forceSelectFreeSignal={freeCaseJump}
            />
          ) : gameView === 'blackjack' ? (
            <BlackjackGame onBack={() => setGameView('lobby')} onBalanceUpdate={setBalance} />
          ) : (
            <GamesScreen onOpenCases={openCasesGame} onOpenBlackjack={openBlackjackGame} />
          )
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
      <TabBar active={tab} onChange={handleTabChange} />

      {/* ── Debug Logs (shows on error) ────────────────────────── */}
      {error && (
        <div style={{ padding: 10, fontSize: 10, background: '#000', color: '#0f0', maxHeight: 100, overflow: 'auto' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
