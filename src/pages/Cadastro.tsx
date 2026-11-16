import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Link de cadastro para colaboradores: a pessoa cria o próprio login e senha.
 * A conta nasce sem acesso; o administrador define a função em Configurações → Usuários.
 */
export default function Cadastro() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 3) { setError('Digite seu nome completo.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Digite um e-mail válido.'); return; }
    if (password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('As duas senhas não são iguais.'); return; }
    setBusy(true);
    try {
      // conta criada já confirmada (sem e-mail de confirmação) e "Aguardando liberação"
      const { data, error: fnErr } = await supabase.functions.invoke('self-signup', {
        body: { full_name: name.trim(), email: email.trim(), password },
      });
      if (fnErr || data?.error) {
        let msg = data?.error as string | undefined;
        if (!msg && fnErr && 'context' in fnErr) {
          try { msg = (await (fnErr as { context: Response }).context.json())?.error; } catch { /* sem corpo */ }
        }
        setError(msg || 'Não foi possível criar a conta agora. Tente de novo em instantes.');
        return;
      }
      const { error: loginErr } = await signIn(email.trim(), password);
      if (loginErr) { setCheckEmail(true); return; }
      navigate('/', { replace: true });
    } catch {
      setError('Não foi possível criar a conta agora. Confira sua internet e tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="monday-card w-full max-w-sm p-8 text-center space-y-3">
          <MailCheck className="h-8 w-8 mx-auto text-primary" aria-hidden />
          <h1 className="text-xl font-semibold">Conta criada</h1>
          <p className="text-sm text-muted-foreground">
            Entre com <strong>{email.trim()}</strong> e a senha que você criou.
            Seu acesso fica liberado quando o administrador definir sua função.
          </p>
          <Button asChild variant="outline"><Link to="/login">Ir para entrar</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={submit} className="monday-card w-full max-w-sm p-6 sm:p-8 space-y-4" noValidate>
        <div className="space-y-2 text-center">
          <span className="mx-auto h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <UserPlus className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold">Criar meu acesso</h1>
          <p className="text-sm text-muted-foreground">Painel Macedo Odontologia. Depois de criar, o administrador libera sua função.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cad-nome">Nome completo</Label>
          <Input id="cad-nome" autoComplete="name" value={name} onChange={e => { setName(e.target.value); setError(''); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cad-email">E-mail</Label>
          <Input id="cad-email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="nome@exemplo.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cad-senha">Senha</Label>
          <Input id="cad-senha" type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
          <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cad-conf">Repita a senha</Label>
          <Input id="cad-conf" type="password" autoComplete="new-password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar acesso
        </Button>
        <p className="text-center text-sm text-muted-foreground">Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link></p>
      </form>
    </div>
  );
}
