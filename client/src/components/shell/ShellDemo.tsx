import './shell.css';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlatformProvider, type Platform } from './PlatformProvider';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginScreen } from './LoginScreen';
import { AppShell } from './AppShell';
import { GamesLobby } from './pages/GamesLobby';
import { ProfilePage } from './pages/ProfilePage';
import { BalancePage } from './pages/BalancePage';
import { RewardsPage } from './pages/RewardsPage';

/**
 * Гейт авторизации (UI-слой поверх независимого AuthProvider):
 * Telegram Mini App или уже авторизован → приложение; браузер без сессии → LoginScreen.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const { status, isMiniApp } = useAuth();
  if (status === 'loading') {
    return (
      <div className="sh-shell sh-login-wrap">
        <div className="sh-login"><span className="sh-login-name">Metaluck</span></div>
      </div>
    );
  }
  if (!isMiniApp && status === 'unauthenticated') return <LoginScreen />;
  return <>{children}</>;
}

/**
 * Общий UI-слой как приложение. Авторизация независима от UI (AuthProvider),
 * маршруты /, /profile, /balance, /rewards.
 */
export function ShellDemo({ force }: { force?: Platform }) {
  return (
    <PlatformProvider force={force}>
      <AuthProvider>
        <AuthGate>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<GamesLobby />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/balance" element={<BalancePage />} />
                <Route path="/rewards" element={<RewardsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </PlatformProvider>
  );
}
