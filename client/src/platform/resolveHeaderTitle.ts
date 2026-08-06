import type { Dict } from '../i18n/dictionaries';
import type { AppSection, GameView, ProfileView } from './types';

export function resolveHeaderTitle(
  t: Dict,
  args: {
    section: AppSection;
    gameView: GameView;
    profileView: ProfileView;
  },
): string {
  const { section, gameView, profileView } = args;

  if (section === 'home') return t.desktop.dashboard;

  if (section === 'games') {
    if (gameView === 'cases') return t.header.cases;
    if (gameView === 'blackjack') return t.header.blackjack;
    if (gameView === 'coinflip') return t.header.coinflip;
    if (gameView === 'minerush') return t.header.minerush;
    if (gameView === 'arena') return t.header.arena;
    if (gameView === 'aviator') return t.header.aviator;
    return t.header.metaluck;
  }

  if (section === 'leaders') return t.header.leaders;
  if (section === 'rewards') return t.header.daily;
  if (section === 'wallet') return t.header.wallet;
  if (section === 'profile' && profileView === 'admin') return t.admin.title;
  return t.header.cabinet;
}
