'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';

type AuthUser = {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readAccessToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('cityzen_access_token') ||
    localStorage.getItem('access_token')
  );
}

async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/user/profile/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }

  return payload || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const token = readAccessToken();
      if (!token) {
        setUser(null);
        return;
      }

      const profile = await fetchCurrentUser(token);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  const value = useMemo(
    () => ({ user, loading, refreshUser }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Keep app resilient if provider is not wired in layout yet.
    return {
      user: null,
      loading: false,
      refreshUser: async () => undefined,
    };
  }
  return context;
}
