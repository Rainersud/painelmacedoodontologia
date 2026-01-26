import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'agente';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  role: AppRole | null;
  fullName: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper to check if an error is an AbortError (safe to ignore)
function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('aborted');
  }
  if (typeof error === 'object' && 'name' in error) {
    return (error as { name: string }).name === 'AbortError';
  }
  return false;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  const fetchUserData = async (userId: string) => {
    setRoleLoading(true);
    try {
      // Fetch user role with timeout
      const rolePromise = supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
      const roleTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const { data: roleData, error: roleError } = await Promise.race([
        rolePromise,
        roleTimeout
      ]) as any;

      if (roleData?.role) {
        setRole(roleData.role as AppRole);
      } else {
        setRole(null);
      }

      // Fetch profile with timeout
      const profilePromise = supabase.from('profiles').select('full_name').eq('user_id', userId).maybeSingle();
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const { data: profileData, error: profileError } = await Promise.race([
        profilePromise,
        profileTimeout
      ]) as any;

      if (profileData?.full_name) {
        setFullName(profileData.full_name);
      } else {
        setFullName(null);
      }
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Error fetching user data:', error);
      }
      setRole(null);
      setFullName(null);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initTimeout: NodeJS.Timeout;

    // Check for existing session first
    const initializeAuth = async () => {
      try {
        // Set a safety timeout
        initTimeout = setTimeout(() => {
          if (isMounted) {
            console.warn('[AuthContext] Init timeout, completing load');
            setLoading(false);
            setRoleLoading(false);
          }
        }, 5000);

        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 4000)
        );
        
        const { data: { session: currentSession }, error } = await Promise.race([
          sessionPromise,
          sessionTimeout
        ]) as any;
        
        if (!isMounted) return;
        clearTimeout(initTimeout);

        if (error) {
          if (!isAbortError(error)) {
            console.error('Session error:', error);
          }
          setSession(null);
          setUser(null);
          setRoleLoading(false);
          setLoading(false);
          return;
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setLoading(false);
          fetchUserData(currentSession.user.id);
        } else {
          setRoleLoading(false);
          setLoading(false);
        }
      } catch (error) {
        if (!isAbortError(error)) {
          console.error('Error initializing auth:', error);
        }
        if (isMounted) {
          setSession(null);
          setUser(null);
          setRoleLoading(false);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        
        // Handle sign out or token refresh failures
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !newSession) {
          setSession(null);
          setUser(null);
          setRole(null);
          setFullName(null);
          setRoleLoading(false);
          return;
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await fetchUserData(newSession.user.id);
        } else {
          setRole(null);
          setFullName(null);
          setRoleLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Erro desconhecido') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Erro desconhecido') };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Error signing out:', error);
      }
    }
    setRole(null);
    setFullName(null);
  };

  const value = {
    user,
    session,
    loading,
    roleLoading,
    role,
    fullName,
    signUp,
    signIn,
    signOut,
    isAdmin: role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
