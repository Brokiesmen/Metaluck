import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthContextValue, AuthStatus, AuthUser } from './types';
import * as auth from './authService';

/** Контекст авторизации — состояние + методы. Никакого UI внутри. */
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const current = auth.getCurrentUser();
    setUser(current);
    setStatus(current ? 'authenticated' : 'unauthenticated');
  }, []);

  const loginTelegram = useCallback(async () => {
    const u = await auth.loginTelegram();
    setUser(u);
    setStatus('authenticated');
    return u;
  }, []);

  const loginGoogle = useCallback(async () => {
    const u = await auth.loginGoogle();
    setUser(u);
    setStatus('authenticated');
    return u;
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isMiniApp: auth.isMiniApp(),
      loginTelegram,
      loginGoogle,
      logout,
      getCurrentUser: auth.getCurrentUser,
    }),
    [user, status, loginTelegram, loginGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
