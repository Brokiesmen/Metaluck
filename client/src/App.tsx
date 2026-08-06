import { useState, useEffect, useCallback } from 'react';
import { api, setInitData } from './api';
import { useTelegram } from './hooks/useTelegram';
import { useSettings } from './settings/SettingsContext';
import { applyTheme } from './settings/applyTheme';
import { startTelegramViewportSync } from './lib/telegramViewport';
import { setDemoBalanceSnapshot, setDemoPrizePool } from './demo';
import { useDemoMode } from './demo/useDemoMode';
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
import { AviatorGame } from './components/AviatorGame';

type GameView = 'lobby' | 'cases' | 'blackjack' | 'coinflip' | 'minerush' | 'arena' | 'aviator';

export function App() {
  const { tg, user, initData, isDev } = useTelegram();
  const { t, locale, theme } = useSettings();
  const { isDemo, setDemo } = useDemoMode();
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

  const updateBalance = useCallback((b: number) => {
    setBalance(b);
    setDemoBalanceSnapshot(b);
  }, []);

  useEffect(() => {
    // @ts-ignore
    setLogs(window.startupLog || []);
    // @ts-ignore
    window.log = (m: string) => setLogs(prev => [...prev.slice(-10), m]);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, tg]);

  useEffect(() => startTelegramViewportSync(), []);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      applyTheme(theme);
    }

    Promise.all([api.getBalance(), api.getCases(), api.getPrizes()])
      .then(([bal, c, p]) => {
        updateBalance(bal);
        setCases(c);
        setPrizes(p);
        setDemoPrizePool(p);
      })
      .catch((err) => {
        console.error('Initial load failed:', err);
        setError(t.common.serverUnavailable);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per telegram session
  }, [tg, initData]);

  useEffect(() => {
    setDemoBalanceSnapshot(balance);
  }, [balance]);

  useEffect(() => {
    setDemoPrizePool(prizes);
  }, [prizes]);

  useEffect(() => {
    api.getCases().then(setCases).catch(() => {});
  }, [isDemo]);

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

  const openAviatorGame = useCallback(() => {
    setGameView('aviator');
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
                : gameView === 'aviator'
                  ? t.header.aviator
                  : t.header.metaluck
      : tab === 'leaders'
        ? t.header.leaders
        : tab === 'daily'
          ? t.header.daily
          : t.header.cabinet;

  return (
    <div className={`app${isDemo ? ' app--demo' : ''}`}>

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

      {isDemo && (
        <div className="demo-banner" role="status">
          <span className="demo-banner-label">{t.demo.label}</span>
          <span className="demo-banner-hint">{t.demo.hint}</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* Контент + навигация в одном контейнере: на телефоне — колонка (вкладки
          снизу), на десктопе — строка (вкладки уезжают в правую панель). */}
      <div className="app-body">
      <main
        className={`page-content${
          tab === 'games' && gameView === 'blackjack'
            ? ' page-content--blackjack'
            : tab === 'games' && gameView === 'coinflip'
              ? ' page-content--coinflip'
              : tab === 'games' && gameView === 'minerush'
                ? ' page-content--minerush'
                : tab === 'games' && gameView === 'aviator'
                  ? ' page-content--aviator'
                  : ''
        }`}
      >
        {tab === 'games' ? (
          gameView === 'cases' ? (
            <CaseGame
              cases={cases}
              prizes={prizes}
              onBack={() => setGameView('lobby')}
              onBalanceUpdate={updateBalance}
              onCasesReload={reloadCases}
              forceSelectFreeSignal={freeCaseJump}
            />
          ) : gameView === 'blackjack' ? (
            <BlackjackGame onBack={() => setGameView('lobby')} onBalanceUpdate={updateBalance} />
          ) : gameView === 'coinflip' ? (
            <CoinflipGame onBack={() => setGameView('lobby')} onBalanceUpdate={updateBalance} />
          ) : gameView === 'minerush' ? (
            <MineRushGame onBack={() => setGameView('lobby')} onBalanceUpdate={updateBalance} />
          ) : gameView === 'arena' ? (
            <ArenaGame onBack={() => setGameView('lobby')} onBalanceUpdate={updateBalance} />
          ) : gameView === 'aviator' ? (
            <AviatorGame onBack={() => setGameView('lobby')} onBalanceUpdate={updateBalance} />
          ) : (
            <GamesScreen
              isDemo={isDemo}
              onToggleDemo={() => setDemo(!isDemo)}
              onOpenCases={openCasesGame}
              onOpenBlackjack={openBlackjackGame}
              onOpenCoinflip={openCoinflipGame}
              onOpenMineRush={openMineRushGame}
              onOpenArena={openArenaGame}
              onOpenAviator={openAviatorGame}
            />
          )
        ) : tab === 'leaders' ? (
          <Leaders />
        ) : tab === 'daily' ? (
          <DailyTab
            prizes={prizes}
            cases={cases}
            onBalanceUpdate={updateBalance}
            onGoToFreeCase={goToFreeCase}
            openInvoice={tg?.openInvoice?.bind(tg)}
            isTelegram={!!tg}
          />
        ) : (
          <Cabinet
            user={user}
            balance={balance}
            isDev={isDev}
            onBalanceUpdate={updateBalance}
            openInvoice={tg?.openInvoice?.bind(tg)}
            isTelegram={!!tg}
            tg={tg}
          />
        )}
      </main>

      <TabBar active={tab} onChange={handleTabChange} />
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {error && (
        <div style={{ padding: 10, fontSize: 10, background: '#000', color: '#0f0', maxHeight: 100, overflow: 'auto' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
