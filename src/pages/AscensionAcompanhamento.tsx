import { useMemo, useState } from 'react';
import { format, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { useGlobalMonth } from '@/hooks/useGlobalPeriodText';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useAcompanhamento, useAscensionChecks, useToggleAscensionCheck } from '@/hooks/useAscension';
import type { DailyRow, DashboardCells } from '@/lib/ascension/acompanhamento';
import { PROJETOS, checkKey } from '@/lib/ascension/projetos';
import { buildAcompanhamentoWorkbook, downloadWorkbook } from '@/lib/ascension/exportXlsx';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';

const brl = (v: number | null) => (v === null ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }));
const pct = (v: number | null) => (v === null ? '' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`);
const int = (v: number) => v.toLocaleString('pt-BR');

/** Colunas da aba "Acompanhamento Diario" (M a AA, mais o investimento do dia). */
const COLS: { key: keyof DailyRow; label: string; fmt: (v: never) => string; group: 'base' | 'venda' | 'taxa' }[] = [
  { key: 'investimento', label: 'Investimento', fmt: brl as never, group: 'base' },
  { key: 'leads', label: 'Todos os leads', fmt: int as never, group: 'base' },
  { key: 'agendados', label: 'Leads agendados', fmt: int as never, group: 'base' },
  { key: 'avaliacoes', label: 'Avaliações p/ o dia', fmt: int as never, group: 'base' },
  { key: 'faltas', label: 'Faltas', fmt: int as never, group: 'base' },
  { key: 'comparecimentos', label: 'Comparecimentos', fmt: int as never, group: 'base' },
  { key: 'oportunidade', label: 'Oportunidade (R$)', fmt: brl as never, group: 'venda' },
  { key: 'fechamentosValor', label: 'Fechamentos (R$)', fmt: brl as never, group: 'venda' },
  { key: 'fechados', label: 'Nº fechados', fmt: int as never, group: 'venda' },
  { key: 'entrada', label: 'Entrada', fmt: brl as never, group: 'venda' },
  { key: 'ticket', label: 'Ticket médio', fmt: brl as never, group: 'taxa' },
  { key: 'convAgendamento', label: 'Conv. agendamento', fmt: pct as never, group: 'taxa' },
  { key: 'convComparecimento', label: 'Conv. comparecimento', fmt: pct as never, group: 'taxa' },
  { key: 'taxaFechamento', label: 'Taxa de fechamento', fmt: pct as never, group: 'taxa' },
  { key: 'taxaEntrada', label: 'Taxa de entrada', fmt: pct as never, group: 'taxa' },
];
const GROUP_BG = { base: 'bg-[#a4c2f4]/25', venda: 'bg-[#b6d7a8]/30', taxa: 'bg-[#ffe599]/35' } as const;

function DailyTable({ rows, dash }: { rows: DailyRow[]; dash: DashboardCells }) {
  const avaliacoes = rows.reduce((s, r) => s + r.avaliacoes, 0);
  const total: Partial<Record<keyof DailyRow, number | null>> = {
    investimento: dash.investimento, leads: dash.leads, agendados: dash.agendamentos,
    avaliacoes, faltas: rows.reduce((s, r) => s + r.faltas, 0),
    comparecimentos: dash.comparecimentos, oportunidade: dash.oportunidade, fechamentosValor: dash.faturamento,
    fechados: dash.fechamentos, entrada: dash.entrada, ticket: dash.ticketMedio, convAgendamento: dash.taxaAgendamento,
    convComparecimento: avaliacoes ? dash.comparecimentos / avaliacoes : null,
    taxaFechamento: dash.oportunidade ? dash.faturamento / dash.oportunidade : null, taxaEntrada: dash.taxaEntrada,
  };
  const today = new Date();
  return (
    <div className="overflow-auto max-h-[calc(100vh-17rem)] rounded-lg border bg-card">
      <table className="w-full text-xs tabular-nums">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 bg-card px-3 py-2 text-left font-semibold border-b">Data</th>
            {COLS.map(c => (
              <th key={c.key} className={cn('px-3 py-2 text-right font-semibold border-b whitespace-nowrap text-[#2a3990] dark:text-foreground', GROUP_BG[c.group])}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.date.toISOString()} className={cn('border-b last:border-0 hover:bg-muted/40', isSameDay(r.date, today) && 'bg-primary/5')}>
              <td className="sticky left-0 bg-card px-3 py-1.5 whitespace-nowrap capitalize">{format(r.date, 'EEE dd/MM', { locale: ptBR })}</td>
              {COLS.map(c => {
                const v = r[c.key] as number | null;
                return <td key={c.key} className={cn('px-3 py-1.5 text-right', !v && 'text-muted-foreground/60')}>{(c.fmt as (x: number | null) => string)(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0">
          <tr className="bg-muted font-semibold">
            <td className="sticky left-0 bg-muted px-3 py-2">Total</td>
            {COLS.map(c => <td key={c.key} className="px-3 py-2 text-right">{total[c.key] === undefined ? '' : (c.fmt as (x: number | null) => string)(total[c.key] ?? null)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Aba "Dashboard": as mesmas caixas da planilha (rótulo preto, valor dourado), em forma de funil. */
function DashboardSheet({ d, label }: { d: DashboardCells; label: string }) {
  const Box = ({ title, value, wide }: { title: string; value: string; wide?: boolean }) => (
    <div className={cn('rounded-lg overflow-hidden border text-center', wide && 'sm:col-span-2')}>
      <p className="bg-foreground text-background text-xs font-medium py-1.5 px-2">{title}</p>
      <p className="bg-[#ebb949]/90 text-[#1f1a0a] text-lg font-bold py-3 tabular-nums">{value || '—'}</p>
    </div>
  );
  const stages: [string, string, string, string, string, string][] = [
    ['Custo por Lead', brl(d.custoLead), 'Leads', int(d.leads), '', ''],
    ['Custo Agendamento', brl(d.custoAgendamento), 'Agendamento', int(d.agendamentos), 'Taxa Agendamento', pct(d.taxaAgendamento)],
    ['Custo Comparecimento', brl(d.custoComparecimento), 'Comparecimento', int(d.comparecimentos), 'Taxa Comparecimento', pct(d.taxaComparecimento)],
    ['Custo fechamento', brl(d.custoFechamento), 'Fechamentos', int(d.fechamentos), 'Taxa Fechamentos', pct(d.taxaFechamentos)],
  ];
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Período: <b className="text-foreground">{label}</b> (Início/Fim seguem o filtro de data do topo).</p>
      <div className="mx-auto max-w-xs"><Box title="Investimento" value={brl(d.investimento)} /></div>
      <div className="space-y-3">
        {stages.map(([ct, cv, st, sv, tt, tv], i) => (
          <div key={st} className="grid grid-cols-[1fr_1.4fr_1fr] gap-3 items-stretch">
            <Box title={ct} value={cv} />
            <div style={{ paddingInline: `${i * 6}%` }}><Box title={st} value={sv} /></div>
            {tt ? <Box title={tt} value={tv} /> : <div />}
          </div>
        ))}
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 pt-2">
        <Box title="Oportunidade" value={brl(d.oportunidade)} />
        <Box title="Faturamento" value={brl(d.faturamento)} />
        <Box title="Entrada" value={brl(d.entrada)} />
        <Box title="Ticket médio" value={brl(d.ticketMedio)} />
      </div>
      <div className="grid gap-3 grid-cols-2 max-w-md">
        <Box title="TKM (oportunidade ÷ comparecimento)" value={brl(d.tkm)} />
        <Box title="Tx de entrada" value={pct(d.taxaEntrada)} />
      </div>
    </div>
  );
}

function ChecklistSheet({ month }: { month: Date }) {
  const { data: checks = new Set<string>(), isLoading } = useAscensionChecks(month);
  const toggle = useToggleAscensionCheck(month);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Date();
  const todayCol = today.getMonth() === month.getMonth() && today.getFullYear() === month.getFullYear() ? today.getDate() : null;
  if (isLoading) return <div className="h-40 rounded-lg bg-muted/50 animate-pulse" />;
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground"><span className="capitalize">{format(month, 'MMMM yyyy', { locale: ptBR })}</span> · marque o que foi feito em cada dia. Fica salvo e vai para a planilha baixada.</p>
      {PROJETOS.map(proj => {
        const done = proj.itens.reduce((s, _, i) => s + (todayCol && checks.has(checkKey(proj.key, i, todayCol)) ? 1 : 0), 0);
        return (
          <Card key={proj.key} className="monday-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
              <h3 className="text-sm font-semibold">{proj.titulo === 'PROJETO' ? 'PROJETO - CRC' : proj.titulo}</h3>
              {todayCol && <span className="text-xs text-muted-foreground">Hoje: <b className="text-foreground">{done}</b> de {proj.itens.length}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card min-w-[280px] max-w-[360px] px-4 py-1.5 text-left font-medium text-muted-foreground">Dia do mês</th>
                    {Array.from({ length: days }, (_, i) => i + 1).map(d => (
                      <th key={d} className={cn('w-7 py-1.5 text-center font-semibold text-[#2a3990] dark:text-foreground', d === todayCol && 'bg-primary/10 rounded-t')}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proj.itens.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="sticky left-0 z-10 bg-card px-4 py-1.5 min-w-[280px] max-w-[360px] leading-snug">{item}</td>
                      {Array.from({ length: days }, (_, k) => k + 1).map(d => {
                        const k = checkKey(proj.key, i, d);
                        const on = checks.has(k);
                        return (
                          <td key={d} className={cn('text-center py-1', d === todayCol && 'bg-primary/10')}>
                            <Checkbox
                              checked={on}
                              aria-label={`${item} — dia ${d}`}
                              onCheckedChange={v => toggle.mutate({ projeto: proj.key, item: i, dia: d, marcado: v === true }, {
                                onError: e => toast.error(`A marcação não foi salva. ${describeError(e)}`),
                              })}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/** ASCENSION → Acompanhamento (Rainer das Neves Macedo). */
export default function AscensionAcompanhamento({ embedded = false }: { embedded?: boolean } = {}) {
  useLiveRefresh();
  const { range } = usePeriodFilter();
  const { month } = useGlobalMonth();
  const checklistMonth = useMemo(() => startOfMonth(month), [month]);
  const r = useMemo(() => ({ start: range.start, end: range.end }), [range.start, range.end]);
  const { data, isLoading } = useAcompanhamento(r);
  const { data: checks } = useAscensionChecks(checklistMonth);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const wb = await buildAcompanhamentoWorkbook({ rows: data.rows, dashboard: data.dashboard, range: r, checklistMonth, checks: checks ?? new Set() });
      await downloadWorkbook(wb, `Rainer das Neves Macedo - Acompanhamento (${format(r.start, 'dd-MM-yyyy')} a ${format(r.end, 'dd-MM-yyyy')}).xlsx`);
    } catch (e) {
      toast.error(`A planilha não foi gerada. ${describeError(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell embedded={embedded} title="Acompanhamento">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Rainer das Neves Macedo — Acompanhamento</h2>
            <p className="text-sm text-muted-foreground">Preenchido sozinho pelo Comercial 1, CRC, Comercial 2 e CAC · {range.label}</p>
          </div>
          <Button onClick={download} disabled={!data || busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Baixar XLSX
          </Button>
        </div>
        <Tabs defaultValue="diario">
          <TabsList>
            <TabsTrigger value="diario">Acompanhamento diário</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="projeto">Projeto Ascension</TabsTrigger>
          </TabsList>
          <TabsContent value="diario" className="mt-3">
            {isLoading || !data ? <div className="h-64 rounded-lg bg-muted/50 animate-pulse" /> : <DailyTable rows={data.rows} dash={data.dashboard} />}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Investimento do dia = valor lançado em CAC & Financeiro, distribuído pelos dias úteis (as colunas por anúncio do Meta ficam vazias até ligar o Meta Ads).
              Oportunidade = orçamento de quem compareceu no dia. Entrada = o que o paciente pagou no dia em que fechou.
            </p>
          </TabsContent>
          <TabsContent value="dashboard" className="mt-3">
            {isLoading || !data ? <div className="h-64 rounded-lg bg-muted/50 animate-pulse" /> : <DashboardSheet d={data.dashboard} label={range.label} />}
          </TabsContent>
          <TabsContent value="projeto" className="mt-3">
            <ChecklistSheet month={checklistMonth} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
