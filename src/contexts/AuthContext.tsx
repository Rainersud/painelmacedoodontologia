import React, { createContext, useContext } from 'react';

interface AuthContextType {
  user: { id: string } | null;
  session: null;
  loading: false;
  roleLoading: false;
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
  const value: AuthContextType = {
    user: { id: 'default-user' },
    session: null,
    loading: false,
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
