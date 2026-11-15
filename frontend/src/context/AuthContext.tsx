import { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthResponse } from '../types/auth';

import { apiFetch, setAuthToken, getAuthToken, purgeSession } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: any) => Promise<User>;
  logout: () => void;
  updateUserLocal: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore authenticated session from backend on page refresh
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const userData = await apiFetch<User>('/auth/me');
        if (isMounted) {
          if (userData && (userData.id || (userData as any)._id)) {
            setUser(userData);
          } else {
            purgeSession();
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        purgeSession();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    // 1. Purge any previous session/tokens to avoid cross-account identity bleeding
    purgeSession();
    setUser(null);

    // 2. Perform fresh authentication
    const response = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    });

    setAuthToken(response.access_token);

    // 3. Re-verify identity directly against /auth/me for 100% database agreement
    try {
      const verifiedProfile = await apiFetch<User>('/auth/me');
      setUser(verifiedProfile);
      return verifiedProfile;
    } catch {
      setUser(response.user);
      return response.user;
    }
  };

  const register = async (userData: any): Promise<User> => {
    purgeSession();
    setUser(null);

    const response = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    setAuthToken(response.access_token);

    try {
      const verifiedProfile = await apiFetch<User>('/auth/me');
      setUser(verifiedProfile);
      return verifiedProfile;
    } catch {
      setUser(response.user);
      return response.user;
    }
  };

  const logout = () => {
    purgeSession();
    setUser(null);
  };

  const updateUserLocal = (updatedFields: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedFields });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserLocal }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
