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

  const fetchUserData = async (userId: string, signal?: AbortSignal) => {
    setRoleLoading(true);
    try {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Check abort after await
      if (signal?.aborted) return;

      if (roleError && !isAbortError(roleError)) {
        console.error('Error fetching role:', roleError);
      }
      
      if (roleData) {
        setRole(roleData.role as AppRole);
      } else {
        setRole(null);
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Check abort after await
      if (signal?.aborted) return;

      if (profileError && !isAbortError(profileError)) {
        console.error('Error fetching profile:', profileError);
      }
      
      if (profileData) {
        setFullName(profileData.full_name);
      }
    } catch (error) {
      // Suppress AbortError (happens during unmount/strict mode)
      if (!isAbortError(error)) {
        console.error('Error fetching user data:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setRoleLoading(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    // Check for existing session first
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (abortController.signal.aborted || !isMounted) return;

        // Handle refresh token errors gracefully (user will need to re-login)
        if (error) {
          if (!isAbortError(error)) {
            console.warn('Session error (user may need to re-login):', error.message);
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
          await fetchUserData(currentSession.user.id, abortController.signal);
        } else {
          setRoleLoading(false);
        }
      } catch (error) {
        if (!isAbortError(error)) {
          console.error('Error initializing auth:', error);
        }
        if (isMounted && !abortController.signal.aborted) {
          setRoleLoading(false);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted || abortController.signal.aborted) return;
        
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
          // Use a new abort controller for this callback
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
      abortController.abort();
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
