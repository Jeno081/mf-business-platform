'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AdminApiError,
  apiFetch,
  enableRequest,
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
  setupRequest,
  type AdminUser,
  type EnableResponse,
  type LoginResponse,
  type SetupResponse,
  type SessionResponse,
} from '@/lib/api';

const TOKEN_KEY = 'mf_admin_access';

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    secondFactor?: { totp?: string; recoveryCode?: string },
  ) => Promise<LoginResponse>;
  startSetup: (setupToken: string) => Promise<SetupResponse>;
  enableSetup: (setupToken: string, code: string) => Promise<EnableResponse>;
  logout: () => Promise<void>;
  api: <T>(path: string, options?: Omit<Parameters<typeof apiFetch>[1], 'token'>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: SessionResponse) => {
    setToken(session.accessToken);
    setUser(session.user);
    window.sessionStorage.setItem(TOKEN_KEY, session.accessToken);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    window.sessionStorage.removeItem(TOKEN_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = window.sessionStorage.getItem(TOKEN_KEY);
      if (stored) {
        try {
          const result = await meRequest(stored);
          if (cancelled) return;
          setToken(stored);
          setUser(result.user);
          setLoading(false);
          return;
        } catch {
          window.sessionStorage.removeItem(TOKEN_KEY);
        }
      }

      try {
        const session = await refreshRequest();
        if (cancelled) return;
        applySession(session);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      secondFactor?: { totp?: string; recoveryCode?: string },
    ) => {
      const result = await loginRequest(email, password, secondFactor);
      if ('accessToken' in result) applySession(result);
      return result;
    },
    [applySession],
  );

  const startSetup = useCallback(async (setupToken: string) => setupRequest(setupToken), []);

  const enableSetup = useCallback(
    async (setupToken: string, code: string) => {
      const result = await enableRequest(setupToken, code);
      applySession(result);
      return result;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // On efface quand même la session locale.
    }
    clearSession();
  }, [clearSession]);

  const api = useCallback(
    async <T,>(
      path: string,
      options: Omit<Parameters<typeof apiFetch>[1], 'token'> = {},
    ): Promise<T> => {
      const current = token ?? window.sessionStorage.getItem(TOKEN_KEY);

      try {
        return await apiFetch<T>(path, { ...options, token: current });
      } catch (error) {
        if (!(error instanceof AdminApiError) || error.status !== 401) throw error;
        try {
          const session = await refreshRequest();
          applySession(session);
          return await apiFetch<T>(path, { ...options, token: session.accessToken });
        } catch {
          clearSession();
          throw error;
        }
      }
    },
    [token, applySession, clearSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, startSetup, enableSetup, logout, api }),
    [user, token, loading, login, startSetup, enableSetup, logout, api],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}
