import { AdminHubScreen } from '../components/AdminHubScreen';
import { ArenaGame } from '../components/ArenaGame';
import { BlackjackGame } from '../components/BlackjackGame';
import { Cabinet } from '../components/Cabinet';
import { CaseGame } from '../components/CaseGame';
import { CoinflipGame } from '../components/CoinflipGame';
import { DailyTab } from '../components/DailyTab';
import { GamesScreen } from '../components/GamesScreen';
import { Leaders } from '../components/Leaders';
import { MineRushGame } from '../components/MineRushGame';
import { WalletScreen } from '../components/WalletScreen';
import { PhaserGameHost } from '../games/host/PhaserGameHost';
import { isPhaserAppGame, phaserIdForAppGame } from '../games/catalog';
import { useAviatorRuntime } from './useAviatorRuntime';
import { HomeDashboard } from './HomeDashboard';
import type { AppNavigation } from './useAppNavigation';
import type { AppSession } from './useAppSession';
import { useSettings } from '../settings/SettingsContext';

interface Props {
  session: AppSession;
  nav: AppNavigation;
}

/**
 * Единый UI-слой страниц: одни и те же экраны для Telegram Mini App и Desktop Web.
 * Оболочки (TabBar / Sidebar) только выбирают section — контент не дублируется.
 */
export function AppMainContent({ session, nav }: Props) {
  const {
    user,
    tg,
    isDev,
    isAdmin,
    isTelegramWebApp,
    isDemo,
    setDemo,
    balance,
    cases,
    prizes,
    displayName,
    openInvoice,
    updateBalance,
    reloadCases,
    openSettings,
  } = session;

  const {
    section,
    gameView,
    profileView,
    freeCaseJump,
    goSection,
    openGame,
    backToGamesLobby,
    openFreeCase,
    openAdmin,
    closeAdmin,
  } = nav;

  const { t } = useSettings();
  // Live REST/WS transport + localized copy for the Phaser Aviator module.
  const aviatorOptions = useAviatorRuntime(section === 'games' && gameView === 'aviator');

  if (section === 'home') {
    return (
      <HomeDashboard
        userName={displayName}
        balance={balance}
        onNavigate={goSection}
      />
    );
  }

  if (section === 'games') {
    if (gameView === 'cases') {
      return (
        <CaseGame
          cases={cases}
          prizes={prizes}
          onBack={backToGamesLobby}
          onBalanceUpdate={updateBalance}
          onCasesReload={reloadCases}
          forceSelectFreeSignal={freeCaseJump}
          isDemo={isDemo}
          onToggleDemo={setDemo}
        />
      );
    }

    // Phaser engine (GameManager) — replaces legacy React canvases for wired games.
    if (isPhaserAppGame(gameView)) {
      const phaserId = phaserIdForAppGame(gameView);
      if (phaserId && (gameView !== 'aviator' || aviatorOptions)) {
        return (
          <PhaserGameHost
            gameId={phaserId}
            balance={balance}
            bet={10}
            onBack={backToGamesLobby}
            onBalanceUpdate={updateBalance}
            backLabel={t.common.backGames}
            options={gameView === 'aviator' ? aviatorOptions ?? undefined : undefined}
          />
        );
      }
    }

    if (gameView === 'blackjack') {
      return <BlackjackGame onBack={backToGamesLobby} onBalanceUpdate={updateBalance} />;
    }
    if (gameView === 'coinflip') {
      return <CoinflipGame onBack={backToGamesLobby} onBalanceUpdate={updateBalance} />;
    }
    if (gameView === 'minerush') {
      return <MineRushGame onBack={backToGamesLobby} onBalanceUpdate={updateBalance} />;
    }
    if (gameView === 'arena') {
      return <ArenaGame onBack={backToGamesLobby} onBalanceUpdate={updateBalance} />;
    }
    return (
      <GamesScreen
        isDemo={isDemo}
        onToggleDemo={setDemo}
        onOpenCases={() => openGame('cases')}
        onOpenBlackjack={() => openGame('blackjack')}
        onOpenCoinflip={() => openGame('coinflip')}
        onOpenMineRush={() => openGame('minerush')}
        onOpenArena={() => openGame('arena')}
        onOpenAviator={() => openGame('aviator')}
      />
    );
  }

  if (section === 'leaders') return <Leaders />;

  if (section === 'rewards') {
    return (
      <DailyTab
        prizes={prizes}
        cases={cases}
        onBalanceUpdate={updateBalance}
        onGoToFreeCase={openFreeCase}
        openInvoice={openInvoice}
        isTelegram={isTelegramWebApp}
      />
    );
  }

  if (section === 'wallet') {
    return (
      <WalletScreen
        onBalanceUpdate={updateBalance}
        openInvoice={openInvoice}
        isTelegram={isTelegramWebApp}
      />
    );
  }

  if (profileView === 'admin') {
    return <AdminHubScreen onBack={closeAdmin} />;
  }

  return (
    <Cabinet
      user={user}
      balance={balance}
      isDev={isDev}
      isAdmin={isAdmin}
      onOpenAdmin={openAdmin}
      onOpenSettings={openSettings}
      onBalanceUpdate={updateBalance}
      openInvoice={openInvoice}
      isTelegram={isTelegramWebApp}
      tg={tg}
    />
  );
}
