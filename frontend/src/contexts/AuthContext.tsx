import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import apiClient from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sharp_jwt_token');
    localStorage.removeItem('sharp_user');
  }, []);

  useEffect(() => {
    let isMounted = true;
    const savedToken = localStorage.getItem('sharp_jwt_token');

    if (!savedToken) {
      setLoading(false);
      return;
    }

    setToken(savedToken);

    const validateSession = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (!isMounted) return;
        const me = res.data?.data;
        if (me && me.username) {
          const verifiedUser: User = {
            id: me.id,
            username: me.username,
            email: me.email,
            role: me.role as 'ROLE_ADMIN' | 'ROLE_OPERATOR',
          };
          setUser(verifiedUser);
          localStorage.setItem('sharp_user', JSON.stringify(verifiedUser));
        } else {
          logout();
        }
      } catch (err: any) {
        if (!isMounted) return;
        // Clear stale session if token is invalid/expired or unauthorized
        if (err?.response?.status === 401 || err?.response?.status === 403 || !err?.response) {
          logout();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = useCallback((authData: AuthResponse) => {
    const userData: User = {
      id: authData.id,
      username: authData.username,
      email: authData.email,
      role: authData.role as 'ROLE_ADMIN' | 'ROLE_OPERATOR',
    };
    setToken(authData.token);
    setUser(userData);
    localStorage.setItem('sharp_jwt_token', authData.token);
    localStorage.setItem('sharp_user', JSON.stringify(userData));
  }, []);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isAdmin, login, logout, loading }}>
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
