import { useState } from 'react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { Award, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Settings, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { BONUS_SETTINGS, type WeekResult, type WeekState } from '@/lib/bonus';
import { useWeeklyBonus, type WeeklyBonusData } from '@/hooks/useWeeklyBonus';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dm = (d: Date) => format(d, 'dd/MM');

const STATE: Record<WeekState, { label: string; cls: string; Icon: React.ElementType }> = {
  batida: { label: 'Batida', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', Icon: CheckCircle2 },
  nao_batida: { label: 'Não batida', cls: 'bg-destructive/10 text-destructive border-destructive/30', Icon: XCircle },
  em_andamento: { label: 'Em andamento', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', Icon: Clock },
  futura: { label: 'A começar', cls: 'bg-muted text-muted-foreground border-border', Icon: Circle },
};

function WeekRow({ w, index }: { w: WeekResult; index: number }) {
  const st = STATE[w.state];
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Semana {index + 1}</p>
        <p className="text-xs text-muted-foreground">{dm(w.week.start)} a {dm(w.week.end)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {w.goals.map(g => (
          <span
            key={g.key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
              g.hit ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border',
            )}
          >
            {g.hit ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
            {g.label}
            <strong className="tabular-nums">{g.current}/{g.target}</strong>
          </span>
        ))}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant="outline" className={cn('gap-1', st.cls)}><st.Icon className="h-3 w-3" />{st.label}</Badge>
        <span className={cn('text-sm font-semibold tabular-nums', w.earned > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
          {w.earned > 0 ? brl(w.earned) : '—'}
        </span>
      </div>
    </div>
  );
}

function GroupCard({ g, weeklyValue }: { g: WeeklyBonusData['groups'][number]; weeklyValue: number }) {
  const n = g.weeks.length;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{g.label}</CardTitle>
            <p className="text-sm text-muted-foreground">Responsável: <strong className="text-foreground">{g.owner}</strong></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Bônus do mês</p>
            <p className="text-2xl font-bold tabular-nums">{brl(g.total)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {g.weeks.map((w, i) => <WeekRow key={i} w={w} index={i} />)}
        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span>Semanas batidas</span><strong className="tabular-nums">{g.weeksHit} de {n} · {brl(g.weeklyTotal)}</strong></div>
          <div className="flex justify-between">
            <span>Bônus dobrado (todas as {n} semanas)</span>
            <strong className={cn('tabular-nums', g.doubleBonus > 0 && 'text-emerald-700 dark:text-emerald-400')}>
              {g.doubleBonus > 0 ? `+ ${brl(g.doubleBonus)}` : g.doubleStillPossible ? `possível: + ${brl(weeklyValue * n)}` : 'perdido neste mês'}
            </strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function saveSetting(key: string, value: number) {
  const { data: existing } = await supabase.from('meta_settings').select('id').eq('setting_key', key).maybeSingle();
  const { error } = existing
    ? await supabase.from('meta_settings').update({ setting_value: value }).eq('id', existing.id)
    : await supabase.from('meta_settings').insert({ setting_key: key, setting_value: value });
  if (error) throw error;
}

function SettingsDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: WeeklyBonusData }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    weeklyValue: String(data.settings.weeklyValue),
    resgatesPerWeek: String(data.settings.resgatesPerWeek),
    indicacoesPerWeek: String(data.settings.indicacoesPerWeek),
    atendimento: data.groups.find(g => g.group === 'atendimento')?.owner ?? '',
    indicacoes: data.groups.find(g => g.group === 'indicacoes')?.owner ?? '',
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      for (const k of ['weeklyValue', 'resgatesPerWeek', 'indicacoesPerWeek'] as const) {
        const v = Number(form[k]);
        if (!Number.isFinite(v) || v <= 0) throw new Error('Use números maiores que zero.');
        await saveSetting(BONUS_SETTINGS[k].key, v);
      }
      for (const grupo of ['atendimento', 'indicacoes'] as const) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
        const { error } = await (supabase as any).from('bonus_responsaveis')
          .upsert({ grupo, nome: form[grupo].trim() || (grupo === 'atendimento' ? 'Ariane' : 'Lidiane'), updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ['weekly-bonus'] });
      toast.success('Regras do bônus salvas');
      onOpenChange(false);
    } catch (e) {
      toast.error(`Não foi possível salvar. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };
  const field = (k: keyof typeof form, label: string, type = 'number') => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Regras do bônus</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('weeklyValue', 'Valor por semana batida (R$)')}
          {field('resgatesPerWeek', 'Resgates por semana')}
          {field('indicacoesPerWeek', 'Indicações por semana')}
          <div />
          {field('atendimento', 'Responsável — Atendimento', 'text')}
          {field('indicacoes', 'Responsável — Indicações', 'text')}
        </div>
        <p className="text-xs text-muted-foreground">
          Agendamentos e comparecimentos por semana vêm da escada de Metas da clínica (faturamento ÷ ticket médio).
        </p>
        <DialogFooter><Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar regras'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BonusMetas({ embedded = false }: { embedded?: boolean } = {}) {
  const { isAdmin } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const { data, isLoading } = useWeeklyBonus(month);
  const total = (data?.groups ?? []).reduce((s, g) => s + g.total, 0);

  return (
    <PageShell embedded={embedded} title="Bônus por Metas">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Bônus por metas</h2>
            <p className="text-sm text-muted-foreground">
              {data ? brl(data.settings.weeklyValue) : 'R$ 100'} por semana com todas as metas batidas. Batendo todas as semanas do mês, o bônus dobra.
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
          <p className="text-sm text-muted-foreground">Carregando bônus…</p>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-6 p-4">
                <Award className="h-8 w-8 text-primary" />
                <div><p className="text-xs text-muted-foreground">Total da equipe no mês</p><p className="text-2xl font-bold tabular-nums">{brl(total)}</p></div>
                {data.groups.map(g => (
                  <div key={g.group}><p className="text-xs text-muted-foreground">{g.owner}</p><p className="text-lg font-semibold tabular-nums">{brl(g.total)}</p></div>
                ))}
              </CardContent>
            </Card>
            <div className="grid gap-6 xl:grid-cols-2">
              {data.groups.map(g => <GroupCard key={g.group} g={g} weeklyValue={data.settings.weeklyValue} />)}
            </div>
            <p className="text-xs text-muted-foreground">
              Indicações contam tudo que foi apontado no Comercial 1, CRC e Comercial 2 (cada pessoa indicada conta uma vez). Semanas de segunda a domingo; a semana pertence ao mês da sua quinta-feira.
            </p>
            {editing && <SettingsDialog open={editing} onOpenChange={setEditing} data={data} />}
          </>
        )}
      </div>
    </PageShell>
  );
}
