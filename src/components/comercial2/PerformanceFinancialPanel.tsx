import { useState, useMemo, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Award, AlertTriangle, Calculator, Sparkles, Trophy, Activity, Zap, Calendar, BarChart3, Crown, Info } from 'lucide-react';
import { usePerformanceFinanceiro, PeriodKey, AgentPerformance } from '@/hooks/usePerformanceFinanceiro';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

// Health thresholds
const TH = {
  cacMax: 800,
  cacWarn: 500,
  fechamentoGood: 30,
  fechamentoBad: 20,
  comparecimentoGood: 75,
  comparecimentoBad: 65,
  roiGood: 100,
  roiBad: 0,
  ltvMin: 3000,
};

function statusColor(val: number, good: number, bad: number, inverted = false) {
  if (inverted) {
    if (val <= bad) return 'success';
    if (val <= good) return 'warning';
    return 'destructive';
  }
  if (val >= good) return 'success';
  if (val >= bad) return 'warning';
  return 'destructive';
}

const tone = {
  success: 'text-success bg-success/10 border-success/30',
  warning: 'text-warning bg-warning/10 border-warning/30',
  destructive: 'text-destructive bg-destructive/10 border-destructive/30',
  primary: 'text-primary bg-primary/10 border-primary/30',
};

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'success' | 'warning' | 'destructive' | 'primary';
  formula?: string;
  trend?: number;
}

function MetricCard({ label, value, subtitle, icon, variant = 'primary', formula, trend }: MetricCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={cn('border transition-all hover:shadow-md cursor-help', tone[variant])}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  {icon}
                  <span className="text-xs font-medium opacity-80">{label}</span>
                </div>
                {formula && <Info className="h-3 w-3 opacity-50" />}
              </div>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
              {trend !== undefined && (
                <div className={cn('flex items-center gap-1 text-xs mt-1', trend >= 0 ? 'text-success' : 'text-destructive')}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        {formula && (
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold mb-1">Memória de cálculo</p>
            <p className="text-xs font-mono opacity-90">{formula}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function formatPct(v: number) {
  return `${v.toFixed(1)}%`;
}
function formatNum(v: number) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function AgentSection({ agent, title }: { agent: AgentPerformance; title?: string }) {
  const cacVar = statusColor(agent.cac, TH.cacWarn, TH.cacMax, true);
  const fechVar = statusColor(agent.taxaFechamento, TH.fechamentoGood, TH.fechamentoBad);
  const compVar = statusColor(agent.taxaComparecimento, TH.comparecimentoGood, TH.comparecimentoBad);
  const roiVar = statusColor(agent.roi, TH.roiGood, TH.roiBad);
  const ltvVar = statusColor(agent.ltv, TH.ltvMin, TH.ltvMin / 2);

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">{title}</h3>
          <Badge variant="outline">{agent.agentName}</Badge>
        </div>
      )}
      {/* Inputs row */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Activity className="h-4 w-4" /> Dados de Entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
            <Field label="Leads" value={formatNum(agent.leadsRecebidos)} />
            <Field label="Contatos" value={formatNum(agent.contatosRealizados)} />
            <Field label="Agendamentos" value={formatNum(agent.agendamentos)} />
            <Field label="Comparecimentos" value={formatNum(agent.comparecimentos)} />
            <Field label="Vendas" value={formatNum(agent.vendasRealizadas)} />
            <Field label="Recorrentes" value={formatNum(agent.pacientesRecorrentes)} />
            <Field label="Perdas" value={formatNum(agent.perdas)} />
          </div>
        </CardContent>
      </Card>

      {/* Financial Inputs */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Field label="Valor Total Vendido" value={formatCurrency(agent.valorTotalVendido)} />
            <Field label="Receita Recorrente" value={formatCurrency(agent.receitaRecorrente)} />
            <Field label="Invest. Tráfego" value={formatCurrency(agent.investimentoTrafego)} />
            <Field label="Custos Operacionais" value={formatCurrency(agent.custosOperacionais)} />
            <Field label="Comissão Paga" value={formatCurrency(agent.comissaoPaga)} />
            <Field label="Receita Total" value={formatCurrency(agent.receitaTotal)} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard label="Taxa Agendamento" value={formatPct(agent.taxaAgendamento)} icon={<Calendar className="h-3.5 w-3.5" />}
          variant="primary" formula={`${agent.agendamentos} agendamentos ÷ ${agent.leadsRecebidos} leads × 100`} />
        <MetricCard label="Taxa Comparecimento" value={formatPct(agent.taxaComparecimento)} icon={<Users className="h-3.5 w-3.5" />}
          variant={compVar} formula={`${agent.comparecimentos} ÷ ${agent.agendamentos} × 100`} />
        <MetricCard label="Taxa Fechamento" value={formatPct(agent.taxaFechamento)} icon={<Target className="h-3.5 w-3.5" />}
          variant={fechVar} formula={`${agent.vendasRealizadas} vendas ÷ ${agent.comparecimentos} comparecimentos × 100`} />
        <MetricCard label="Ticket Médio" value={formatCurrency(agent.ticketMedio)} icon={<DollarSign className="h-3.5 w-3.5" />}
          variant="primary" formula={`${formatCurrency(agent.valorTotalVendido)} ÷ ${agent.vendasRealizadas} vendas`} />
        <MetricCard label="CAC" value={formatCurrency(agent.cac)} icon={<Calculator className="h-3.5 w-3.5" />}
          variant={cacVar} formula={`(Tráfego ${formatCurrency(agent.investimentoTrafego)} + Custos ${formatCurrency(agent.custosOperacionais)} + Comissão ${formatCurrency(agent.comissaoPaga)}) ÷ ${agent.vendasRealizadas} vendas`} />
        <MetricCard label="LTV" value={formatCurrency(agent.ltv)} icon={<Sparkles className="h-3.5 w-3.5" />}
          variant={ltvVar} formula={`(Receita Recorrente ${formatCurrency(agent.receitaRecorrente)} + Vendido ${formatCurrency(agent.valorTotalVendido)}) ÷ ${agent.totalClientes} clientes`} />
        <MetricCard label="ROI" value={formatPct(agent.roi)} icon={<TrendingUp className="h-3.5 w-3.5" />}
          variant={roiVar} formula={`(Receita ${formatCurrency(agent.receitaTotal)} − Invest. ${formatCurrency(agent.investimentoTrafego + agent.custosOperacionais + agent.comissaoPaga)}) ÷ Invest. × 100`} />
        <MetricCard label="ROAS" value={`${agent.roas.toFixed(2)}x`} icon={<Zap className="h-3.5 w-3.5" />}
          variant={agent.roas >= 3 ? 'success' : agent.roas >= 1 ? 'warning' : 'destructive'}
          formula={`Faturamento ${formatCurrency(agent.receitaTotal)} ÷ Tráfego ${formatCurrency(agent.investimentoTrafego)}`} />
        <MetricCard label="Receita / Lead" value={formatCurrency(agent.receitaPorLead)} icon={<DollarSign className="h-3.5 w-3.5" />}
          variant="primary" formula={`${formatCurrency(agent.valorTotalVendido)} ÷ ${agent.leadsRecebidos} leads`} />
        <MetricCard label="Receita / Comparecimento" value={formatCurrency(agent.receitaPorComparecimento)} icon={<DollarSign className="h-3.5 w-3.5" />}
          variant="primary" formula={`${formatCurrency(agent.valorTotalVendido)} ÷ ${agent.comparecimentos}`} />
        <MetricCard label="Tempo Médio Conversão" value={`${agent.tempoMedioConversao.toFixed(0)} dias`} icon={<Activity className="h-3.5 w-3.5" />}
          variant="primary" formula="Média (closed_at − created_at) para leads fechados" />
        <MetricCard label="Receita Total" value={formatCurrency(agent.receitaTotal)} icon={<Award className="h-3.5 w-3.5" />}
          variant="success" formula="Valor vendido + Receita recorrente" />
      </div>

      {/* Loss reasons */}
      {Object.keys(agent.motivosPerda).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warning" /> Motivos de Perda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(agent.motivosPerda).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{reason}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function ComparisonView({ com1, com2, perAgent }: { com1: AgentPerformance; com2: AgentPerformance; perAgent: AgentPerformance[] }) {
  const metrics = [
    { key: 'receitaTotal', label: 'Faturamento', fmt: formatCurrency, higher: true },
    { key: 'cac', label: 'CAC', fmt: formatCurrency, higher: false },
    { key: 'ltv', label: 'LTV', fmt: formatCurrency, higher: true },
    { key: 'taxaFechamento', label: 'Taxa Fechamento', fmt: formatPct, higher: true },
    { key: 'receitaPorLead', label: 'Receita / Lead', fmt: formatCurrency, higher: true },
    { key: 'roi', label: 'ROI', fmt: formatPct, higher: true },
    { key: 'pacientesRecorrentes', label: 'Retenção (Recorrentes)', fmt: formatNum, higher: true },
  ];

  const chartData = perAgent.slice(0, 8).map(a => ({
    name: a.agentName.split(' ')[0],
    Faturamento: Math.round(a.receitaTotal),
    CAC: Math.round(a.cac),
    LTV: Math.round(a.ltv),
  }));

  return (
    <div className="space-y-5">
      {/* Side by side Com1 vs Com2 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Comercial 1 vs Comercial 2</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-semibold text-muted-foreground">Métrica</div>
            <div className="font-semibold text-primary text-center">Comercial 1</div>
            <div className="font-semibold text-chart-5 text-center">Comercial 2</div>
            {metrics.map(m => {
              const v1 = (com1 as any)[m.key] as number;
              const v2 = (com2 as any)[m.key] as number;
              const winner = m.higher ? (v1 >= v2 ? 1 : 2) : (v1 <= v2 ? 1 : 2);
              return (
                <>
                  <div key={`${m.key}-l`} className="py-2 border-t">{m.label}</div>
                  <div className={cn('py-2 border-t text-center font-mono', winner === 1 && 'text-success font-bold')}>
                    {m.fmt(v1)} {winner === 1 && '🏆'}
                  </div>
                  <div className={cn('py-2 border-t text-center font-mono', winner === 2 && 'text-success font-bold')}>
                    {m.fmt(v2)} {winner === 2 && '🏆'}
                  </div>
                </>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Ranking de Vendedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {perAgent.map((a, idx) => (
              <div key={a.agentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                  idx === 0 ? 'bg-warning/20 text-warning' : idx === 1 ? 'bg-muted text-foreground' : idx === 2 ? 'bg-orange-500/20 text-orange-600' : 'bg-muted/50 text-muted-foreground'
                )}>{idx + 1}º</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{a.agentName}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>Fech: {formatPct(a.taxaFechamento)}</span>
                    <span>CAC: {formatCurrency(a.cac)}</span>
                    <span>LTV: {formatCurrency(a.ltv)}</span>
                    <span>ROI: {formatPct(a.roi)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">{formatCurrency(a.receitaTotal)}</p>
                  <p className="text-xs text-muted-foreground">{a.vendasRealizadas} vendas</p>
                </div>
              </div>
            ))}
            {perAgent.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum vendedor com atividade no período.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Comparativo Visual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Faturamento" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="LTV" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CAC" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertsPanel({ perAgent, com1, com2 }: { perAgent: AgentPerformance[]; com1: AgentPerformance; com2: AgentPerformance }) {
  const alerts: { level: 'destructive' | 'warning'; msg: string }[] = [];
  [com1, com2, ...perAgent].forEach(a => {
    if (a.cac > TH.cacMax && a.vendasRealizadas > 0) alerts.push({ level: 'destructive', msg: `${a.agentName}: CAC ${formatCurrency(a.cac)} acima da meta (${formatCurrency(TH.cacMax)})` });
    if (a.taxaFechamento < TH.fechamentoBad && a.comparecimentos > 0) alerts.push({ level: 'destructive', msg: `${a.agentName}: Fechamento ${formatPct(a.taxaFechamento)} abaixo de 20%` });
    if (a.taxaComparecimento < TH.comparecimentoBad && a.agendamentos > 0) alerts.push({ level: 'warning', msg: `${a.agentName}: Comparecimento ${formatPct(a.taxaComparecimento)} abaixo de 65%` });
    if (a.roi < TH.roiBad && a.vendasRealizadas > 0) alerts.push({ level: 'destructive', msg: `${a.agentName}: ROI negativo (${formatPct(a.roi)})` });
    if (a.ltv > 0 && a.ltv < TH.ltvMin) alerts.push({ level: 'warning', msg: `${a.agentName}: LTV ${formatCurrency(a.ltv)} abaixo da meta` });
  });

  if (alerts.length === 0) return null;
  return (
    <Card className="border-warning/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Alertas Inteligentes ({alerts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {alerts.map((a, i) => (
            <div key={i} className={cn('text-sm p-2 rounded-md border', tone[a.level])}>{a.msg}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectionsPanel({ com1, com2 }: { com1: AgentPerformance; com2: AgentPerformance }) {
  const totalAtual = com1.receitaTotal + com2.receitaTotal;
  const ticketMedio = com1.ticketMedio > 0 ? com1.ticketMedio : 5000;
  const taxaFech = com1.taxaFechamento > 0 ? com1.taxaFechamento : 30;
  const taxaComp = com1.taxaComparecimento > 0 ? com1.taxaComparecimento : 75;
  const taxaAgend = com1.taxaAgendamento > 0 ? com1.taxaAgendamento : 40;

  const META = 120000;
  const faltam = Math.max(0, META - totalAtual);
  const vendasNecessarias = ticketMedio > 0 ? Math.ceil(faltam / ticketMedio) : 0;
  const leadsNecessarios = (taxaAgend && taxaComp && taxaFech)
    ? Math.ceil(vendasNecessarias / ((taxaAgend / 100) * (taxaComp / 100) * (taxaFech / 100)))
    : 0;

  const projecaoMensal = totalAtual;
  const projecaoAnual = projecaoMensal * 12;
  const crescimento = META > 0 ? ((totalAtual / META) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-chart-5/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Meta R$ 120.000 / mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Atual</span>
            <span className="font-bold text-success">{formatCurrency(totalAtual)}</span>
          </div>
          <Progress value={Math.min(100, crescimento)} className="h-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Faltam</span>
            <span className="font-bold text-warning">{formatCurrency(faltam)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-background border">
              <p className="text-xs text-muted-foreground">Vendas necessárias</p>
              <p className="text-2xl font-bold text-primary">{vendasNecessarias}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border">
              <p className="text-xs text-muted-foreground">Leads necessários</p>
              <p className="text-2xl font-bold text-chart-5">{leadsNecessarios}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Projeção Mensal" value={formatCurrency(projecaoMensal)} icon={<Calendar className="h-3.5 w-3.5" />}
          variant="primary" formula="Receita acumulada no período (base do cálculo)" />
        <MetricCard label="Projeção Anual" value={formatCurrency(projecaoAnual)} icon={<TrendingUp className="h-3.5 w-3.5" />}
          variant="success" formula="Projeção mensal × 12" />
        <MetricCard label="% da Meta Atingida" value={formatPct(crescimento)} icon={<Award className="h-3.5 w-3.5" />}
          variant={crescimento >= 100 ? 'success' : crescimento >= 70 ? 'warning' : 'destructive'}
          formula={`${formatCurrency(totalAtual)} ÷ ${formatCurrency(META)} × 100`} />
      </div>
    </div>
  );
}

export function PerformanceFinancialPanel() {
  const [period, setPeriod] = useState<PeriodKey>('90');
  const { data, isLoading } = usePerformanceFinanceiro(period);

  if (isLoading || !data) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Carregando inteligência financeira...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Performance Comercial & Inteligência Financeira
          </h2>
          <p className="text-sm text-muted-foreground">
            Análise comparativa Comercial 1 vs Comercial 2 — CAC, LTV, ROI, projeções e ranking
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AlertsPanel perAgent={data.perAgent} com1={data.com1} com2={data.com2} />

      <Tabs defaultValue="comparativo" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="comparativo" className="gap-1.5"><Crown className="h-3.5 w-3.5" /> Comparativo</TabsTrigger>
          <TabsTrigger value="com1" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Comercial 1</TabsTrigger>
          <TabsTrigger value="com2" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Comercial 2</TabsTrigger>
          <TabsTrigger value="indicadores" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Por Vendedor</TabsTrigger>
          <TabsTrigger value="projecoes" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Projeções</TabsTrigger>
        </TabsList>

        <TabsContent value="comparativo" className="mt-4">
          <ComparisonView com1={data.com1} com2={data.com2} perAgent={data.perAgent} />
        </TabsContent>

        <TabsContent value="com1" className="mt-4">
          <AgentSection agent={data.com1} />
        </TabsContent>

        <TabsContent value="com2" className="mt-4">
          <AgentSection agent={data.com2} />
        </TabsContent>

        <TabsContent value="indicadores" className="mt-4 space-y-6">
          {data.perAgent.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum vendedor com atividade.</p>
          )}
          {data.perAgent.map(a => (
            <AgentSection key={a.agentId} agent={a} title={a.agentName} />
          ))}
        </TabsContent>

        <TabsContent value="projecoes" className="mt-4">
          <ProjectionsPanel com1={data.com1} com2={data.com2} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
