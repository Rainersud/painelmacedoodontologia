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
   console.log('[AuthContext] Fetching user data for:', userId);
    try {
     const startTime = Date.now();
     console.log('[AuthContext] Querying user_roles table...');
     
       // Fetch user role with timeout
       let roleData = null;
       let roleError = null;
       
       try {
         const result = await Promise.race([
           supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
           new Promise((_, reject) => setTimeout(() => reject(new Error('Role query timeout')), 5000))
         ]);
         roleData = (result as any).data;
         roleError = (result as any).error;
       } catch (err) {
         console.error('[AuthContext] Role query failed or timeout:', err);
         roleError = err;
       }
      
     console.log('[AuthContext] user_roles query took:', Date.now() - startTime, 'ms');
     console.log('[AuthContext] roleData:', roleData, 'roleError:', roleError);
     
      // Check abort after await
      if (signal?.aborted) return;

      if (roleError && !isAbortError(roleError)) {
        console.error('Error fetching role:', roleError);
       // If role fetch fails, default to null but continue
       setRole(null);
     } else if (roleData) {
       console.log('[AuthContext] Role found:', roleData.role);
        setRole(roleData.role as AppRole);
      } else {
       console.log('[AuthContext] No role found for user');
        setRole(null);
      }

     const profileStartTime = Date.now();
     console.log('[AuthContext] Querying profiles table...');
     
       // Fetch profile with timeout
       let profileData = null;
       let profileError = null;
       
       try {
         const result = await Promise.race([
           supabase.from('profiles').select('full_name').eq('user_id', userId).maybeSingle(),
           new Promise((_, reject) => setTimeout(() => reject(new Error('Profile query timeout')), 5000))
         ]);
         profileData = (result as any).data;
         profileError = (result as any).error;
       } catch (err) {
         console.error('[AuthContext] Profile query failed or timeout:', err);
         profileError = err;
       }
      
     console.log('[AuthContext] profiles query took:', Date.now() - profileStartTime, 'ms');
     console.log('[AuthContext] profileData:', profileData, 'profileError:', profileError);
     
      // Check abort after await
      if (signal?.aborted) return;

      if (profileError && !isAbortError(profileError)) {
        console.error('Error fetching profile:', profileError);
       // If profile fetch fails, use email as fallback
       setFullName(null);
     } else if (profileData) {
       console.log('[AuthContext] Profile found:', profileData.full_name);
        setFullName(profileData.full_name);
     } else {
       console.log('[AuthContext] No profile found for user');
       setFullName(null);
      }
    } catch (error) {
      // Suppress AbortError (happens during unmount/strict mode)
      if (!isAbortError(error)) {
        console.error('Error fetching user data:', error);
      }
     // On any error, ensure we don't get stuck
     setRole(null);
     setFullName(null);
    } finally {
      if (!signal?.aborted) {
       console.log('[AuthContext] Role loading complete');
        setRoleLoading(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
   console.log('[AuthContext] Initializing auth...');

    // Check for existing session first
    const initializeAuth = async () => {
      try {
       console.log('[AuthContext] Getting session...');
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
        
       console.log('[AuthContext] Session:', currentSession ? 'found' : 'not found');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id, abortController.signal);
        } else {
         console.log('[AuthContext] No user session, completing loading');
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
         console.log('[AuthContext] Auth initialization complete');
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
