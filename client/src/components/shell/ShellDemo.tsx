import './shell.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlatformProvider, type Platform } from './PlatformProvider';
import { AppShell } from './AppShell';
import { GamesLobby } from './pages/GamesLobby';
import { ProfilePage } from './pages/ProfilePage';
import { BalancePage } from './pages/BalancePage';
import { RewardsPage } from './pages/RewardsPage';
import { SettingsPage } from './pages/SettingsPage';

/**
 * Общий UI-слой как приложение: маршруты /, /profile, /balance, /rewards, /settings.
 * AppShell (layout) выбирает Telegram/Desktop shell — страницы о платформе не знают.
 * `force` — превью конкретного shell'а.
 */
export function ShellDemo({ force }: { force?: Platform }) {
  return (
    <PlatformProvider force={force}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<GamesLobby />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/balance" element={<BalancePage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PlatformProvider>
  );
}
