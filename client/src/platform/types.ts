import type { Tab } from '../components/TabBar';
import type { DesktopNavId } from '../components/desktop/DesktopShell';

/** Единые секции приложения — и для Telegram TabBar, и для Desktop Sidebar. */
export type AppSection =
  | 'home'
  | 'games'
  | 'wallet'
  | 'rewards'
  | 'leaders'
  | 'profile';

export type GameView =
  | 'lobby'
  | 'cases'
  | 'blackjack'
  | 'coinflip'
  | 'minerush'
  | 'arena'
  | 'aviator';

export type ProfileView = 'main' | 'admin';

export function sectionToTab(section: AppSection): Tab {
  switch (section) {
    case 'wallet':
      return 'wallet';
    case 'rewards':
      return 'daily';
    case 'leaders':
      return 'leaders';
    case 'profile':
      return 'cabinet';
    case 'home':
    case 'games':
    default:
      return 'games';
  }
}

export function tabToSection(tab: Tab): AppSection {
  switch (tab) {
    case 'wallet':
      return 'wallet';
    case 'daily':
      return 'rewards';
    case 'leaders':
      return 'leaders';
    case 'cabinet':
      return 'profile';
    case 'games':
    default:
      return 'games';
  }
}

export function sectionToDesktopNav(section: AppSection): DesktopNavId {
  switch (section) {
    case 'home':
      return 'dashboard';
    case 'wallet':
      return 'wallet';
    case 'rewards':
      return 'rewards';
    case 'profile':
      return 'profile';
    case 'leaders':
      return 'leaders';
    case 'games':
    default:
      return 'games';
  }
}

export function desktopNavToSection(nav: DesktopNavId): AppSection {
  switch (nav) {
    case 'dashboard':
      return 'home';
    case 'wallet':
      return 'wallet';
    case 'rewards':
      return 'rewards';
    case 'profile':
      return 'profile';
    case 'leaders':
      return 'leaders';
    case 'games':
    default:
      return 'games';
  }
}

export function pageContentModifier(section: AppSection, gameView: GameView): string {
  if (section !== 'games') return '';
  if (gameView === 'blackjack') return ' page-content--blackjack';
  if (gameView === 'coinflip') return ' page-content--coinflip';
  if (gameView === 'minerush') return ' page-content--minerush';
  if (gameView === 'aviator') return ' page-content--aviator';
  return '';
}
