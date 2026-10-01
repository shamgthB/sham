import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Resident, HostelSettings } from '../types';
import { api, setAuthSession, clearAuthSession, getStoredUser } from '../lib/api';

interface AuthContextType {
  user: User | null;
  resident: Resident | null;
  settings: HostelSettings | null;
  loading: boolean;
  login: (identifier: string, password: string, role?: 'admin' | 'resident') => Promise<any>;
  logout: () => void;
  quickSwitchUser: (username: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [resident, setResident] = useState<Resident | null>(null);
  const [settings, setSettings] = useState<HostelSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load stored auth session on startup
  useEffect(() => {
    async function initAuth() {
      const stored = getStoredUser();
      if (stored) {
        setUser(stored.user);
        if (stored.resident) setResident(stored.resident);
        try {
          // Verify with backend
          const res = await api.getCurrentUser();
          setUser(res.user);
          if (res.resident) setResident(res.resident);
        } catch {
          // Session expired or server restart
          clearAuthSession();
          setUser(null);
          setResident(null);
        }
      }

      // Load settings
      try {
        const s = await api.getSettings();
        setSettings(s);
      } catch (e) {
        console.error('Failed to load settings', e);
      }

      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (identifier: string, password: string, role?: 'admin' | 'resident') => {
    const res = await api.login(identifier, password, role);
    if (res.pendingApproval || res.rejected) {
      return res;
    }
    if (res.token) {
      setAuthSession(res.token, res.user, res.resident);
      setUser(res.user);
      setResident(res.resident || null);
    }
    return res;
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
    setResident(null);
  };

  const quickSwitchUser = async (username: string) => {
    const pwd = username === 'admin' ? 'admin123' : 'resident123';
    const role = username === 'admin' ? 'admin' : 'resident';
    await login(username, pwd, role);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getCurrentUser();
      setUser(res.user);
      if (res.resident) setResident(res.resident);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        resident,
        settings,
        loading,
        login,
        logout,
        quickSwitchUser,
        refreshProfile,
        refreshSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
