import { useMemo, useState } from 'react';
import { endOfDay, format, startOfDay } from 'date-fns';
import { Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { useAddLeadObjection, useDeleteLeadObjection, useLeadObjections } from '@/hooks/useLeadObjections';
import { useTeamNames } from '@/hooks/useTeamNames';
import { useAuth } from '@/contexts/AuthContext';
import { OBJECOES } from '@/lib/ascension/crcGuide';

/** Objeções que a CRC pode registrar: as do guia de scripts + "Outra". */
export const OBJECAO_OPCOES = [...OBJECOES.map(o => ({ key: o.key as string, label: o.label.replace(/"/g, '') })), { key: 'outra', label: 'Outra objeção' }];
export const objecaoLabel = (k: string) => OBJECAO_OPCOES.find(o => o.key === k)?.label ?? k;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Fechamento do dia → registrar objeções. Cada registro vai para a tabela lead_objections e
 * aparece na Análise de Perdas (Comercial 1).
 */
export function RegistrarObjecao({ dia }: { dia: Date }) {
  const { user, isAdmin } = useAuth();
  const { data: leads } = useCRMLeads();
  const { data: team } = useTeamNames();
  const { data: registros = [] } = useLeadObjections(startOfDay(dia), endOfDay(dia));
  const add = useAddLeadObjection();
  const del = useDeleteLeadObjection();
  const [busca, setBusca] = useState('');
  const [lead, setLead] = useState<{ id: string; name: string } | null>(null);
  const [categoria, setCategoria] = useState('');
  const [detalhe, setDetalhe] = useState('');

  const resultados = useMemo(() => {
    const q = norm(busca.trim());
    if (q.length < 2 || !leads) return [];
    const dig = busca.replace(/\D/g, '');
    return leads
      .filter(l => norm(l.name ?? '').includes(q) || (dig.length >= 4 && (l.phone ?? '').replace(/\D/g, '').includes(dig)))
      .slice(0, 6);
  }, [busca, leads]);

  const salvar = () => {
    if (!categoria) { toast.error('Escolha a objeção.'); return; }
    if (!lead && !detalhe.trim()) { toast.error('Escolha o paciente ou descreva a objeção.'); return; }
    add.mutate(
      { lead_id: lead?.id ?? null, lead_name: lead?.name ?? null, categoria, detalhe: detalhe.trim() || null },
      {
        onSuccess: () => { toast.success('Objeção registrada'); setLead(null); setBusca(''); setCategoria(''); setDetalhe(''); },
        onError: () => toast.error('Não foi possível registrar agora. Tente de novo.'),
      },
    );
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">Registrar objeção · aparece na Análise de Perdas</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="obj-paciente" className="text-xs">Paciente</Label>
          {lead ? (
            <div className="flex h-9 items-center justify-between rounded-md border bg-card px-3 text-sm">
              <span className="truncate">{lead.name}</span>
              <button type="button" onClick={() => setLead(null)} aria-label="Trocar paciente" className="p-1 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <Input id="obj-paciente" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou telefone" className="h-9 pl-8 bg-card" autoComplete="off" />
              {resultados.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md" role="listbox">
                  {resultados.map(l => (
                    <li key={l.id}>
                      <button type="button" role="option" aria-selected={false}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => { setLead({ id: l.id, name: l.name }); setBusca(''); }}>
                        {l.name} <span className="text-xs text-muted-foreground">{l.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Objeção</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="h-9 bg-card"><SelectValue placeholder="O que o paciente disse?" /></SelectTrigger>
            <SelectContent>
              {OBJECAO_OPCOES.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="obj-detalhe" className="text-xs">Detalhes (dores, família, o que foi conversado)</Label>
        <Textarea id="obj-detalhe" value={detalhe} onChange={e => setDetalhe(e.target.value)} rows={2} className="bg-card" />
      </div>
      <Button size="sm" onClick={salvar} disabled={add.isPending} className="gap-1.5">
        {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Registrar objeção
      </Button>

      {registros.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {registros.map(r => (
            <li key={r.id} className="flex items-start gap-2 p-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p><b className="font-medium">{r.lead_name ?? 'Sem paciente'}</b> · {objecaoLabel(r.categoria)}</p>
                {r.detalhe && <p className="text-xs text-muted-foreground">{r.detalhe}</p>}
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(r.created_at), 'HH:mm')}{r.created_by && team?.[r.created_by] ? ` · ${team[r.created_by].name}` : ''}
                </p>
              </div>
              {(isAdmin || r.created_by === user?.id) && (
                <button type="button" onClick={() => del.mutate(r.id)} aria-label="Apagar objeção" className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
