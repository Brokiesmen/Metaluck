import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthContextValue, AuthStatus, AuthUser } from './types';
import * as auth from './authService';

/** Контекст авторизации — состояние + методы. Логика в authService (бэкенд). Без UI. */
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  const apply = useCallback((u: AuthUser | null) => {
    setUser(u);
    setStatus(u ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    let alive = true;
    auth
      .bootstrap()
      .then((u) => { if (alive) apply(u); })
      .catch(() => { if (alive) apply(null); });
    return () => { alive = false; };
  }, [apply]);

  const loginTelegram = useCallback(async () => {
    const u = await auth.loginTelegram();
    apply(u);
    return u;
  }, [apply]);

  const loginGoogle = useCallback(async () => {
    const u = await auth.loginGoogle();
    apply(u);
    return u;
  }, [apply]);

  const logout = useCallback(() => {
    void auth.logout();
    apply(null);
  }, [apply]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isMiniApp: auth.isMiniApp(),
      loginTelegram,
      loginGoogle,
      logout,
      getCurrentUser: () => userRef.current,
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
