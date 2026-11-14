import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, Image as ImageIcon, MessageCircle, Mic, Search, TrendingDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { ARRIVAL_SOURCE_LABELS, SOLD_STATUS_LIST } from '@/lib/metrics/stages';
import { LOSS_CATEGORIES, categoryLabel, lossCategory, type LossCategory } from '@/lib/lossAnalysis';
import { FUNNEL_STAGES } from '@/types/crm';
import { useLossAttachments, getSignedUrl, type LossAttachment } from './LossAttachments';

const LOST_STATUSES = ['nao_cliente', 'sem_interesse', 'descartados'];
const STAGE_LABEL = new Map(FUNNEL_STAGES.map(s => [s.key as string, s.label]));
const stageLabel = (k: string | null) => (k ? STAGE_LABEL.get(k) ?? k : 'Não registrado');
const originLabel = (k: string | null) => ARRIVAL_SOURCE_LABELS[k || 'passou_na_frente'] ?? k ?? 'Não informado';

type Period = 'mes' | 'mes_passado' | '3m' | '12m' | 'tudo';
const PERIODS: { key: Period; label: string }[] = [
  { key: 'mes', label: 'Este mês' },
  { key: 'mes_passado', label: 'Mês passado' },
  { key: '3m', label: '3 meses' },
  { key: '12m', label: '12 meses' },
  { key: 'tudo', label: 'Tudo' },
];

interface Loss {
  id: string;
  name: string;
  phone: string;
  reason: string;
  category: LossCategory;
  lostAt: Date;
  lostFrom: string | null;
  origin: string | null;
  agent: string | null;
  value: number;
}

type Filter = { kind: 'categoria' | 'etapa' | 'origem'; value: string; label: string } | null;

function periodRange(p: Period): [Date, Date] | null {
  const now = new Date();
  if (p === 'tudo') return null;
  if (p === 'mes') return [startOfMonth(now), now];
  if (p === 'mes_passado') return [startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))];
  if (p === '3m') return [startOfMonth(subMonths(now, 2)), now];
  return [startOfMonth(subMonths(now, 11)), now];
}

function useLossData() {
  return useQuery({
    queryKey: ['loss-analysis'],
    refetchInterval: 120_000,
    queryFn: async () => {
      type Row = {
        id: string; name: string; phone: string; loss_reason: string | null; lead_arrival_source: string | null;
        assigned_agent_id: string | null; stage_entered_at: string | null; created_at: string;
        budget_value: number | null; treatment_value: number | null;
      };
      const [lost, sold] = await Promise.all([
        allPages<Row>(
          supabase.from('leads')
            .select('id, name, phone, loss_reason, lead_arrival_source, assigned_agent_id, stage_entered_at, created_at, budget_value, treatment_value')
            .in('status', LOST_STATUSES as never).not('loss_reason', 'is', null).order('id'),
        ),
        allPages<{ closed_at: string | null; stage_entered_at: string | null }>(
          supabase.from('leads').select('closed_at, stage_entered_at').in('status', SOLD_STATUS_LIST).order('id'),
        ),
      ]);
      if (lost.error) throw lost.error;
      if (sold.error) throw sold.error;
      const rows = lost.data.filter(r => (r.loss_reason ?? '').trim());
      const ids = rows.map(r => r.id);
      const agentIds = [...new Set(rows.map(r => r.assigned_agent_id).filter(Boolean))] as string[];

      const [history, profiles] = await Promise.all([
        ids.length
          ? supabase.from('lead_stage_history').select('lead_id, stage, entered_at').in('lead_id', ids)
          : Promise.resolve({ data: [] as { lead_id: string; stage: string; entered_at: string }[] }),
        agentIds.length
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', agentIds)
          : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
      ]);
      const agentBy = new Map((profiles.data ?? []).map(p => [p.user_id, p.full_name]));
      const histBy = new Map<string, { stage: string; entered_at: string }[]>();
      for (const h of history.data ?? []) {
        const arr = histBy.get(h.lead_id) ?? [];
        arr.push(h);
        histBy.set(h.lead_id, arr);
      }

      const losses: Loss[] = rows.map(r => {
        // Etapa onde perdeu = a última etapa antes de entrar em perdido
        const steps = (histBy.get(r.id) ?? []).sort((a, b) => a.entered_at.localeCompare(b.entered_at));
        const before = steps.filter(s => !LOST_STATUSES.includes(s.stage)).pop();
        return {
          id: r.id,
          name: r.name.trim(),
          phone: r.phone,
          reason: (r.loss_reason ?? '').trim(),
          category: lossCategory(r.loss_reason),
          lostAt: new Date(r.stage_entered_at || r.created_at),
          lostFrom: before?.stage ?? null,
          origin: r.lead_arrival_source,
          agent: r.assigned_agent_id ? agentBy.get(r.assigned_agent_id) ?? null : null,
          value: Number(r.budget_value || r.treatment_value || 0),
        };
      }).sort((a, b) => b.lostAt.getTime() - a.lostAt.getTime());

      const sales = sold.data
        .map(s => s.closed_at || s.stage_entered_at)
        .filter(Boolean)
        .map(d => new Date(d!));
      return { losses, sales };
    },
  });
}

function count<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Lista de barras horizontais; clicar filtra a lista de registros. */
function Bars({
  title, rows, active, onPick,
}: {
  title: string;
  rows: { key: string; label: string; value: number; hint?: string }[];
  active?: string;
  onPick: (key: string, label: string) => void;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Sem dados no período</p>
      ) : (
        <ul className="space-y-1">
          {rows.map(r => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => onPick(r.key, r.label)}
                title={r.hint}
                aria-pressed={active === r.key}
                className={cn(
                  'w-full text-left rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60',
                  active === r.key && 'bg-primary/10 ring-1 ring-primary/40',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{r.label}</span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {r.value} · {Math.round((r.value / total) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LossAnalysisPanel({ onOpenLead }: { onOpenLead?: (leadId: string) => void }) {
  const { data, isLoading } = useLossData();
  const { data: allAttachments = [] } = useLossAttachments();
  const [period, setPeriod] = useState<Period>('3m');
  const [filter, setFilter] = useState<Filter>(null);
  const [query, setQuery] = useState('');

  const attachmentsByLead = useMemo(() => {
    const map: Record<string, LossAttachment[]> = {};
    allAttachments.forEach(a => { (map[a.lead_id] ||= []).push(a); });
    return map;
  }, [allAttachments]);

  const range = periodRange(period);
  const inRange = (d: Date) => !range || (d >= range[0] && d <= range[1]);
  const losses = useMemo(() => (data?.losses ?? []).filter(l => inRange(l.lostAt)), [data, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const salesCount = useMemo(() => (data?.sales ?? []).filter(inRange).length, [data, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const byCategory = count(losses, l => l.category).map(([k, v]) => ({
    key: k, label: categoryLabel(k as LossCategory), value: v, hint: LOSS_CATEGORIES.find(c => c.key === k)?.hint,
  }));
  const byStage = count(losses, l => l.lostFrom ?? '').map(([k, v]) => ({ key: k, label: stageLabel(k || null), value: v }));
  const byOrigin = count(losses, l => l.origin ?? 'passou_na_frente').map(([k, v]) => ({ key: k, label: originLabel(k), value: v }));

  const lostValue = losses.reduce((s, l) => s + l.value, 0);
  const lossRate = losses.length + salesCount > 0 ? losses.length / (losses.length + salesCount) : null;
  const top = byCategory[0];

  // Últimos 6 meses (sempre, para ver a tendência)
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const start = startOfMonth(subMonths(now, 5 - i));
      const end = endOfMonth(start);
      const n = (data?.losses ?? []).filter(l => l.lostAt >= start && l.lostAt <= end).length;
      return { label: format(start, 'MMM', { locale: ptBR }), n };
    });
  }, [data]);
  const monthMax = Math.max(1, ...months.map(m => m.n));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return losses.filter(l => {
      if (filter?.kind === 'categoria' && l.category !== filter.value) return false;
      if (filter?.kind === 'etapa' && (l.lostFrom ?? '') !== filter.value) return false;
      if (filter?.kind === 'origem' && (l.origin ?? 'passou_na_frente') !== filter.value) return false;
      if (!q) return true;
      return l.name.toLowerCase().includes(q) || l.reason.toLowerCase().includes(q) || (l.agent ?? '').toLowerCase().includes(q);
    });
  }, [losses, filter, query]);

  const pick = (kind: NonNullable<Filter>['kind']) => (key: string, label: string) =>
    setFilter(f => (f?.kind === kind && f.value === key ? null : { kind, value: key, label }));

  return (
    <section className="monday-card p-4 sm:p-5 space-y-4" aria-labelledby="loss-analysis-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="loss-analysis-title" className="text-lg font-semibold flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" /> Análise de Perdas
          </h2>
          <p className="text-sm text-muted-foreground">Por que os leads não fecharam, em que etapa e de onde vieram.</p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Período">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              onClick={() => { setPeriod(p.key); setFilter(null); }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                period === p.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Perdas no período</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{isLoading ? '–' : losses.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Valor em orçamentos perdidos</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{isLoading ? '–' : formatCurrency(lostValue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Taxa de perda</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{lossRate === null ? '–' : `${Math.round(lossRate * 100)}%`}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{losses.length} perdas · {salesCount} vendas</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Principal motivo</p>
          <p className="text-base font-semibold mt-1 leading-tight">{top ? top.label : '–'}</p>
          {top && <p className="text-[11px] text-muted-foreground mt-0.5">{Math.round((top.value / losses.length) * 100)}% das perdas</p>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Bars title="Por motivo" rows={byCategory} active={filter?.kind === 'categoria' ? filter.value : undefined} onPick={pick('categoria')} />
        <Bars title="Etapa onde perdeu" rows={byStage} active={filter?.kind === 'etapa' ? filter.value : undefined} onPick={pick('etapa')} />
        <Bars title="Por origem" rows={byOrigin} active={filter?.kind === 'origem' ? filter.value : undefined} onPick={pick('origem')} />
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-sm font-semibold mb-3">Últimos 6 meses</h4>
          <div className="flex items-end gap-2 h-28" role="img" aria-label={months.map(m => `${m.label}: ${m.n}`).join(', ')}>
            {months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${m.label}: ${m.n} perdas`}>
                <span className="text-[11px] tabular-nums text-muted-foreground">{m.n || ''}</span>
                <div className="w-full rounded-t-md bg-primary/70" style={{ height: `${(m.n / monthMax) * 100}%`, minHeight: m.n ? 4 : 0 }} />
                <span className="text-[11px] text-muted-foreground capitalize">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b">
          <h4 className="text-sm font-semibold mr-1">Registros</h4>
          <Badge variant="secondary">{list.length}</Badge>
          {filter && (
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium hover:bg-primary/15"
            >
              {filter.label} <X className="h-3 w-3" aria-label="Limpar filtro" />
            </button>
          )}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nome, motivo ou responsável" className="h-9 w-64 pl-8" />
          </div>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {isLoading ? 'Carregando…' : 'Nenhuma perda registrada com esses filtros.'}
          </p>
        ) : (
          <ul className="divide-y max-h-[420px] overflow-y-auto">
            {list.map(l => {
              const atts = attachmentsByLead[l.id] || [];
              return (
                <li key={l.id} className="px-3 py-2.5 hover:bg-muted/40">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenLead?.(l.id)}
                          className="font-medium text-sm hover:underline underline-offset-2 text-left"
                        >
                          {l.name}
                        </button>
                        <Badge variant="outline" className="text-[11px]">{categoryLabel(l.category)}</Badge>
                        {l.value > 0 && <span className="text-xs font-semibold tabular-nums">{formatCurrency(l.value)}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">"{l.reason}"</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(l.lostAt, 'dd/MM/yyyy')} · perdeu em {stageLabel(l.lostFrom)} · {originLabel(l.origin)}
                        {l.agent && <> · {l.agent}</>}
                      </p>
                      {atts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {atts.map(att => (
                            <Button
                              key={att.id}
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] gap-1"
                              onClick={async () => {
                                const url = await getSignedUrl(att.file_path);
                                if (url) window.open(url, '_blank');
                              }}
                            >
                              {(att.mime_type || '').startsWith('audio') ? <Mic className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                              <span className="max-w-[140px] truncate">{att.file_name}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {l.phone && (
                        <a
                          href={`https://wa.me/55${l.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Chamar ${l.name} no WhatsApp`}
                          className="rounded-md p-1.5 text-success hover:bg-success/10"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      {onOpenLead && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => onOpenLead(l.id)}>
                          Abrir ficha <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
