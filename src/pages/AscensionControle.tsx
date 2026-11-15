import { useMemo, useState } from 'react';
import { eachMonthOfInterval, format, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useControleGeral } from '@/hooks/useAscension';
import { useOpenLead } from '@/contexts/LeadDetailContext';
import { CONTROLE_ORIGENS, type ControleRow, type OrigemRow, type SimNao } from '@/lib/ascension/controleGeral';
import { buildControleWorkbook, downloadWorkbook, sheetName, type ControleMonth } from '@/lib/ascension/exportXlsx';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartGrid, chartTooltipProps } from '@/lib/chartStyle';
import { Sparkline } from '@/components/charts/SmoothCharts';

const brl = (v: number | null) => (v === null ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }));
const pct0 = (v: number | null) => (v === null ? '' : `${Math.round(v * 100)}%`);
const dt = (d: Date | null) => (d ? format(d, 'dd/MM/yyyy') : '');
const MAX_MONTHS = 12;

const SN_CLS: Record<SimNao, string> = {
  SIM: 'bg-success/15 text-success',
  'NÃO': 'bg-destructive/10 text-destructive',
  ESP: 'bg-warning/15 text-warning-strong',
  '': '',
};
const Sn = ({ v }: { v: SimNao }) => (v ? <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', SN_CLS[v])}>{v}</span> : null);

function OriginTable({ origens, total, m }: { origens: OrigemRow[]; total: OrigemRow; m: ControleMonth }) {
  const head = ['Categoria', 'Qtd. geral', 'Agendamentos', 'CV. AG.', 'Comparecimentos', 'CV. CP.', 'Fechamentos', 'CV. FCH.', 'Ticket médio', 'Oport. de vendas', 'Vendas', 'Tendência'];
  const today = new Date();
  const days = m.dias.filter(d => d.data <= today).map(d => d.data);
  // leads que entraram por dia em cada origem (para o mini gráfico)
  const trend = (cat: string | null) => days.map(d => m.rows.filter(r => (cat === null || r.origem === cat) && isSameDay(r.data, d)).length);
  const row = (o: OrigemRow, strong = false) => (
    <tr key={o.categoria} className={cn('border-b last:border-0', strong && 'bg-muted font-semibold')}>
      <td className="px-3 py-1.5 whitespace-nowrap">{o.categoria}</td>
      {[o.qtd, o.agendamentos].map((v, i) => <td key={i} className="px-3 py-1.5 text-right">{v}</td>)}
      <td className="px-3 py-1.5 text-right">{pct0(o.cvAg)}</td>
      <td className="px-3 py-1.5 text-right">{o.comparecimentos}</td>
      <td className="px-3 py-1.5 text-right">{pct0(o.cvCp)}</td>
      <td className="px-3 py-1.5 text-right">{o.fechamentos}</td>
      <td className="px-3 py-1.5 text-right">{pct0(o.cvFch)}</td>
      <td className="px-3 py-1.5 text-right">{brl(o.ticket)}</td>
      <td className="px-3 py-1.5 text-right">{brl(o.oportunidade)}</td>
      <td className="px-3 py-1.5 text-right">{brl(o.vendas)}</td>
      <td className="px-3 py-1 w-28"><Sparkline data={trend(strong ? null : o.categoria)} height={22} tone={o.qtd ? 'brand' : 'muted'} /></td>
    </tr>
  );
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr><th colSpan={12} className="bg-[#cc0000] text-white py-1.5 text-center font-bold tracking-wide">MÉTRICAS GERAIS</th></tr>
          <tr className="bg-[#f4cccc] text-[#1a1a1a]">{head.map((h, i) => <th key={h} className={cn('px-3 py-1.5 font-semibold whitespace-nowrap', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {origens.map(o => row(o))}
          {row(total, true)}
        </tbody>
      </table>
    </div>
  );
}

function DaysCurves({ m }: { m: ControleMonth }) {
  const today = new Date();
  const data = m.dias.filter(d => d.data <= today).map(d => ({ label: format(d.data, 'dd/MM'), leads: d.leads, agend: d.agendamentosDia, comp: d.comparecimentos }));
  const S = [
    { k: 'leads', label: 'Leads', c: 'hsl(var(--primary))' },
    { k: 'agend', label: 'Agendamentos p/ o dia', c: 'hsl(var(--chart-2))' },
    { k: 'comp', label: 'Comparecimentos', c: 'hsl(var(--chart-3))' },
  ];
  return (
    <div className="rounded-2xl border bg-card p-4 mb-3 space-y-2">
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>{S.map(x => (
              <linearGradient key={x.k} id={`cg-${x.k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={x.c} stopOpacity={x.k === 'leads' ? 0.2 : 0.08} /><stop offset="100%" stopColor={x.c} stopOpacity={0} />
              </linearGradient>))}
            </defs>
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey="label" {...chartAxis} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...chartAxis} allowDecimals={false} width={32} />
            <Tooltip {...chartTooltipProps} />
            {S.map(x => <Area key={x.k} type="monotone" dataKey={x.k} name={x.label} stroke={x.c} strokeWidth={2.25} fill={`url(#cg-${x.k})`} dot={false} isAnimationActive={false} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {S.map(x => <span key={x.k} className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded" style={{ background: x.c }} />{x.label}</span>)}
      </div>
    </div>
  );
}

function DaysTable({ m }: { m: ControleMonth }) {
  const today = new Date();
  const head = ['Data', 'Todos os leads', 'Leads agendados', 'Agendamentos p/ o dia', 'Faltas', 'Comparecimentos', 'Oportunidade (R$)', 'Fechamentos (R$)', 'Nº fechados'];
  return (
    <div className="overflow-auto max-h-[60vh] rounded-lg border bg-card">
      <table className="w-full text-xs tabular-nums">
        <thead className="sticky top-0 bg-card">
          <tr>{head.map((h, i) => <th key={h} className={cn('px-3 py-2 font-semibold text-[#2a3990] dark:text-foreground border-b whitespace-nowrap', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {m.dias.map(d => (
            <tr key={d.data.toISOString()} className={cn('border-b last:border-0 bg-[#f3f3f3]/40 dark:bg-transparent', isSameDay(d.data, today) && 'bg-primary/10')}>
              <td className="px-3 py-1.5 whitespace-nowrap">{format(d.data, 'dd/MM/yyyy')}</td>
              {[d.leads, d.leadsAgendados, d.agendamentosDia, d.faltas, d.comparecimentos].map((v, i) => <td key={i} className="px-3 py-1.5 text-right">{v}</td>)}
              <td className="px-3 py-1.5 text-right">{brl(d.oportunidade)}</td>
              <td className="px-3 py-1.5 text-right">{brl(d.fechamentosValor)}</td>
              <td className="px-3 py-1.5 text-right">{d.fechados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadsTable({ rows }: { rows: ControleRow[] }) {
  const openLead = useOpenLead();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter(r => [r.nome, r.numero, r.origem, r.crc, r.especialidade, r.clinica].some(x => x.toLowerCase().includes(t))) : rows;
  }, [rows, q]);
  const head = ['Data', 'Nome', 'Número', 'Especialidade', 'Último contato', 'Data do agendamento', 'Clínica', 'Origem do contato', 'Objeções', 'CRC responsável', 'Agendou', 'Compareceu', 'Valor do orçamento', 'Fechou?', 'Valor fechado', 'Data do fechamento'];
  return (
    <div className="space-y-2">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nome, número, origem…" className="pl-8 h-9" aria-label="Buscar na lista de leads" />
      </div>
      <div className="overflow-auto max-h-[65vh] rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#cc0000] text-white">{head.map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={16} className="px-3 py-8 text-center text-muted-foreground">Nenhum lead entrou neste mês{q ? ' com essa busca' : ''}.</td></tr>}
            {list.map(r => (
              <tr key={r.leadId} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{dt(r.data)}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <button type="button" className="font-medium text-primary hover:underline text-left" onClick={() => openLead(r.leadId)}>{r.nome}</button>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{r.numero}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{r.especialidade}</td>
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{dt(r.ultimoContato)}</td>
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{dt(r.dataAgendamento)}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{r.clinica}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{r.origem}</td>
                <td className="px-3 py-1.5 max-w-[220px] truncate" title={r.objecoes}>{r.objecoes}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{r.crc}</td>
                <td className="px-3 py-1.5"><Sn v={r.agendou} /></td>
                <td className="px-3 py-1.5"><Sn v={r.compareceu} /></td>
                <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{brl(r.orcamento)}</td>
                <td className="px-3 py-1.5"><Sn v={r.fechou} /></td>
                <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{brl(r.valorFechado)}</td>
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{dt(r.dataFechamento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Clique no nome para abrir o card do lead. Para mudar uma linha, edite o card (Comercial 1, CRC ou Comercial 2): a planilha atualiza sozinha.
      </p>
    </div>
  );
}

/** ASCENSION → Planilha de Controle Geral (uma aba por mês). */
export default function AscensionControle({ embedded = false }: { embedded?: boolean } = {}) {
  useLiveRefresh();
  const { range } = usePeriodFilter();
  // meses do período do filtro global (no máximo 12); cada mês é uma aba, como na planilha
  const months = useMemo(
    () => eachMonthOfInterval({ start: startOfMonth(range.start), end: startOfMonth(range.end) }).slice(-MAX_MONTHS),
    [range.start, range.end],
  );
  const { data, isLoading } = useControleGeral(months);
  const [tab, setTab] = useState<string>('');
  const active = data?.find(m => sheetName(m.month) === tab) ?? data?.[data.length - 1];
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const wb = await buildControleWorkbook(data, CONTROLE_ORIGENS);
      const label = data.length === 1 ? sheetName(data[0].month) : `${sheetName(data[0].month)} a ${sheetName(data[data.length - 1].month)}`;
      await downloadWorkbook(wb, `Macedo odontologia - Planilha de Controle Geral (${label}).xlsx`);
    } catch (e) {
      toast.error(`A planilha não foi gerada. ${describeError(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell embedded={embedded} title="Planilha de Controle Geral">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Macedo Odontologia — Planilha de Controle Geral</h2>
            <p className="text-sm text-muted-foreground">
              Leads que entraram em cada mês, preenchidos pelo cadastro · {months.length === 1
                ? <span className="capitalize">{format(months[0], 'MMMM yyyy', { locale: ptBR })}</span>
                : `${months.length} meses (${range.label})`}
            </p>
          </div>
          <Button onClick={download} disabled={!data || busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Baixar XLSX
          </Button>
        </div>

        {data && data.length > 1 && (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Mês">
            {data.map(m => {
              const name = sheetName(m.month);
              const on = active && sheetName(active.month) === name;
              return (
                <Button key={name} size="sm" variant={on ? 'default' : 'outline'} className="h-8" role="tab" aria-selected={!!on} onClick={() => setTab(name)}>
                  {name}
                </Button>
              );
            })}
          </div>
        )}

        {isLoading || !active ? (
          <div className="h-64 rounded-lg bg-muted/50 animate-pulse" />
        ) : (
          <Tabs defaultValue="leads">
            <TabsList>
              <TabsTrigger value="leads">Leads ({active.rows.length})</TabsTrigger>
              <TabsTrigger value="origens">Métricas gerais</TabsTrigger>
              <TabsTrigger value="dias">Métricas por dia</TabsTrigger>
            </TabsList>
            <TabsContent value="leads" className="mt-3"><LeadsTable rows={active.rows} /></TabsContent>
            <TabsContent value="origens" className="mt-3">
              <OriginTable origens={active.origens} total={active.total} m={active} />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Origens = "Como o lead chegou?". Fechamentos contam "Fechou? = SIM" (a planilha original contava a coluna Compareceu nesse campo).
              </p>
            </TabsContent>
            <TabsContent value="dias" className="mt-3"><DaysCurves m={active} /><DaysTable m={active} /></TabsContent>
          </Tabs>
        )}
      </div>
    </PageShell>
  );
}
