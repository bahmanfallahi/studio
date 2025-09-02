
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { UserProfile } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  login: (email: string, password_hash: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchProfile = useCallback(async (user: User | null) => {
    try {
      setLoading(true);
      if (!user) {
          setProfile(null);
          return;
      }
      
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
        setProfile(null);
      } else {
        setProfile(userProfile);
      }
    } finally {
        setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser);
      // No need to setLoading(false) here, fetchProfile handles it.
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = session?.user ?? null;
        if (user?.id !== currentUser?.id) {
          setUser(currentUser);
          await fetchProfile(currentUser);
        }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, user]);

  const login = async (email: string, password_hash: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password_hash,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const value = {
    user,
    profile,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    