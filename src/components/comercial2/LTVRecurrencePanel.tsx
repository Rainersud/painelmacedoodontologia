import { useMemo, useState } from 'react';
import { CalendarClock, Info, Loader2, Repeat, TrendingUp, Users, Wallet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { ENTRY_TREATMENT_LABELS, LTV_PERIODS, LTV_STAGES, ltvActivity, ltvPeriodRange, segmentBy, summarize, type LtvPatient, type LtvPeriod } from '@/lib/ltv';
import { ARRIVAL_SOURCE_LABELS } from '@/lib/metrics/stages';
import { useLTVData } from '@/hooks/useLTVData';
import { useGlobalCAC } from '@/hooks/useRevenueProjection';
import { LTVStageLeadsDialog, type LeadEntry } from './LTVStageLeadsDialog';

type SegmentDim = 'tratamento' | 'origem';

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

function Kpi({ icon: Icon, label, value, sub, help }: { icon: typeof Users; label: string; value: string; sub?: string; help: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`Como é calculado: ${label}`} className="ml-auto text-muted-foreground/70 hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{help}</TooltipContent>
        </Tooltip>
      </div>
      <p className="text-2xl font-bold tabular-nums mt-1.5 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

interface LTVRecurrencePanelProps {
  /** Filtro Dia / Semana / Mês do topo do Comercial 2 */
  period: LtvPeriod;
  /** Abre a oportunidade do LTV (id do card do Comercial 2). */
  onOpenLead?: (oppId: string) => void;
}

/** LTV Inteligente: quanto cada paciente vale ao longo do tempo e como a recompra evolui. */
export function LTVRecurrencePanel({ period, onOpenLead }: LTVRecurrencePanelProps) {
  const { patients, payments, isLoading } = useLTVData();
  const { data: cacData } = useGlobalCAC();
  const [segmentDim, setSegmentDim] = useState<SegmentDim>('tratamento');
  const [openStage, setOpenStage] = useState<string | null>(null);

  const periodDef = LTV_PERIODS.find(p => p.key === period)!;
  const { now: act, prev: prevAct } = useMemo(() => {
    const r = ltvPeriodRange(period);
    return {
      now: ltvActivity(patients, payments, r.start, r.end),
      prev: ltvActivity(patients, payments, r.prevStart, r.prevEnd),
    };
  }, [period, patients, payments]);
  const vsPrev = (cur: number, before: number) => (before > 0 ? `${cur >= before ? '+' : ''}${Math.round(((cur - before) / before) * 100)}% vs ${periodDef.previous}` : `${periodDef.previous}: ${formatCurrency(before)}`);

  const s = useMemo(() => summarize(patients), [patients]);
  const segments = useMemo(
    () => segmentBy(patients, p => (segmentDim === 'tratamento' ? p.entryTreatment : p.origin)),
    [patients, segmentDim],
  );
  const segmentLabel = (k: string) =>
    segmentDim === 'tratamento' ? ENTRY_TREATMENT_LABELS[k] ?? k : ARRIVAL_SOURCE_LABELS[k] ?? k;
  const cac = cacData?.cac ?? 0;
  // Valor total do paciente (front + LTV) ÷ CAC: quanto volta de cada real investido para trazê-lo
  const ltvCac = cac > 0 ? s.avgPatientValue / cac : null;
  const maxGroup = Math.max(1, ...s.groups.map(g => g.patients));

  const stageLeads = useMemo<LeadEntry[]>(() => {
    if (!openStage) return [];
    const idx = LTV_STAGES.findIndex(st => st.key === openStage);
    return patients
      .filter(p => p.stage === idx)
      .sort((a, b) => b.ltvSold - a.ltvSold || b.frontValue - a.frontValue)
      .map((p: LtvPatient) => ({
        id: p.oppId,
        leadId: p.leadId,
        name: p.name,
        ltv: p.ltvSold,
        purchaseCount: p.ltvPurchases + 1,
        hasOpenUpsell: p.contactStatus !== 'fechado' && p.contactStatus !== 'recusado',
        status: LTV_STAGES[p.stage].key,
      }));
  }, [openStage, patients]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  const insights: string[] = [];
  if (s.patients > 0) {
    const onlyFront = s.groups[0].patients;
    if (onlyFront > 0) {
      insights.push(`${onlyFront} de ${s.patients} pacientes (${pct(s.groups[0].share)}) ainda não compraram no LTV.${s.ltvTicket > 0 ? ` Cada recompra no ticket médio atual soma ${formatCurrency(s.ltvTicket)}.` : ''}`);
    }
    if (s.returns.overdue > 0) insights.push(`${s.returns.overdue} retorno(s) atrasado(s) e sem agendamento: é a lista mais quente para recompra.`);
    if (s.returns.next30 > 0) insights.push(`${s.returns.next30} retorno(s) nos próximos 30 dias ainda sem agendamento.`);
    if (s.ltvRevenue > 0 && s.ltvPurchases > 0 && s.frontTicket > 0) {
      insights.push(`Cada compra no LTV vale em média ${pct((s.ltvTicket / s.frontTicket) * 100)} do ticket do front.`);
    }
    if (ltvCac !== null) {
      insights.push(ltvCac >= 3
        ? `Valor do paciente (front + LTV) ÷ CAC = ${ltvCac.toFixed(1)}x: cada R$ 1 investido para trazer um paciente volta ${ltvCac.toFixed(1)}x (saudável a partir de 3x).`
        : `Valor do paciente (front + LTV) ÷ CAC = ${ltvCac.toFixed(1)}x, abaixo de 3x: aumentar a recompra é o caminho mais barato para melhorar a margem.`);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">LTV Inteligente</h2>
          <p className="text-sm text-muted-foreground">O que cada paciente gera no LTV (Comercial 2) depois da venda do front. A venda do front aparece só para comparação.</p>
        </div>
      </div>

      <section aria-labelledby="ltv-periodo" className="space-y-2">
        <h3 id="ltv-periodo" className="text-sm font-semibold text-muted-foreground">Movimento {periodDef.current}</h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Kpi icon={Wallet} label="Vendido no LTV" value={formatCurrency(act.sold)} sub={vsPrev(act.sold, prevAct.sold)}
            help="Pagamentos registrados nos cards do LTV no período (bruto, pagos e a receber)." />
          <Kpi icon={Wallet} label="Recebido no LTV" value={formatCurrency(act.received)} sub={vsPrev(act.received, prevAct.received)}
            help="Pagamentos do LTV pagos no período, valor líquido. É o que entra no faturamento da meta." />
          <Kpi icon={Repeat} label="Compraram no LTV" value={String(act.buyers)} sub={`${periodDef.previous}: ${prevAct.buyers}`}
            help="Pacientes com pagamento registrado no LTV no período." />
          <Kpi icon={TrendingUp} label="Ticket médio no LTV" value={formatCurrency(act.ticket)} sub={`${periodDef.previous}: ${formatCurrency(prevAct.ticket)}`}
            help="Vendido no LTV no período ÷ pacientes que compraram no LTV no período." />
          <Kpi icon={Users} label="Entraram no LTV" value={String(act.newPatients)} sub={`${periodDef.previous}: ${prevAct.newPatients}`}
            help="Pacientes com venda realizada no front no período: entram sozinhos no Comercial 2." />
          <Kpi icon={CalendarClock} label="Retornos" value={String(act.returnsDue)} sub="com data no período, sem agendamento"
            help="Pacientes com data de retorno dentro do período que ainda não foram marcados como agendados." />
        </div>
      </section>

      <h3 className="text-sm font-semibold text-muted-foreground pt-1">Acumulado de toda a base</h3>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Kpi icon={TrendingUp} label="LTV médio por paciente" value={formatCurrency(s.avgLtv)}
          sub={`recebido ${formatCurrency(s.avgLtvReceived)} · quem recomprou ${formatCurrency(s.avgLtvRepeat)}`}
          help="Só o que foi movimentado no LTV: vendido no LTV ÷ pacientes. A venda do front não entra. Abaixo: o recebido (pago) por paciente e a média só de quem recomprou." />
        <Kpi icon={Repeat} label="Taxa de recompra" value={pct(s.repurchaseRate)}
          sub={`${s.repeatPatients} de ${s.patients} pacientes`}
          help="Pacientes com pelo menos uma compra no LTV ÷ todos os pacientes que compraram no front." />
        <Kpi icon={Wallet} label="Vendido no LTV" value={formatCurrency(s.ltvRevenue)}
          sub={s.frontRevenue > 0 ? `+${pct(s.ltvUplift)} sobre o front` : undefined}
          help="Soma dos pagamentos registrados no Financeiro da Etapa dos cards do LTV (pagos e a receber)." />
        <Kpi icon={Wallet} label="Ticket médio no LTV" value={formatCurrency(s.ltvTicket)}
          sub={`${s.ltvPurchases} compra(s) no LTV · front ${formatCurrency(s.frontTicket)}`}
          help="Vendido no LTV ÷ número de compras no LTV. O ticket do front é o valor vendido no Comercial 1 ÷ pacientes." />
        <Kpi icon={Users} label="Compras por paciente" value={s.purchasesPerPatient.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          sub="contando a compra do front"
          help="(Pacientes + compras no LTV) ÷ pacientes. 1,0 = ninguém recomprou ainda." />
        <Kpi icon={CalendarClock} label="Até a 1ª recompra" value={s.avgDaysToRepurchase === null ? '–' : `${s.avgDaysToRepurchase} dias`}
          sub={ltvCac !== null ? `valor do paciente ÷ CAC: ${ltvCac.toFixed(1)}x` : 'em média, desde a venda'}
          help="Média de dias entre a venda do front e o primeiro pagamento registrado no LTV." />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 xl:col-span-2" aria-labelledby="ltv-jornada">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h3 id="ltv-jornada" className="text-sm font-semibold">Jornada de recompra</h3>
            <p className="text-[11px] text-muted-foreground">Clique numa etapa para ver os pacientes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground text-left border-b">
                  <th className="font-medium py-2 pr-3">Etapa</th>
                  <th className="font-medium py-2 pr-3 w-[32%]">Pacientes</th>
                  <th className="font-medium py-2 pr-3 text-right">Avançou da etapa anterior</th>
                  <th className="font-medium py-2 pr-3 text-right">Vendido no LTV</th>
                  <th className="font-medium py-2 text-right">LTV médio</th>
                </tr>
              </thead>
              <tbody>
                {s.groups.map(g => (
                  <tr
                    key={g.key}
                    onClick={() => g.patients > 0 && setOpenStage(g.key)}
                    className={cn('border-b last:border-0', g.patients > 0 && 'cursor-pointer hover:bg-muted/40')}
                  >
                    <td className="py-2.5 pr-3 font-medium whitespace-nowrap">{g.label}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${(g.patients / maxGroup) * 100}%` }} />
                        </div>
                        <span className="tabular-nums text-xs w-16 text-right">{g.patients} · {Math.round(g.share)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                      {g.stepConversion === null ? '–' : pct(g.stepConversion)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{g.key === 'comprou_1' ? '–' : formatCurrency(g.ltvValue)}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">{g.patients && g.key !== 'comprou_1' ? formatCurrency(g.avgLtv) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-3">
          <section className="rounded-xl border bg-card p-4" aria-labelledby="ltv-composicao">
            <h3 id="ltv-composicao" className="text-sm font-semibold mb-3">De onde vem o valor</h3>
            {s.totalRevenue > 0 ? (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5" role="img"
                  aria-label={`Front ${pct(100 - s.ltvShare)}, LTV ${pct(s.ltvShare)}`}>
                  <div className="h-full bg-primary/40" style={{ width: `${100 - s.ltvShare}%` }} />
                  <div className="h-full bg-primary" style={{ width: `${s.ltvShare}%` }} />
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary/40" />Front (Comercial 1)</dt>
                    <dd className="tabular-nums">{formatCurrency(s.frontRevenue)} <span className="text-muted-foreground">· {pct(100 - s.ltvShare)}</span></dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" />LTV (Comercial 2)</dt>
                    <dd className="tabular-nums">{formatCurrency(s.ltvRevenue)} <span className="text-muted-foreground">· {pct(s.ltvShare)}</span></dd>
                  </div>
                </dl>
              </>
            ) : <p className="text-sm text-muted-foreground">Sem vendas no período.</p>}
          </section>

          <section className="rounded-xl border bg-card p-4" aria-labelledby="ltv-retornos">
            <h3 id="ltv-retornos" className="text-sm font-semibold mb-3">Retornos</h3>
            <dl className="grid grid-cols-2 gap-2 text-center">
              {[
                { label: 'Atrasados', value: s.returns.overdue, tone: s.returns.overdue ? 'text-destructive' : '' },
                { label: 'Próximos 30 dias', value: s.returns.next30, tone: s.returns.next30 ? 'text-warning-strong' : '' },
                { label: 'Agendados', value: s.returns.scheduled, tone: '' },
                { label: 'Sem data', value: s.returns.noDate, tone: '' },
              ].map(r => (
                <div key={r.label} className="rounded-lg bg-muted/40 p-2.5">
                  <dd className={cn('text-xl font-bold tabular-nums', r.tone)}>{r.value}</dd>
                  <dt className="text-[11px] text-muted-foreground">{r.label}</dt>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4" aria-labelledby="ltv-segmentos">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 id="ltv-segmentos" className="text-sm font-semibold">LTV por perfil de paciente</h3>
            <p className="text-[11px] text-muted-foreground">Quem recompra mais: compare pelo tratamento que o paciente fez no front ou pela origem do lead.</p>
          </div>
          <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Comparar por">
            {([['tratamento', 'Tratamento de entrada'], ['origem', 'Origem do lead']] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={segmentDim === k}
                onClick={() => setSegmentDim(k)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  segmentDim === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground text-left border-b">
                <th className="font-medium py-2 pr-3">{segmentDim === 'tratamento' ? 'Tratamento de entrada' : 'Origem'}</th>
                <th className="font-medium py-2 pr-3 text-right">Pacientes</th>
                <th className="font-medium py-2 pr-3 text-right">Taxa de recompra</th>
                <th className="font-medium py-2 pr-3 text-right">Vendido no LTV</th>
                <th className="font-medium py-2 text-right">LTV médio</th>
              </tr>
            </thead>
            <tbody>
              {segments.map(g => (
                <tr key={g.key} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{segmentLabel(g.key)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{g.patients}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{pct(g.repurchaseRate)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatCurrency(g.ltvRevenue)}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{formatCurrency(g.avgLtv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {insights.length > 0 && (
        <section className="rounded-xl border bg-card p-4" aria-labelledby="ltv-leitura">
          <h3 id="ltv-leitura" className="text-sm font-semibold mb-2">Leitura rápida</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
            {insights.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </section>
      )}

      <LTVStageLeadsDialog
        open={!!openStage}
        onOpenChange={o => { if (!o) setOpenStage(null); }}
        stageLabel={LTV_STAGES.find(st => st.key === openStage)?.label ?? ''}
        leads={stageLeads}
        onLeadClick={oppId => onOpenLead?.(oppId)}
      />
    </div>
  );
}
