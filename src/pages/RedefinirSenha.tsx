import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

/** Página do link "Esqueci minha senha": a pessoa cria a nova senha. */
export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Use pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('As duas senhas não são iguais.'); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError('O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".'); return; }
    toast.success('Senha alterada');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={submit} className="monday-card w-full max-w-sm p-6 sm:p-8 space-y-5" noValidate>
        <div className="space-y-2 text-center">
          <span className="mx-auto h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><KeyRound className="h-5 w-5" aria-hidden /></span>
          <h1 className="text-xl font-semibold">Criar nova senha</h1>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <Input id="nova-senha" type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conf-senha">Repita a nova senha</Label>
          <Input id="conf-senha" type="password" autoComplete="new-password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar nova senha</Button>
      </form>
    </div>
  );
}
