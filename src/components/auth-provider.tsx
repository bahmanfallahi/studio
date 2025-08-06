'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


interface AuthContextType {
  user: User | null;
  login: (username: string, password_hash: string) => Promise<void>;
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

  const login = async (username: string, password_hash: string) => {
    setLoading(true);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username), where('password_hash', '==', password_hash));
    
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            throw new Error('Invalid username or password');
        }

        const foundUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
        setUser(foundUser);
        localStorage.setItem('coupon_crafter_user', JSON.stringify(foundUser));

    } catch (error) {
        console.error("Login failed:", error);
        throw error; // Re-throw the error to be caught by the login form
    } finally {
        setLoading(false);
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
