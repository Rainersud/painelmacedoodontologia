import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { buildAccess, setCurrentAccess, type Access, type Perfil } from '@/lib/access';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  role: 'admin' | 'agente';
  fullName: string;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  /** Pode ajustar metas e regras (só o admin). */
  canManage: boolean;
  /** O que este usuário pode ver e fazer (lib/access). */
  access: Access;
  /** É administrador de verdade (mesmo enquanto visualiza como outra pessoa). */
  realIsAdmin: boolean;
  /** Administrador visualizando o sistema como um colaborador */
  previewAs: { perfil: Perfil; name: string } | null;
  setPreviewAs: (p: { perfil: Perfil; name: string } | null) => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'agente'>('agente');
  const [roleLoading, setRoleLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [previewAs, setPreviewState] = useState<{ perfil: Perfil; name: string } | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('preview-as') || 'null'); } catch { return null; }
  });
  const setPreviewAs = (p: { perfil: Perfil; name: string } | null) => {
    try { if (p) sessionStorage.setItem('preview-as', JSON.stringify(p)); else sessionStorage.removeItem('preview-as'); } catch { /* sem storage */ }
    setPreviewState(p);
  };
  const initialized = useRef(false);

  const fetchUserData = async (userId: string) => {
    setRoleLoading(true);
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      setRole((roleData?.role as 'admin' | 'agente') || 'agente');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      setFullName(profile?.full_name || '');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
      const { data: acc } = await (supabase as any).from('user_access').select('perfil').eq('user_id', userId).maybeSingle();
      setPerfil((acc?.perfil as Perfil) ?? null);
    } catch {
      setRole('agente');
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip the first event if getSession already handled it
      if (!initialized.current) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole('agente');
        setFullName('');
        setRoleLoading(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setRoleLoading(false);
      }
      setLoading(false);
      // Mark as initialized so onAuthStateChange can take over
      initialized.current = true;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole('agente');
    setFullName('');
    setPerfil(null);
    setPreviewAs(null);
  };

  const realIsAdmin = role === 'admin';
  // "Visualizar como": o administrador vê e usa o sistema com o acesso do colaborador
  const preview = realIsAdmin ? previewAs : null;
  const isAdmin = realIsAdmin && !preview;
  const access = React.useMemo(
    () => (preview ? buildAccess(false, preview.perfil) : buildAccess(realIsAdmin, perfil)),
    [preview, realIsAdmin, perfil],
  );
  setCurrentAccess(access);

  const value: AuthContextType = {
    user,
    session,
    loading,
    roleLoading,
    role,
    fullName,
    signUp,
    signIn,
    signOut,
    isAdmin,
    canManage: isAdmin,
    access,
    realIsAdmin,
    previewAs: preview,
    setPreviewAs,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
