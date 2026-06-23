import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

import { api, clearToken, getToken, setToken } from '@/src/api/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const u = await api<AuthUser>('/auth/me');
      setUser(u);
    } catch {
      setUser(null);
      await clearToken();
    }
  }, []);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) await loadMe();
      setLoading(false);
    })();
  }, [loadMe]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    await setToken(res.access_token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
