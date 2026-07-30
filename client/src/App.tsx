import { useState, useEffect, useCallback } from 'react';
import { api, setInitData } from './api';
import { useTelegram } from './hooks/useTelegram';
import { useSettings } from './settings/SettingsContext';
import { applyTheme } from './settings/applyTheme';
import { TabBar, type Tab } from './components/TabBar';
import { Cabinet } from './components/Cabinet';
import { Leaders } from './components/Leaders';
import { DailyTab } from './components/DailyTab';
import { StarIcon } from './components/StarIcon';
import { SettingsModal } from './components/SettingsModal';
import type { Case, Prize } from './types';
import { GamesScreen } from './components/GamesScreen';
import { CaseGame } from './components/CaseGame';
import { BlackjackGame } from './components/BlackjackGame';
import { CoinflipGame } from './components/CoinflipGame';
import { MineRushGame } from './components/MineRushGame';
import { ArenaGame } from './components/ArenaGame';

type GameView = 'lobby' | 'cases' | 'blackjack' | 'coinflip' | 'minerush' | 'arena';

export function App() {
  const { tg, user, initData, isDev } = useTelegram();
  const { t, locale, theme } = useSettings();
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
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // @ts-ignore
    setLogs(window.startupLog || []);
    // @ts-ignore
    window.log = (m: string) => setLogs(prev => [...prev.slice(-10), m]);
  }, []);

  // Keep Telegram chrome in sync with app theme
  useEffect(() => {
    applyTheme(theme);
  }, [theme, tg]);

  // ── Init and Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      applyTheme(theme);
    }

    Promise.all([api.getBalance(), api.getCases(), api.getPrizes()])
      .then(([bal, c, p]) => {
        setBalance(bal);
        setCases(c);
        setPrizes(p);
      })
      .catch((err) => {
        console.error('Initial load failed:', err);
        setError(t.common.serverUnavailable);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per telegram session
  }, [tg, initData]);

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

  const openCoinflipGame = useCallback(() => {
    setGameView('coinflip');
    setTab('games');
  }, []);

  const openMineRushGame = useCallback(() => {
    setGameView('minerush');
    setTab('games');
  }, []);

  const openArenaGame = useCallback(() => {
    setGameView('arena');
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

  const headerTitle =
    tab === 'games'
      ? gameView === 'cases'
        ? t.header.cases
        : gameView === 'blackjack'
          ? t.header.blackjack
          : gameView === 'coinflip'
            ? t.header.coinflip
            : gameView === 'minerush'
              ? t.header.minerush
              : gameView === 'arena'
                ? t.header.arena
                : t.header.metaluck
      : tab === 'leaders'
        ? t.header.leaders
        : tab === 'daily'
          ? t.header.daily
          : t.header.cabinet;

  return (
    <div className="app">

      <header className="tg-header">
        <div className="tg-header-left">
          {tab === 'cabinet' ? (
            <button
              type="button"
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              aria-label={t.settings.ariaOpen}
            >
              ⚙️
            </button>
          ) : tab !== 'games' ? (
            <button type="button" className="back-btn" onClick={() => setTab('games')}>‹</button>
          ) : null}
        </div>
        <div className="tg-header-title">{headerTitle}</div>
        <div className="tg-header-right">
          {tab === 'games' && (
            <span className="header-balance num">
              {balance.toLocaleString(locale)}
              <StarIcon size={18} />
            </span>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main
        className={`page-content${
          tab === 'games' && gameView === 'blackjack'
            ? ' page-content--blackjack'
            : tab === 'games' && gameView === 'coinflip'
              ? ' page-content--coinflip'
              : tab === 'games' && gameView === 'minerush'
                ? ' page-content--minerush'
                : ''
        }`}
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
          ) : gameView === 'coinflip' ? (
            <CoinflipGame onBack={() => setGameView('lobby')} onBalanceUpdate={setBalance} />
          ) : gameView === 'minerush' ? (
            <MineRushGame onBack={() => setGameView('lobby')} onBalanceUpdate={setBalance} />
          ) : gameView === 'arena' ? (
            <ArenaGame onBack={() => setGameView('lobby')} onBalanceUpdate={setBalance} />
          ) : (
            <GamesScreen
              onOpenCases={openCasesGame}
              onOpenBlackjack={openBlackjackGame}
              onOpenCoinflip={openCoinflipGame}
              onOpenMineRush={openMineRushGame}
              onOpenArena={openArenaGame}
            />
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

      <TabBar active={tab} onChange={handleTabChange} />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {error && (
        <div style={{ padding: 10, fontSize: 10, background: '#000', color: '#0f0', maxHeight: 100, overflow: 'auto' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
