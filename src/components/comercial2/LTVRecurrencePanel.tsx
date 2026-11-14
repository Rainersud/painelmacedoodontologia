import { useMemo, useState } from 'react';
import { startOfMonth, startOfYear, subMonths } from 'date-fns';
import { CalendarClock, Info, Loader2, Repeat, TrendingUp, Users, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { LTV_STAGES, summarize, type LtvPatient } from '@/lib/ltv';
import { useLTVData } from '@/hooks/useLTVData';
import { useGlobalCAC } from '@/hooks/useRevenueProjection';
import { LTVStageLeadsDialog, type LeadEntry } from './LTVStageLeadsDialog';

type Period = 'todos' | '12m' | '6m' | 'ano' | 'mes';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'todos', label: 'Todas as vendas' },
  { value: '12m', label: 'Vendas dos últimos 12 meses' },
  { value: '6m', label: 'Vendas dos últimos 6 meses' },
  { value: 'ano', label: 'Vendas deste ano' },
  { value: 'mes', label: 'Vendas deste mês' },
];
const SALE_TYPES = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: '1_etapa', label: 'Venda em 1 etapa' },
  { value: '2_etapas', label: 'Venda em 2 etapas' },
];

function periodStart(p: Period, now = new Date()): Date | null {
  if (p === '12m') return startOfMonth(subMonths(now, 11));
  if (p === '6m') return startOfMonth(subMonths(now, 5));
  if (p === 'ano') return startOfYear(now);
  if (p === 'mes') return startOfMonth(now);
  return null;
}

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
  /** Abre a oportunidade do LTV (id do card do Comercial 2). */
  onOpenLead?: (oppId: string) => void;
}

/** LTV Inteligente: quanto cada paciente vale ao longo do tempo e como a recompra evolui. */
export function LTVRecurrencePanel({ onOpenLead }: LTVRecurrencePanelProps) {
  const { patients: all, isLoading } = useLTVData();
  const { data: cacData } = useGlobalCAC();
  const [period, setPeriod] = useState<Period>('todos');
  const [saleType, setSaleType] = useState('todos');
  const [openStage, setOpenStage] = useState<string | null>(null);

  const patients = useMemo(() => {
    const start = periodStart(period);
    return all.filter(p =>
      (!start || (p.soldAt && p.soldAt >= start))
      && (saleType === 'todos' || p.saleType === saleType));
  }, [all, period, saleType]);

  const s = useMemo(() => summarize(patients), [patients]);
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
          <p className="text-sm text-muted-foreground">Quanto cada paciente vale ao longo do tempo: a venda do front mais as recompras no LTV.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={saleType} onValueChange={setSaleType}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{SALE_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 w-56 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

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
