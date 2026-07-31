import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAdCreatives, calculateCreativeMetrics, type AdCreative } from '@/hooks/useAdCreatives';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { formatCurrency } from '@/lib/currency';
import { SOURCE_CONFIG } from '@/types/crm';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import {
  Plus, TrendingUp, TrendingDown, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, XCircle, Lightbulb, Trophy, Megaphone,
  Trash2, Edit2, Eye, Target, DollarSign, Activity, Layers
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { safeUrl, isValidHttpUrl } from '@/lib/sanitize';

// ─── Shared helpers ──────────────────────────────────────────────
type PerfStatus = 'healthy' | 'attention' | 'critical';

function getStatus(rate: number, thresholds = [40, 20]): PerfStatus {
  if (rate >= thresholds[0]) return 'healthy';
  if (rate >= thresholds[1]) return 'attention';
  return 'critical';
}

const STATUS_COLORS: Record<PerfStatus, { gradient: string; text: string; bg: string; border: string }> = {
  healthy: { gradient: 'from-success/80 to-success', text: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  attention: { gradient: 'from-warning/80 to-warning', text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  critical: { gradient: 'from-destructive/80 to-destructive', text: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
};

function StatusIcon({ status }: { status: PerfStatus }) {
  if (status === 'healthy') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  if (status === 'attention') return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
}

function StatusBadge({ status }: { status: PerfStatus }) {
  const labels: Record<PerfStatus, string> = { healthy: '✅ Saudável', attention: '⚠️ Atenção', critical: '🚨 Crítico' };
  const c = STATUS_COLORS[status];
  return <Badge variant="outline" className={cn('text-[9px] font-semibold border', c.bg, c.text, c.border)}>{labels[status]}</Badge>;
}

// ─── Traffic Funnel Stages ───────────────────────────────────────
const TRAFFIC_STAGES = [
  { key: 'investment', label: 'Investimento', field: 'investment', isCurrency: true },
  { key: 'clicks', label: 'Cliques', field: 'clicks' },
  { key: 'leads', label: 'Leads Gerados', field: 'leads_generated' },
  { key: 'appointments', label: 'Agendamentos', field: 'appointments' },
  { key: 'attendance', label: 'Comparecimento', field: 'attendance' },
  { key: 'sales', label: 'Venda Realizada', field: 'sales' },
  { key: 'revenue', label: 'Faturamento', field: 'revenue', isCurrency: true },
] as const;

const TRAFFIC_WIDTHS = [100, 88, 76, 64, 52, 42, 34];

// ─── Sales Funnel Stages ─────────────────────────────────────────
const SALES_STEPS = [
  { key: 'novo_lead', label: 'Novos Leads', statuses: ['novo_lead'] },
  { key: 'agendou', label: 'Agendados', statuses: ['agendou', 'consulta_agendada', 'confirmado'] },
  { key: 'compareceu', label: 'Compareceu', statuses: ['compareceu'] },
  { key: 'fechado', label: 'Venda Realizada', statuses: ['fechado'] },
];
const SALES_WIDTHS = [100, 75, 55, 38];

// ─── Generic Funnel Layer ────────────────────────────────────────
function FunnelLayer({
  label, value, displayValue, status, width, isLast, convRate, isExpanded, onToggle, children,
}: {
  label: string; value: number; displayValue: string; status: PerfStatus; width: number;
  isLast: boolean; convRate?: number | null; isExpanded: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  const c = STATUS_COLORS[status];
  return (
    <div className="w-full flex flex-col items-center">
      <button onClick={onToggle} className="w-full focus:outline-none" style={{ maxWidth: `${width}%` }}>
        <div
          className={cn(
            'relative rounded-lg py-2.5 px-3 transition-all duration-300 bg-gradient-to-r shadow-md hover:shadow-lg cursor-pointer hover:scale-[1.02]',
            c.gradient, isExpanded && 'ring-2 ring-primary/50'
          )}
          style={{
            clipPath: !isLast
              ? 'polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)'
              : 'polygon(0% 0%, 100% 0%, 97% 100%, 3% 100%)',
          }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5">
              <StatusIcon status={status} />
              <span className="text-xs font-bold text-white drop-shadow-sm">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white drop-shadow-sm">{displayValue}</span>
              {isExpanded ? <ChevronUp className="h-3 w-3 text-white/70" /> : <ChevronDown className="h-3 w-3 text-white/70" />}
            </div>
          </div>
          <div className="flex items-center justify-end mt-0.5 relative z-10">
            <StatusBadge status={status} />
          </div>
        </div>
      </button>
      {convRate !== null && convRate !== undefined && (
        <div className="flex items-center gap-1 py-0.5">
          <div className="h-3 w-px bg-border" />
          <Badge variant="secondary" className={cn('text-[9px] font-bold px-1.5 py-0', c.bg, c.text)}>
            ↓ {convRate.toFixed(1)}%
          </Badge>
          <div className="h-3 w-px bg-border" />
        </div>
      )}
      {isExpanded && children}
    </div>
  );
}

// ─── Traffic Creative Funnel ─────────────────────────────────────
function TrafficFunnel({ creative }: { creative: AdCreative }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const m = calculateCreativeMetrics(creative);
  const vals = [Number(creative.investment), creative.clicks, creative.leads_generated, creative.appointments, creative.attendance, creative.sales, Number(creative.revenue)];
  const convs = [null, null, m.convClickToLead, m.convLeadToAppointment, m.convAppointmentToAttendance, m.convAttendanceToSale, null];

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {TRAFFIC_STAGES.map((stage, i) => {
        const conv = convs[i];
        const status = conv !== null ? getStatus(conv) : 'healthy';
        return (
          <FunnelLayer
            key={stage.key} label={stage.label}
            value={vals[i]}
            displayValue={'isCurrency' in stage && stage.isCurrency ? formatCurrency(vals[i]) : String(vals[i])}
            status={status} width={TRAFFIC_WIDTHS[i]} isLast={i === TRAFFIC_STAGES.length - 1}
            convRate={conv} isExpanded={expanded === stage.key}
            onToggle={() => setExpanded(expanded === stage.key ? null : stage.key)}
          >
            <div className="w-full max-w-sm mt-1 mb-1 p-2 rounded-lg border bg-card shadow-sm animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground font-medium">Custos</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">CPC:</span><span className="font-bold">{formatCurrency(m.cpc)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">CPL:</span><span className="font-bold">{formatCurrency(m.cpl)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">CAC:</span><span className="font-bold">{formatCurrency(m.cac)}</span></div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground font-medium">Resultado</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">ROI:</span><span className={cn('font-bold', m.roi >= 0 ? 'text-success' : 'text-destructive')}>{m.roi.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lucro:</span><span className={cn('font-bold', m.isProfitable ? 'text-success' : 'text-destructive')}>{formatCurrency(m.profit)}</span></div>
                </div>
              </div>
            </div>
          </FunnelLayer>
        );
      })}
    </div>
  );
}

// ─── Sales Funnel ────────────────────────────────────────────────
function SalesFunnel({ leads }: { leads: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const stages = useMemo(() => {
    const total = leads.length;
    return SALES_STEPS.map((step, index) => {
      const laterStatuses = SALES_STEPS.slice(index).flatMap(s => s.statuses);
      const countInOrPast = leads.filter(l => laterStatuses.includes(l.status)).length;
      const nextStep = SALES_STEPS[index + 1];
      let convRate = 0;
      if (nextStep && countInOrPast > 0) {
        const nextLater = SALES_STEPS.slice(index + 1).flatMap(s => s.statuses);
        convRate = Math.round((leads.filter(l => nextLater.includes(l.status)).length / countInOrPast) * 100);
      }
      const cumRate = total > 0 ? Math.round((countInOrPast / total) * 100) : 0;
      const stageLeads = leads.filter(l => step.statuses.includes(l.status));
      const bySource: Record<string, number> = {};
      stageLeads.forEach(l => { bySource[l.source || 'outro'] = (bySource[l.source || 'outro'] || 0) + 1; });

      return { ...step, count: countInOrPast, convRate, cumRate, bySource, status: (index === 0 ? 'healthy' : getStatus(convRate, [50, 25])) as PerfStatus };
    });
  }, [leads]);

  const totalConv = stages.length >= 2 && stages[0].count > 0
    ? Math.round((stages[stages.length - 1].count / stages[0].count) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          Conversão Total do Funil
        </div>
        <Badge variant="outline" className={cn('text-xs font-bold border',
          totalConv >= 15 ? 'bg-success/10 text-success border-success/20'
            : totalConv >= 8 ? 'bg-warning/10 text-warning border-warning/20'
            : 'bg-destructive/10 text-destructive border-destructive/20'
        )}>{totalConv}%</Badge>
      </div>
      <div className="flex flex-col items-center gap-1 py-2">
        {stages.map((stage, i) => (
          <FunnelLayer
            key={stage.key} label={stage.label} value={stage.count}
            displayValue={String(stage.count)} status={stage.status}
            width={SALES_WIDTHS[i]} isLast={i === stages.length - 1}
            convRate={i < stages.length - 1 ? stage.convRate : null}
            isExpanded={expanded === stage.key}
            onToggle={() => setExpanded(expanded === stage.key ? null : stage.key)}
          >
            <div className="w-full max-w-sm mt-1 mb-1 p-2 rounded-lg border bg-card shadow-sm animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Origem</p>
                  {Object.entries(stage.bySource).length > 0
                    ? Object.entries(stage.bySource).sort(([, a], [, b]) => b - a).map(([src, cnt]) => {
                        const cfg = SOURCE_CONFIG[src as keyof typeof SOURCE_CONFIG];
                        return (
                          <div key={src} className="flex items-center justify-between py-0.5">
                            <Badge variant="outline" className={cn('text-[9px]', cfg?.color)}>{cfg?.label || src}</Badge>
                            <span className="font-semibold">{cnt}</span>
                          </div>
                        );
                      })
                    : <p className="text-muted-foreground italic text-[10px]">Sem dados</p>}
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground font-medium">Métricas</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Qtd:</span><span className="font-bold">{stage.count}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">% funil:</span><span className="font-bold">{stage.cumRate}%</span></div>
                </div>
              </div>
            </div>
          </FunnelLayer>
        ))}
      </div>
    </div>
  );
}

// ─── Creative Form Dialog ────────────────────────────────────────
function CreativeFormDialog({ creative, onSave, trigger }: {
  creative?: AdCreative; onSave: (data: Partial<AdCreative>) => void; trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: creative?.name || '', link_url: creative?.link_url || '',
    investment: creative?.investment || 0, clicks: creative?.clicks || 0,
    leads_generated: creative?.leads_generated || 0, appointments: creative?.appointments || 0,
    attendance: creative?.attendance || 0, sales: creative?.sales || 0, revenue: creative?.revenue || 0,
    reference_month: creative?.reference_month || startOfMonth(new Date()).toISOString().split('T')[0],
  });
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, ...(creative ? { id: creative.id } : {}) });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{creative ? 'Editar Criativo' : 'Novo Criativo'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Story Implantes" /></div>
          <div><Label>Link do Criativo</Label><Input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." /></div>
          <div><Label>Mês Referência</Label><Input type="month" value={form.reference_month.slice(0, 7)} onChange={e => setForm(f => ({ ...f, reference_month: e.target.value + '-01' }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Investimento (R$)</Label><CurrencyInput value={form.investment} onChange={v => setForm(f => ({ ...f, investment: v }))} /></div>
            <div><Label>Cliques</Label><Input type="number" value={form.clicks} onChange={e => setForm(f => ({ ...f, clicks: Number(e.target.value) }))} /></div>
            <div><Label>Leads</Label><Input type="number" value={form.leads_generated} onChange={e => setForm(f => ({ ...f, leads_generated: Number(e.target.value) }))} /></div>
            <div><Label>Agendamentos</Label><Input type="number" value={form.appointments} onChange={e => setForm(f => ({ ...f, appointments: Number(e.target.value) }))} /></div>
            <div><Label>Comparecimento</Label><Input type="number" value={form.attendance} onChange={e => setForm(f => ({ ...f, attendance: Number(e.target.value) }))} /></div>
            <div><Label>Vendas</Label><Input type="number" value={form.sales} onChange={e => setForm(f => ({ ...f, sales: Number(e.target.value) }))} /></div>
            <div className="col-span-2"><Label>Faturamento (R$)</Label><CurrencyInput value={form.revenue} onChange={v => setForm(f => ({ ...f, revenue: v }))} /></div>
          </div>
          <Button onClick={handleSubmit} className="w-full">{creative ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Insights ────────────────────────────────────────────────────
function getCrossInsights(consolidated: any, salesLeads: any[]): string[] {
  const insights: string[] = [];
  const totalLeads = salesLeads.length;
  const closedLeads = salesLeads.filter(l => l.status === 'fechado').length;
  const scheduledStatuses = ['agendou', 'consulta_agendada', 'confirmado', 'compareceu', 'fechado'];
  const scheduled = salesLeads.filter(l => scheduledStatuses.includes(l.status)).length;
  const attended = salesLeads.filter(l => ['compareceu', 'fechado'].includes(l.status)).length;

  if (consolidated.totalClicks > 0 && consolidated.totalLeads / consolidated.totalClicks < 0.1)
    insights.push('🚨 Muito clique e pouco lead → problema na landing page ou atendimento inicial');
  if (totalLeads > 0 && scheduled / totalLeads < 0.3)
    insights.push('⚠️ Poucos leads agendando → revisar abordagem de captação e tempo de resposta');
  if (scheduled > 0 && attended / scheduled < 0.5)
    insights.push('⚠️ Baixo comparecimento → melhorar confirmação de consulta e lembretes');
  if (attended > 0 && closedLeads / attended < 0.3)
    insights.push('⚠️ Baixa taxa de fechamento → revisar abordagem comercial e condições');
  if (consolidated.totalRevenue > consolidated.totalInvestment * 3)
    insights.push('🟢 ROI excelente → considere escalar os melhores criativos');
  if (consolidated.totalInvestment > 0 && consolidated.totalRevenue < consolidated.totalInvestment)
    insights.push('🚨 Prejuízo geral → CAC acima do retorno, avaliar pausar campanhas');
  return insights;
}

// ─── Main Page ───────────────────────────────────────────────────
export default function CentralFunis() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { creatives, consolidated, bestCreative, worstCreative, isLoading: loadingAds, addCreative, updateCreative, deleteCreative } = useAdCreatives(selectedMonth);
  const { data: leads, isLoading: loadingLeads } = useCRMLeads();
  const [trafficView, setTrafficView] = useState<'consolidated' | 'individual'>('consolidated');

  const allLeads = leads || [];
  const isLoading = loadingAds || loadingLeads;

  const consolidatedMetrics = useMemo(() => {
    const inv = consolidated.totalInvestment;
    const s = consolidated.totalSales;
    const rev = consolidated.totalRevenue;
    const closedLeads = allLeads.filter(l => l.status === 'fechado').length;
    const totalSales = s || closedLeads;
    return {
      cac: totalSales > 0 ? inv / totalSales : 0,
      roi: inv > 0 ? ((rev - inv) / inv) * 100 : 0,
      profit: rev - inv,
      isProfitable: rev > inv,
      ticketMedio: totalSales > 0 ? rev / totalSales : 0,
      lucroPerPaciente: totalSales > 0 ? (rev - inv) / totalSales : 0,
      totalConvClick: consolidated.totalClicks > 0 ? (totalSales / consolidated.totalClicks) * 100 : 0,
    };
  }, [consolidated, allLeads]);

  const consolidatedFunnel: AdCreative = useMemo(() => ({
    id: 'consolidated', name: 'Todos os Criativos', link_url: null, platform: 'instagram',
    investment: consolidated.totalInvestment, clicks: consolidated.totalClicks,
    leads_generated: consolidated.totalLeads, appointments: consolidated.totalAppointments,
    attendance: consolidated.totalAttendance, sales: consolidated.totalSales,
    revenue: consolidated.totalRevenue, reference_month: '', is_active: true,
    created_by: '', created_at: '', updated_at: '',
  }), [consolidated]);

  const crossInsights = useMemo(() => getCrossInsights(consolidated, allLeads), [consolidated, allLeads]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Central de Funis Inteligente
            </h1>
            <p className="text-xs text-muted-foreground">Tráfego + Vendas integrados em tempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month" className="w-40 text-xs"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={e => { const [y, m] = e.target.value.split('-'); setSelectedMonth(new Date(Number(y), Number(m) - 1, 1)); }}
            />
            <CreativeFormDialog
              onSave={d => addCreative.mutate(d as any)}
              trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Criativo</Button>}
            />
          </div>
        </div>

        {/* ═══ Connection Panel ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'CAC Real', value: formatCurrency(consolidatedMetrics.cac), icon: Target, status: consolidatedMetrics.cac > 0 && consolidatedMetrics.ticketMedio > consolidatedMetrics.cac },
            { label: 'Ticket Médio', value: formatCurrency(consolidatedMetrics.ticketMedio), icon: DollarSign },
            { label: 'ROI Total', value: `${consolidatedMetrics.roi.toFixed(1)}%`, icon: TrendingUp, status: consolidatedMetrics.roi >= 0 },
            { label: 'Lucro Total', value: formatCurrency(consolidatedMetrics.profit), icon: Activity, status: consolidatedMetrics.isProfitable },
            { label: 'Lucro/Paciente', value: formatCurrency(consolidatedMetrics.lucroPerPaciente), icon: DollarSign, status: consolidatedMetrics.lucroPerPaciente > 0 },
            { label: 'Conv. Click→Venda', value: `${consolidatedMetrics.totalConvClick.toFixed(2)}%`, icon: TrendingUp },
          ].map((item, i) => (
            <Card key={i} className="monday-card">
              <CardContent className="p-2.5 text-center">
                <item.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[9px] text-muted-foreground uppercase font-semibold leading-tight">{item.label}</p>
                <p className={cn('text-sm font-bold mt-0.5',
                  item.status === true ? 'text-success' : item.status === false ? 'text-destructive' : 'text-foreground'
                )}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ranking */}
        {creatives.length >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bestCreative && (
              <Card className="monday-card border-success/30">
                <CardContent className="p-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Melhor Criativo</p>
                    <p className="text-sm font-bold text-success">{bestCreative.name}</p>
                    <p className="text-xs text-muted-foreground">Lucro: {formatCurrency(Number(bestCreative.revenue) - Number(bestCreative.investment))}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {worstCreative && (
              <Card className="monday-card border-destructive/30">
                <CardContent className="p-3 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pior Criativo</p>
                    <p className="text-sm font-bold text-destructive">{worstCreative.name}</p>
                    <p className="text-xs text-muted-foreground">Resultado: {formatCurrency(Number(worstCreative.revenue) - Number(worstCreative.investment))}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Two Funnels ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Traffic Funnel */}
          <Card className="monday-card overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Funil de Tráfego Pago</CardTitle>
                </div>
                {creatives.length > 0 && (
                  <div className="flex gap-1">
                    <Button variant={trafficView === 'consolidated' ? 'default' : 'ghost'} size="sm" className="h-7 text-[10px] px-2"
                      onClick={() => setTrafficView('consolidated')}>
                      <Eye className="h-3 w-3 mr-0.5" /> Geral
                    </Button>
                    <Button variant={trafficView === 'individual' ? 'default' : 'ghost'} size="sm" className="h-7 text-[10px] px-2"
                      onClick={() => setTrafficView('individual')}>
                      <Megaphone className="h-3 w-3 mr-0.5" /> Individual
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {creatives.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Adicione criativos para ver o funil</p>
                </div>
              ) : trafficView === 'consolidated' ? (
                <TrafficFunnel creative={consolidatedFunnel} />
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {creatives.map(c => {
                    const m = calculateCreativeMetrics(c);
                    return (
                      <div key={c.id} className={cn('rounded-lg border p-3', !m.isProfitable && 'border-destructive/30')}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Badge variant={m.isProfitable ? 'default' : 'destructive'} className="text-[9px] shrink-0">
                              {m.isProfitable ? '✅ Lucro' : '🚨 Prejuízo'}
                            </Badge>
                            <span className="text-xs font-bold truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {safeUrl(c.link_url) && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                <a href={safeUrl(c.link_url) ?? "#"} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink className="h-3 w-3" /></a>
                              </Button>
                            )}
                            <CreativeFormDialog creative={c} onSave={d => d.id && updateCreative.mutate(d as any)}
                              trigger={<Button variant="ghost" size="icon" className="h-6 w-6"><Edit2 className="h-3 w-3" /></Button>} />
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCreative.mutate(c.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <TrafficFunnel creative={c} />
                        <div className="grid grid-cols-3 gap-1.5 mt-2 p-2 rounded bg-muted/50 text-[10px]">
                          <div className="text-center"><p className="text-muted-foreground">CPC</p><p className="font-bold">{formatCurrency(m.cpc)}</p></div>
                          <div className="text-center"><p className="text-muted-foreground">CPL</p><p className="font-bold">{formatCurrency(m.cpl)}</p></div>
                          <div className="text-center"><p className="text-muted-foreground">ROI</p><p className={cn('font-bold', m.roi >= 0 ? 'text-success' : 'text-destructive')}>{m.roi.toFixed(1)}%</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Funnel */}
          <Card className="monday-card overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Funil de Vendas</CardTitle>
              </div>
              <p className="text-[10px] text-muted-foreground">Dados em tempo real do CRM</p>
            </CardHeader>
            <CardContent>
              <SalesFunnel leads={allLeads} />
            </CardContent>
          </Card>
        </div>

        {/* ═══ Cross Insights ═══ */}
        {crossInsights.length > 0 && (
          <Card className="monday-card border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Insights Inteligentes (Cruzados)</CardTitle>
              </div>
              <p className="text-[10px] text-muted-foreground">Análise automática entre tráfego e vendas</p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {crossInsights.map((ins, i) => (
                <p key={i} className="text-xs text-muted-foreground leading-relaxed pl-2">{ins}</p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
