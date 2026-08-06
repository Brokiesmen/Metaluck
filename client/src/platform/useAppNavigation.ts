import { useCallback, useState } from 'react';
import type { Tab } from '../components/TabBar';
import type { DesktopNavId } from '../components/desktop/DesktopShell';
import {
  desktopNavToSection,
  sectionToDesktopNav,
  sectionToTab,
  tabToSection,
  type AppSection,
  type GameView,
  type ProfileView,
} from './types';

export interface AppNavigation {
  section: AppSection;
  gameView: GameView;
  profileView: ProfileView;
  freeCaseJump: number;
  /** Telegram TabBar active tab (derived). */
  tab: Tab;
  /** Desktop sidebar active item (derived). */
  desktopNav: DesktopNavId;
  goSection: (section: AppSection) => void;
  goTab: (tab: Tab) => void;
  goDesktopNav: (nav: DesktopNavId) => void;
  openGame: (view: Exclude<GameView, 'lobby'>) => void;
  backToGamesLobby: () => void;
  openFreeCase: () => void;
  openAdmin: () => void;
  closeAdmin: () => void;
  reset: () => void;
}

export function useAppNavigation(initial: AppSection = 'games'): AppNavigation {
  const [section, setSection] = useState<AppSection>(initial);
  const [gameView, setGameView] = useState<GameView>('lobby');
  const [profileView, setProfileView] = useState<ProfileView>('main');
  const [freeCaseJump, setFreeCaseJump] = useState(0);

  const goSection = useCallback((next: AppSection) => {
    setSection(next);
    if (next === 'games' || next === 'home') setGameView('lobby');
    if (next !== 'profile') setProfileView('main');
  }, []);

  const goTab = useCallback((tab: Tab) => {
    goSection(tabToSection(tab));
  }, [goSection]);

  const goDesktopNav = useCallback((nav: DesktopNavId) => {
    goSection(desktopNavToSection(nav));
  }, [goSection]);

  const openGame = useCallback((view: Exclude<GameView, 'lobby'>) => {
    setSection('games');
    setGameView(view);
  }, []);

  const backToGamesLobby = useCallback(() => {
    setSection('games');
    setGameView('lobby');
  }, []);

  const openFreeCase = useCallback(() => {
    setSection('games');
    setGameView('cases');
    setFreeCaseJump((v) => v + 1);
  }, []);

  const openAdmin = useCallback(() => {
    setSection('profile');
    setProfileView('admin');
  }, []);

  const closeAdmin = useCallback(() => {
    setProfileView('main');
  }, []);

  const reset = useCallback(() => {
    setSection(initial);
    setGameView('lobby');
    setProfileView('main');
  }, [initial]);

  return {
    section,
    gameView,
    profileView,
    freeCaseJump,
    tab: sectionToTab(section),
    desktopNav: sectionToDesktopNav(section),
    goSection,
    goTab,
    goDesktopNav,
    openGame,
    backToGamesLobby,
    openFreeCase,
    openAdmin,
    closeAdmin,
    reset,
  };
}
