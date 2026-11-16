import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, Loader2, SlidersHorizontal, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { FunilConversao, FunilDoPeriodo } from '@/components/funnel/FunilDoPeriodo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMetaSettings } from '@/hooks/useMetaSettings';
import { usePlanoIncentivo, type CountKey } from '@/hooks/usePlanoIncentivo';
import { useGlobalMonth } from '@/hooks/useGlobalPeriodText';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { MetricSpark, Sparkline } from '@/components/charts/SmoothCharts';
import { ptBR } from 'date-fns/locale';
import { refreshAfterSettingsChange } from '@/lib/refresh';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import {
  LADDER_SHARES, businessDaysPerMonth, deriveGoalLadder, ladderShare, volumeFactor,
  type GoalLadder, type LadderShareKey, type MetaSettingsMap,
} from '@/lib/metrics';

const BRL = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const NUM = (v: number) => Math.round(v).toLocaleString('pt-BR');
const PCT = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

async function upsertSetting(key: string, value: number, userId?: string) {
  const { data: existing } = await supabase.from('meta_settings').select('id').eq('setting_key', key).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('meta_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() }).eq('setting_key', key);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('meta_settings')
      .insert({ setting_key: key, setting_value: value, description: `Meta: ${key}`, created_by: userId });
    if (error) throw error;
  }
}

interface Row {
  label: string;
  month: number;
  fmt: (v: number) => string;
  note: string;
  owner?: string;
  actual?: CountKey;
  /** começa um bloco novo (sem seta) */
  group?: boolean;
}

function ladderRows(l: GoalLadder, s: MetaSettingsMap, owner: (k: string) => string | undefined): Row[] {
  const share = (k: LadderShareKey) => `${PCT(ladderShare(s, k))} dos leads`;
  return [
    { label: 'Faturamento', month: l.faturamento, fmt: BRL, note: 'objetivo central', actual: 'faturamento' },
    { label: 'Vendas realizadas', month: l.vendas, fmt: NUM, note: `faturamento ÷ ticket de ${BRL(l.ticket)}`, owner: owner('comercial'), actual: 'vendas' },
    { label: 'Comparecimentos', month: l.comparecimentos, fmt: NUM, note: `vendas ÷ ${l.taxaFechamento}% de fechamento`, owner: owner('atendimento'), actual: 'comparecimentos' },
    { label: 'Agendamentos', month: l.agendamentos, fmt: NUM, note: `comparecimentos ÷ ${l.taxaComparecimento}% de comparecimento`, owner: owner('atendimento'), actual: 'agendamentos' },
    { label: 'Novos leads', month: l.leads, fmt: NUM, note: `agendamentos ÷ ${l.taxaAgendamento}% de agendamento`, owner: owner('comercial'), actual: 'leads' },
    { label: 'Investimento em tráfego', month: l.investimento, fmt: BRL, note: `leads × CPL de ${BRL(l.cpl)}` },
    { label: 'Resgates', month: l.resgates, fmt: NUM, note: share('resgates'), owner: owner('atendimento'), actual: 'resgates', group: true },
    { label: 'Indicações coletadas', month: l.indicacoes, fmt: NUM, note: share('indicacoes'), owner: owner('indicacoes'), actual: 'indicacoes' },
    { label: 'Prospecção Ativa', month: l.prospeccao_ativa, fmt: NUM, note: `leads de origem · ${share('prospeccao_ativa')}`, actual: 'prospeccao_ativa', group: true },
    { label: 'Indicação de Parceria', month: l.indicacao_parceria, fmt: NUM, note: `leads de origem · ${share('indicacao_parceria')}`, actual: 'indicacao_parceria' },
    { label: 'Social Selling', month: l.social_selling, fmt: NUM, note: `leads de origem · ${share('social_selling')}`, actual: 'social_selling' },
  ];
}

const RATE_FIELDS = [
  ['taxa_agendamentos', 'Agendamento (% dos leads)'],
  ['taxa_comparecimentos', 'Comparecimento (% dos agendados)'],
  ['taxa_fechamentos', 'Fechamento (% dos comparecidos)'],
  ['meta_cpl', 'CPL meta (R$ por lead)'],
  ['meta_cac', 'CAC meta (R$ por venda)'],
  ['meta_roi', 'ROI meta (x)'],
] as const;

/**
 * Objetivo central + escada de crescimento: o faturamento do mês e o ticket médio mandam
 * em todas as metas (volume, resgates, indicações, origens) e no Plano de Incentivo.
 */
export function GoalLadderCard() {
  const { data: settings, isLoading } = useMetaSettings();
  // realizado = mês da data escolhida no filtro global
  const { month: globalMonth } = useGlobalMonth();
  const monthKey = `${globalMonth.getFullYear()}-${globalMonth.getMonth()}`;
  const planoMonth = useMemo(() => new Date(globalMonth.getFullYear(), globalMonth.getMonth(), 15), [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: plano } = usePlanoIncentivo(planoMonth);
  const monthRange = useMemo(() => ({ start: startOfMonth(planoMonth), end: endOfMonth(planoMonth) }), [planoMonth]);
  const { user, canManage: isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const s = (settings ?? {}) as MetaSettingsMap;
  const ladder = useMemo(() => deriveGoalLadder(s), [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = businessDaysPerMonth(s);

  // edição direta do faturamento e do ticket: a escada mostra o resultado antes de salvar
  const [fatN, setFat] = useState(0);
  const [ticketN, setTicket] = useState(0);
  useEffect(() => { setFat(ladder.faturamento); setTicket(ladder.ticket); }, [ladder.faturamento, ladder.ticket]);
  const draftValid = fatN > 0 && ticketN > 0;
  const changed = draftValid && (fatN !== ladder.faturamento || ticketN !== ladder.ticket);
  const draft: MetaSettingsMap = changed ? { ...s, meta_faturamento: fatN, meta_ticket_medio: ticketN } : s;
  const shown = changed ? deriveGoalLadder(draft) : ladder;
  const factor = changed ? volumeFactor(s, draft) : 1;
  const [saving, setSaving] = useState(false);

  const saveObjective = async () => {
    if (!changed) return;
    setSaving(true);
    try {
      await upsertSetting('meta_faturamento', fatN, user?.id);
      await upsertSetting('meta_ticket_medio', ticketN, user?.id);
      await refreshAfterSettingsChange(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['plano-incentivo'] });
      toast.success(`Objetivo salvo. Todas as metas e o plano de incentivo foram recalculados (${factor >= 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%).`);
    } catch (e) {
      toast.error(`O objetivo não foi salvo. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // taxas do funil e fatias dos leads (menos usadas): no diálogo
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    const f: Record<string, string> = {
      taxa_agendamentos: String(ladder.taxaAgendamento),
      taxa_comparecimentos: String(ladder.taxaComparecimento),
      taxa_fechamentos: String(ladder.taxaFechamento),
      meta_cpl: String(ladder.cpl),
      meta_cac: String(Number(s.meta_cac) || 300),
      meta_roi: String(Number(s.meta_roi) || 8),
    };
    (Object.keys(LADDER_SHARES) as LadderShareKey[]).forEach(k => { f[LADDER_SHARES[k].key] = String(ladderShare(s, k)); });
    setForm(f);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const formValid = Object.values(form).every(v => Number(v) > 0)
    && ['taxa_agendamentos', 'taxa_comparecimentos', 'taxa_fechamentos'].every(k => Number(form[k]) <= 100);
  const saveAdvanced = async () => {
    setSaving(true);
    try {
      for (const [k, v] of Object.entries(form)) await upsertSetting(k, Number(v), user?.id);
      await refreshAfterSettingsChange(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['plano-incentivo'] });
      toast.success('Taxas e proporções salvas. As metas foram recalculadas.');
      setOpen(false);
    } catch (e) {
      toast.error(`Não foi possível salvar. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const ownerOf = (k: string) => plano?.groups.find(g => g.group === k)?.owner;
  const rows = ladderRows(shown, changed ? draft : s, ownerOf);

  return (
    <Card className="monday-card">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Objetivo central e escada de crescimento
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              O faturamento do mês e o ticket médio mandam em tudo: metas de volume, resgates, indicações, origens e o
              Plano de Incentivo sobem ou descem na mesma proporção.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Taxas e proporções
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="h-40 rounded-md bg-muted/60 animate-pulse" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_2.4fr]">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3 self-start">
              <div className="space-y-1">
                <Label htmlFor="obj-fat" className="text-xs text-muted-foreground">Faturamento do mês (R$)</Label>
                {isAdmin ? (
                  <CurrencyInput id="obj-fat" value={fatN} onChange={setFat}
                    className="h-11 text-2xl font-bold tabular-nums bg-card" />
                ) : <p className="text-3xl font-bold tabular-nums">{BRL(ladder.faturamento)}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="obj-ticket" className="text-xs text-muted-foreground">Ticket médio (R$)</Label>
                {isAdmin ? (
                  <CurrencyInput id="obj-ticket" value={ticketN} onChange={setTicket}
                    className="h-10 text-lg font-semibold tabular-nums bg-card" />
                ) : <p className="text-xl font-semibold tabular-nums">{BRL(ladder.ticket)}</p>}
              </div>
              {changed && (
                <div className="space-y-2 rounded-lg bg-card border p-2.5 text-xs">
                  <p>
                    Prévia ao lado: todas as metas {factor >= 1 ? 'sobem' : 'descem'}{' '}
                    <b>{Math.abs(Math.round((factor - 1) * 100))}%</b>.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveObjective} disabled={saving} className="flex-1">
                      {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Salvar objetivo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setFat(ladder.faturamento); setTicket(ladder.ticket); }}>
                      Desfazer
                    </Button>
                  </div>
                </div>
              )}
              {isAdmin && !changed && (
                <p className="text-[11px] text-muted-foreground">Digite o novo valor: a escada ao lado mostra as metas novas antes de salvar.</p>
              )}
              {!draftValid && isAdmin && <p className="text-xs text-destructive">Use valores maiores que zero.</p>}
              <div className="pt-2 border-t border-primary/15 text-xs space-y-1">
                <p className="font-medium">Raízes do funil</p>
                <p>Agendamento: no mínimo <b>{ladder.taxaAgendamento}%</b> dos leads</p>
                <p>Comparecimento: no mínimo <b>{ladder.taxaComparecimento}%</b> dos agendados</p>
                <p>Fechamento: no mínimo <b>{ladder.taxaFechamento}%</b> dos que compareceram</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground text-left border-b">
                    <th className="font-medium py-2 pr-3">Meta</th>
                    <th className="font-medium py-2 px-3">Responsável</th>
                    <th className="font-medium py-2 px-3 text-right">Mês</th>
                    <th className="font-medium py-2 px-3 text-right">Semana</th>
                    <th className="font-medium py-2 px-3 text-right">Dia útil</th>
                    <th className="font-medium py-2 pl-3 text-right capitalize">Realizado · {format(planoMonth, 'MMM yyyy', { locale: ptBR })}</th>
                    <th className="font-medium py-2 pl-3 w-28">Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const actual = r.actual && plano ? plano.monthActuals[r.actual] : undefined;
                    const pct = actual !== undefined && r.month > 0 ? Math.round((actual / r.month) * 100) : undefined;
                    return (
                      <tr key={r.label} className={cn('border-b last:border-0', r.group && 'border-t-2 border-t-border')}>
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-1.5 font-medium">
                            {i > 0 && !r.group && <ArrowDown className="h-3 w-3 text-muted-foreground" aria-hidden />}
                            {r.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">{r.note}</span>
                        </td>
                        <td className="py-2 px-3 text-xs">{r.owner ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className={cn('py-2 px-3 text-right tabular-nums font-semibold', changed && 'text-primary')}>{r.fmt(r.month)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{r.fmt((r.month * 5) / days)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{r.fmt(r.month / days)}</td>
                        <td className="py-2 pl-3 text-right tabular-nums">
                          {actual === undefined ? <span className="text-muted-foreground">—</span> : (
                            <>
                              {r.fmt(actual)}
                              <span className={cn('block text-[11px]', (pct ?? 0) >= 100 ? 'text-success' : 'text-muted-foreground')}>{pct}%</span>
                            </>
                          )}
                        </td>
                        <td className="py-2 pl-3 w-28">
                          {r.actual && plano
                            ? <Sparkline data={plano.monthSeries[r.actual] ?? []} height={26} />
                            : <MetricSpark metric="investimento" height={26} range={monthRange} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[11px] text-muted-foreground mt-2">
                Semana = 5 dias úteis e dia = 1 dia útil, sobre {days} dias úteis no mês. Origens contam os leads recebidos pelo campo
                "Como o lead chegou?" (Comercial 1, CRC e Comercial 2). O Plano de Incentivo, o painel e as Reuniões usam estes números.
              </p>
            </div>
          </div>
        )}

        <FunilDoPeriodo bare />

        <FunilConversao bare />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Taxas do funil e proporções</DialogTitle>
              <DialogDescription>
                O faturamento e o ticket ficam no próprio card. Aqui ficam as raízes do funil e as fatias dos leads.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {RATE_FIELDS.map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`goal-${k}`} className="text-xs">{label}</Label>
                  {k === 'meta_cpl' || k === 'meta_cac' ? (
                    <CurrencyInput id={`goal-${k}`} value={Number(form[k]) || 0}
                      onChange={v => setForm(f => ({ ...f, [k]: String(v) }))} />
                  ) : (
                    <Input id={`goal-${k}`} type="number" min={0} value={form[k] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs font-medium pt-1">Fatias dos leads do mês (%)</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(LADDER_SHARES) as LadderShareKey[]).map(k => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`share-${k}`} className="text-xs">{LADDER_SHARES[k].label}</Label>
                  <Input id={`share-${k}`} type="number" min={0} step={0.1} value={form[LADDER_SHARES[k].key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [LADDER_SHARES[k].key]: e.target.value }))} />
                </div>
              ))}
            </div>
            {!formValid && <p className="text-xs text-destructive">Preencha valores maiores que zero; taxas até 100%.</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={saveAdvanced} disabled={!formValid || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
