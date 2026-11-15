import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/** Entrada do painel: cada pessoa entra com o e-mail e a senha criados em Configurações → Usuários. */
export default function Login() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);

  if (!loading && user) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Digite seu e-mail.'); return; }
    setBusy(true);
    try {
      if (resetMode) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (err) throw err;
        toast.success('Enviamos um link para criar uma nova senha. Confira seu e-mail.');
        setResetMode(false);
        return;
      }
      if (!password) { setError('Digite sua senha.'); return; }
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError('E-mail ou senha incorretos. Confira e tente de novo.');
        return;
      }
      navigate(from, { replace: true });
    } catch {
      setError('Não foi possível concluir agora. Tente de novo em instantes.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={submit} className="monday-card w-full max-w-sm p-6 sm:p-8 space-y-5" noValidate>
        <div className="space-y-2 text-center">
          <span className="mx-auto h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <LockKeyhole className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold">Painel Macedo Odontologia</h1>
          <p className="text-sm text-muted-foreground">
            {resetMode ? 'Informe seu e-mail para receber o link de nova senha.' : 'Entre com seu e-mail e senha.'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-email">E-mail</Label>
          <Input id="login-email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="nome@exemplo.com" />
        </div>
        {!resetMode && (
          <div className="space-y-1.5">
            <Label htmlFor="login-senha">Senha</Label>
            <Input id="login-senha" type="password" autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
          </div>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {resetMode ? 'Enviar link' : 'Entrar'}
        </Button>
        <button type="button" className="w-full text-center text-sm text-primary hover:underline" onClick={() => { setResetMode(m => !m); setError(''); }}>
          {resetMode ? 'Voltar para entrar' : 'Esqueci minha senha'}
        </button>
      </form>
    </div>
  );
}
