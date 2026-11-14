import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, Loader2, Pencil, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMetaSettings } from '@/hooks/useMetaSettings';
import { refreshAfterSettingsChange } from '@/lib/refresh';
import { describeError } from '@/lib/errors';
import { businessDaysPerMonth, deriveGoalLadder, volumeFactor, type MetaSettingsMap } from '@/lib/metrics';

const BRL = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const NUM = (v: number) => Math.round(v).toLocaleString('pt-BR');

/** Alvos que acompanham o objetivo central (bônus por metas e indicações). */
const SCALED_KEYS = [
  // valor do bônus semanal e metas semanais de resgate/indicação acompanham o objetivo
  'bonus_semana_valor', 'bonus_resgatados_semana', 'bonus_indicacoes_semana', 'meta_indicacoes',
  'meta_origem_indicacao_pac_dia', 'meta_origem_prospeccao_ativa_dia',
  'meta_origem_indicacao_parceria_dia', 'meta_origem_social_selling_dia',
];

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

interface FormState {
  faturamento: string;
  ticket: string;
  taxaAgendamento: string;
  taxaComparecimento: string;
  taxaFechamento: string;
  cpl: string;
  cac: string;
  roi: string;
}

/**
 * Objetivo central + escada de crescimento: o faturamento do mês e o ticket médio mandam
 * em todas as metas de volume (e nos alvos de bônus). As taxas do funil são as raízes.
 */
export function GoalLadderCard() {
  const { data: settings, isLoading } = useMetaSettings();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const s = (settings ?? {}) as MetaSettingsMap;
  const ladder = useMemo(() => deriveGoalLadder(s), [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = businessDaysPerMonth(s);

  useEffect(() => {
    if (!open) return;
    setForm({
      faturamento: String(ladder.faturamento),
      ticket: String(ladder.ticket),
      taxaAgendamento: String(ladder.taxaAgendamento),
      taxaComparecimento: String(ladder.taxaComparecimento),
      taxaFechamento: String(ladder.taxaFechamento),
      cpl: String(ladder.cpl),
      cac: String(Number(s.meta_cac) || 300),
      roi: String(Number(s.meta_roi) || 8),
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const draft: MetaSettingsMap | null = form ? {
    ...s,
    meta_faturamento: Number(form.faturamento),
    meta_ticket_medio: Number(form.ticket),
    taxa_agendamentos: Number(form.taxaAgendamento),
    taxa_comparecimentos: Number(form.taxaComparecimento),
    taxa_fechamentos: Number(form.taxaFechamento),
    meta_cpl: Number(form.cpl),
  } : null;
  const valid = !!form && Object.values(form).every(v => Number(v) > 0)
    && [form.taxaAgendamento, form.taxaComparecimento, form.taxaFechamento].every(v => Number(v) <= 100);
  const preview = draft && valid ? deriveGoalLadder(draft) : null;
  const factor = draft && valid ? volumeFactor(s, draft) : 1;

  const save = async () => {
    if (!draft || !valid) return;
    setSaving(true);
    try {
      const pairs: [string, number][] = [
        ['meta_faturamento', Number(form!.faturamento)],
        ['meta_ticket_medio', Number(form!.ticket)],
        ['taxa_agendamentos', Number(form!.taxaAgendamento)],
        ['taxa_comparecimentos', Number(form!.taxaComparecimento)],
        ['taxa_fechamentos', Number(form!.taxaFechamento)],
        ['meta_cpl', Number(form!.cpl)],
        ['meta_cac', Number(form!.cac)],
        ['meta_roi', Number(form!.roi)],
      ];
      // Alvos de bônus e de indicações sobem/descem na mesma proporção das vendas necessárias
      if (Math.abs(factor - 1) > 0.001) {
        for (const key of SCALED_KEYS) {
          const current = Number(s[key]);
          if (Number.isFinite(current) && current > 0) pairs.push([key, Math.max(1, Math.round(current * factor))]);
        }
      }
      for (const [k, v] of pairs) await upsertSetting(k, v, user?.id);
      await refreshAfterSettingsChange(queryClient);
      toast.success(Math.abs(factor - 1) > 0.001
        ? `Objetivo salvo. Metas, bônus e indicações ajustados em ${factor > 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%.`
        : 'Objetivo salvo.');
      setOpen(false);
    } catch (e) {
      toast.error(`O objetivo não foi salvo. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { label: 'Faturamento', month: ladder.faturamento, fmt: BRL, note: 'objetivo central' },
    { label: 'Vendas realizadas', month: ladder.vendas, fmt: NUM, note: `faturamento ÷ ticket de ${BRL(ladder.ticket)}` },
    { label: 'Comparecimentos', month: ladder.comparecimentos, fmt: NUM, note: `vendas ÷ ${ladder.taxaFechamento}% de fechamento` },
    { label: 'Agendamentos', month: ladder.agendamentos, fmt: NUM, note: `comparecimentos ÷ ${ladder.taxaComparecimento}% de comparecimento` },
    { label: 'Novos leads', month: ladder.leads, fmt: NUM, note: `agendamentos ÷ ${ladder.taxaAgendamento}% de agendamento` },
    { label: 'Investimento em tráfego', month: ladder.investimento, fmt: BRL, note: `leads × CPL de ${BRL(ladder.cpl)}` },
  ];

  return (
    <Card className="monday-card">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Objetivo central e escada de crescimento
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              O faturamento do mês e o ticket médio mandam em todas as metas. Mude um dos dois e as metas de volume,
              os alvos de bônus, as indicações e as metas das Origens Estratégicas sobem ou descem na mesma proporção.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Ajustar objetivo
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="h-40 rounded-md bg-muted/60 animate-pulse" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Faturamento do mês</p>
                <p className="text-3xl font-bold tabular-nums">{BRL(ladder.faturamento)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket médio</p>
                <p className="text-xl font-semibold tabular-nums">{BRL(ladder.ticket)}</p>
              </div>
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
                    <th className="font-medium py-2 px-3 text-right">Mês</th>
                    <th className="font-medium py-2 px-3 text-right">Semana</th>
                    <th className="font-medium py-2 pl-3 text-right">Dia útil</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.label} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-1.5 font-medium">
                          {i > 0 && <ArrowDown className="h-3 w-3 text-muted-foreground" aria-hidden />}
                          {r.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{r.note}</span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">{r.fmt(r.month)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.fmt((r.month * 5) / days)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-muted-foreground">{r.fmt(r.month / days)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-muted-foreground mt-2">
                Semana = 5 dias úteis e dia = 1 dia útil, sobre {days} dias úteis no mês. As metas do painel, do Plano de
                incentivo, das Reuniões e dos bônus usam estes números.
              </p>
            </div>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajustar objetivo central</DialogTitle>
              <DialogDescription>As metas de volume são recalculadas a partir destes valores.</DialogDescription>
            </DialogHeader>
            {form && (
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['faturamento', 'Faturamento do mês (R$)'],
                  ['ticket', 'Ticket médio (R$)'],
                  ['taxaAgendamento', 'Agendamento (% dos leads)'],
                  ['taxaComparecimento', 'Comparecimento (% dos agendados)'],
                  ['taxaFechamento', 'Fechamento (% dos comparecidos)'],
                  ['cpl', 'CPL meta (R$ por lead)'],
                  ['cac', 'CAC meta (R$ por venda)'],
                  ['roi', 'ROI meta (x)'],
                ] as const).map(([k, label]) => (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={`goal-${k}`} className="text-xs">{label}</Label>
                    <Input
                      id={`goal-${k}`}
                      type="number"
                      min={0}
                      value={form[k]}
                      onChange={e => setForm(f => (f ? { ...f, [k]: e.target.value } : f))}
                    />
                  </div>
                ))}
              </div>
            )}
            {preview && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <p className="font-medium">Fica assim por mês:</p>
                <p>
                  {NUM(preview.vendas)} vendas · {NUM(preview.comparecimentos)} comparecimentos · {NUM(preview.agendamentos)} agendamentos ·{' '}
                  {NUM(preview.leads)} leads · {BRL(preview.investimento)} de investimento
                </p>
                {Math.abs(factor - 1) > 0.001 && (
                  <p className="text-muted-foreground">
                    Alvos de bônus por metas e de indicações: {factor > 1 ? '+' : ''}{Math.round((factor - 1) * 100)}%.
                  </p>
                )}
              </div>
            )}
            {!valid && form && <p className="text-xs text-destructive">Preencha valores maiores que zero; taxas até 100%.</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={!valid || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Salvar objetivo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
