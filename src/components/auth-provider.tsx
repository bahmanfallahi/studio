'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, users } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  login: (username: string, password_hash: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load user from localStorage on initial load
    try {
      const storedUser = localStorage.getItem('coupon_crafter_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error)
      localStorage.removeItem('coupon_crafter_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (username: string, password_hash: string) => {
    const foundUser = users.find(
      (u) => u.username === username && u.password_hash === password_hash
    );

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('coupon_crafter_user', JSON.stringify(foundUser));
    } else {
      throw new Error('Invalid username or password');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('coupon_crafter_user');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
