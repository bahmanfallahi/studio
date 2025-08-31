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
    if (!user) {
        setProfile(null);
        return;
    }
    // Temporary check for hardcoded test user
    if (user.email === 'bahman.f.behtash@gmail.com') {
      setProfile({
        id: user.id,
        full_name: 'بهمن بهتاش (تست)',
        role: 'manager',
        coupon_limit_per_month: 999
      });
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
  }, [supabase]);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setLoading(true);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await fetchProfile(currentUser);
        setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const login = async (email: string, password_hash: string) => {
    // Temporary hardcoded login for testing
    if (email === 'bahman.f.behtash@gmail.com' && password_hash === 'Bahman123!') {
        console.log("Attempting temporary login...");
        const mockUser = {
            id: '00000000-0000-0000-0000-000000000001', // mock UUID
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: 'بهمن بهتاش (تست)' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: 'bahman.f.behtash@gmail.com',
            role: 'authenticated'
        } as User;
        
        setUser(mockUser);
        await fetchProfile(mockUser);
        return;
    }

    // Original login logic
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password_hash,
    });
    if (error) throw error;
  };

  const logout = async () => {
    // Also handle logout for temporary user
    if (user?.email === 'bahman.f.behtash@gmail.com') {
      setUser(null);
      setProfile(null);
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    }
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
