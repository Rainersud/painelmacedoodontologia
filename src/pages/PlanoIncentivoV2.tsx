import { useState } from 'react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Plane, Settings, Trophy, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { BONUS_GROUPS, BONUS_SETTINGS, type BonusGroup, type WeekResult, type WeekState } from '@/lib/bonus';
import { usePlanoIncentivo, type IncentiveGroup, type PlanoIncentivoData } from '@/hooks/usePlanoIncentivo';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dm = (d: Date) => format(d, 'dd/MM');

const STATE: Record<WeekState, { label: string; cls: string; Icon: React.ElementType }> = {
  batida: { label: 'Batida', cls: 'bg-success/10 text-success border-success/30', Icon: CheckCircle2 },
  nao_batida: { label: 'Não batida', cls: 'bg-destructive/10 text-destructive border-destructive/30', Icon: XCircle },
  em_andamento: { label: 'Em andamento', cls: 'bg-warning/15 text-warning-strong border-warning/30', Icon: Clock },
  futura: { label: 'A começar', cls: 'bg-muted text-muted-foreground border-border', Icon: Circle },
};

function WeekRow({ w, index }: { w: WeekResult; index: number }) {
  const st = STATE[w.state];
  return (
    <div className="rounded-lg border p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">Semana {index + 1}</span>
          <span className="text-xs text-muted-foreground"> · {dm(w.week.start)} a {dm(w.week.end)}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold tabular-nums', w.earned > 0 ? 'text-success' : 'text-muted-foreground')}>
            {w.earned > 0 ? brl(w.earned) : '—'}
          </span>
          <Badge variant="outline" className={cn('gap-1 text-[11px]', st.cls)}><st.Icon className="h-3 w-3" />{st.label}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {w.goals.map(g => (
          <span
            key={g.key}
            className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]',
              g.hit ? 'border-success/30 bg-success/5' : 'border-border')}
          >
            {g.hit ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
            {g.label} <strong className="tabular-nums">{g.current}/{g.target}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function PersonCard({ g, data }: { g: IncentiveGroup; data: PlanoIncentivoData }) {
  const n = g.weeks.length;
  const { tripMonths, tripValue, weeklyValue } = data.settings;
  const role = BONUS_GROUPS.find(b => b.key === g.group)?.label ?? g.label;
  return (
    <Card className="monday-card flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{g.owner}</CardTitle>
            <p className="text-sm text-muted-foreground">{role}: {g.monthGoals.map(m => m.label.toLowerCase()).join(', ')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Bônus do mês</p>
            <p className="text-2xl font-bold tabular-nums">{brl(g.total)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">Metas do mês</p>
          {g.monthGoals.map(m => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : 0;
            return (
              <div key={m.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{m.label}</span>
                  <span className="tabular-nums"><strong>{m.current}</strong> / {m.target}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Semanas ({brl(weeklyValue)} cada com todas as metas batidas)</p>
          {g.weeks.map((w, i) => <WeekRow key={i} w={w} index={i} />)}
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1.5">
          <div className="flex justify-between gap-2"><span>Semanas batidas</span><strong className="tabular-nums">{g.weeksHit} de {n} · {brl(g.weeklyTotal)}</strong></div>
          <div className="flex justify-between gap-2">
            <span>Bônus dobrado</span>
            <strong className={cn('tabular-nums text-right', g.doubleBonus > 0 && 'text-success')}>
              {g.doubleBonus > 0 ? `+ ${brl(g.doubleBonus)}` : g.doubleStillPossible ? `possível: + ${brl(weeklyValue * n)}` : 'perdido neste mês'}
            </strong>
          </div>
        </div>

        <div className={cn('rounded-lg border p-3 space-y-2', g.tripEarned ? 'border-success/40 bg-success/5' : '')}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium"><Plane className="h-4 w-4 text-primary" /> Viagem de {brl(tripValue)}</span>
            <span className="text-sm tabular-nums font-semibold">{Math.min(g.streak, tripMonths)}/{tripMonths} meses</span>
          </div>
          <div className="flex gap-1" aria-label={`${g.streak} meses seguidos com as metas mensais batidas`}>
            {g.months.map(m => (
              <div key={m.month.toISOString()} className="flex-1 text-center">
                <div className={cn('h-2 rounded-full', m.hit ? 'bg-success' : m.complete ? 'bg-destructive/40' : 'bg-muted')} />
                <span className="text-[10px] text-muted-foreground capitalize">{format(m.month, 'MMM', { locale: ptBR })}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {g.tripEarned
              ? 'Viagem conquistada: 6 meses seguidos com todas as metas mensais batidas.'
              : `Faltam ${tripMonths - g.streak} ${tripMonths - g.streak === 1 ? 'mês' : 'meses'} seguidos com todas as metas mensais batidas.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

async function saveSetting(key: string, value: number) {
  const { data: existing } = await supabase.from('meta_settings').select('id').eq('setting_key', key).maybeSingle();
  const { error } = existing
    ? await supabase.from('meta_settings').update({ setting_value: value, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : await supabase.from('meta_settings').insert({ setting_key: key, setting_value: value });
  if (error) throw error;
}

function RulesDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: PlanoIncentivoData }) {
  const qc = useQueryClient();
  const ownerOf = (k: BonusGroup) => data.groups.find(g => g.group === k)?.owner ?? '';
  const [form, setForm] = useState<Record<string, string>>({
    weeklyValue: String(data.settings.weeklyValue),
    tripValue: String(data.settings.tripValue),
    tripMonths: String(data.settings.tripMonths),
    comercial: ownerOf('comercial'),
    atendimento: ownerOf('atendimento'),
    indicacoes: ownerOf('indicacoes'),
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      for (const k of ['weeklyValue', 'tripValue', 'tripMonths'] as const) {
        const v = Number(form[k]);
        if (!Number.isFinite(v) || v <= 0) throw new Error('Use números maiores que zero.');
        await saveSetting(BONUS_SETTINGS[k].key, v);
      }
      for (const def of BONUS_GROUPS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
        const { error } = await (supabase as any).from('bonus_responsaveis')
          .upsert({ grupo: def.key, nome: form[def.key].trim() || def.defaultOwner, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ['plano-incentivo'] });
      toast.success('Regras salvas');
      onOpenChange(false);
    } catch (e) {
      toast.error(`As regras não foram salvas. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };
  const field = (k: string, label: string, type = 'number') => (
    <div className="space-y-1.5">
      <Label htmlFor={`regra-${k}`} className="text-xs">{label}</Label>
      <Input id={`regra-${k}`} type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Regras do plano de incentivo</DialogTitle>
          <DialogDescription>
            As metas de cada responsável vêm do objetivo central (faturamento + ticket médio) em Metas da clínica.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          {field('weeklyValue', 'Bônus por semana (R$)')}
          {field('tripValue', 'Viagem (R$)')}
          {field('tripMonths', 'Meses seguidos')}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {field('comercial', 'Leads e vendas', 'text')}
          {field('atendimento', 'Agend., comp. e resgates', 'text')}
          {field('indicacoes', 'Indicações', 'text')}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar regras'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanoIncentivoV2({ embedded = false }: { embedded?: boolean } = {}) {
  useLiveRefresh();
  const { isAdmin } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const { data, isLoading } = usePlanoIncentivo(month);
  const total = (data?.groups ?? []).reduce((sum, g) => sum + g.total, 0);

  return (
    <PageShell embedded={embedded} title="Plano de Incentivo Inteligente">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Plano de Incentivo Inteligente</h2>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Bateu todas as suas metas na semana: {brl(data?.settings.weeklyValue ?? 100)}. Todas as semanas do mês: bônus dobrado.{' '}
              {data?.settings.tripMonths ?? 6} meses seguidos com as metas mensais batidas: viagem de {brl(data?.settings.tripValue ?? 5000)}.
              As metas acompanham o faturamento e o ticket médio do objetivo central.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-[130px] text-center text-sm font-medium capitalize">{format(month, 'MMMM yyyy', { locale: ptBR })}</span>
            <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
            {isAdmin && data && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}><Settings className="h-4 w-4" />Regras</Button>
            )}
          </div>
        </div>

        {isLoading || !data ? (
          <div className="grid gap-6 xl:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-[520px] rounded-xl bg-muted/50 animate-pulse" />)}</div>
        ) : (
          <>
            <Card className="monday-card">
              <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-7 w-7 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Bônus da equipe no mês</p><p className="text-2xl font-bold tabular-nums">{brl(total)}</p></div>
                </div>
                {data.groups.map(g => (
                  <div key={g.group}>
                    <p className="text-xs text-muted-foreground">{g.owner}</p>
                    <p className="text-lg font-semibold tabular-nums">{brl(g.total)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid gap-6 xl:grid-cols-3">
              {data.groups.map(g => <PersonCard key={g.group} g={g} data={data} />)}
            </div>
            <p className="text-xs text-muted-foreground">
              Semanas de segunda a domingo; a semana pertence ao mês da sua quinta-feira. Metas da semana proporcionais aos dias úteis.
              Indicações contam tudo que foi apontado no Comercial 1, CRC e Comercial 2 (cada pessoa indicada conta uma vez).
            </p>
            {editing && <RulesDialog open={editing} onOpenChange={setEditing} data={data} />}
          </>
        )}
      </div>
    </PageShell>
  );
}
