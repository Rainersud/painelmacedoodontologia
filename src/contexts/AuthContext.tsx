import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: { id: string } | null;
  session: unknown;
  loading: boolean;
  roleLoading: boolean;
  role: 'admin';
  fullName: string;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: null }>;
  signIn: (email: string, password: string) => Promise<{ error: null }>;
  signOut: () => Promise<void>;
  isAdmin: true;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id } : { id: 'default-user' });
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id } : { id: 'default-user' });
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    session: null,
    loading,
    roleLoading: false,
    role: 'admin',
    fullName: 'Administrador',
    signUp: async () => ({ error: null }),
    signIn: async () => ({ error: null }),
    signOut: async () => {},
    isAdmin: true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
