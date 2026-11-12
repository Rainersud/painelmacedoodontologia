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
import { formatCurrency } from '@/lib/currency';
import {
  Plus, TrendingUp, TrendingDown, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, XCircle, Lightbulb, Trophy, Megaphone,
  Trash2, Edit2, Eye
} from 'lucide-react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchMetricsData, leadOrigin, newLeads, revenue, sales, trafficInvestmentCheck } from '@/lib/metrics';
import { ptBR } from 'date-fns/locale';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { safeUrl, isValidHttpUrl } from '@/lib/sanitize';

// ─── Funnel Stage Config ─────────────────────────────────────────
const FUNNEL_STAGES = [
  { key: 'investment', label: 'Investimento', field: 'investment', isCurrency: true },
  { key: 'clicks', label: 'Cliques', field: 'clicks' },
  { key: 'leads', label: 'Leads Gerados', field: 'leads_generated' },
  { key: 'appointments', label: 'Agendamentos', field: 'appointments' },
  { key: 'attendance', label: 'Comparecimento', field: 'attendance' },
  { key: 'sales', label: 'Venda Realizada', field: 'sales' },
  { key: 'revenue', label: 'Faturamento', field: 'revenue', isCurrency: true },
] as const;

const WIDTHS = [100, 88, 76, 64, 52, 42, 34];

function getPerformanceStatus(rate: number): 'healthy' | 'attention' | 'critical' {
  if (rate >= 40) return 'healthy';
  if (rate >= 20) return 'attention';
  return 'critical';
}

function getStatusColors(status: 'healthy' | 'attention' | 'critical') {
  const map = {
    healthy: { gradient: 'from-success/80 to-success', text: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    attention: { gradient: 'from-warning/80 to-warning', text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    critical: { gradient: 'from-destructive/80 to-destructive', text: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  };
  return map[status];
}

function StatusIcon({ status }: { status: 'healthy' | 'attention' | 'critical' }) {
  if (status === 'healthy') return <CheckCircle className="h-4 w-4 text-success" />;
  if (status === 'attention') return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

// ─── Creative Funnel Visual ─────────────────────────────────────
function CreativeFunnel({ creative }: { creative: AdCreative }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const metrics = calculateCreativeMetrics(creative);

  const stageValues = [
    Number(creative.investment),
    creative.clicks,
    creative.leads_generated,
    creative.appointments,
    creative.attendance,
    creative.sales,
    Number(creative.revenue),
  ];

  const conversions = [
    null, // investment has no "from" stage
    null, // clicks → no conversion from investment
    metrics.convClickToLead,
    metrics.convLeadToAppointment,
    metrics.convAppointmentToAttendance,
    metrics.convAttendanceToSale,
    null, // revenue is result
  ];

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      {FUNNEL_STAGES.map((stage, index) => {
        const value = stageValues[index];
        const conv = conversions[index];
        const status = conv !== null ? getPerformanceStatus(conv) : 'healthy';
        const colors = getStatusColors(status);
        const width = WIDTHS[index];
        const isExp = expanded === stage.key;

        return (
          <div key={stage.key} className="w-full flex flex-col items-center">
            <button
              onClick={() => setExpanded(isExp ? null : stage.key)}
              className="w-full focus:outline-none group"
              style={{ maxWidth: `${width}%` }}
            >
              <div
                className={cn(
                  'relative rounded-lg py-2.5 px-3 transition-all duration-300',
                  'bg-gradient-to-r shadow-md hover:shadow-lg',
                  colors.gradient,
                  'cursor-pointer hover:scale-[1.02]',
                  isExp && 'ring-2 ring-primary/50'
                )}
                style={{
                  clipPath: index < FUNNEL_STAGES.length - 1
                    ? 'polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)'
                    : 'polygon(0% 0%, 100% 0%, 97% 100%, 3% 100%)',
                }}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={status} />
                    <span className="text-xs font-bold text-white drop-shadow-sm">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-white drop-shadow-sm">
                      {'isCurrency' in stage && stage.isCurrency ? formatCurrency(value) : value}
                    </span>
                    {isExp ? <ChevronUp className="h-3 w-3 text-white/70" /> : <ChevronDown className="h-3 w-3 text-white/70" />}
                  </div>
                </div>
              </div>
            </button>

            {/* Conversion arrow */}
            {conv !== null && (
              <div className="flex items-center gap-1 py-0.5">
                <div className="h-3 w-px bg-border" />
                <Badge variant="secondary" className={cn('text-[9px] font-bold px-1.5 py-0', colors.bg, colors.text)}>
                  ↓ {conv.toFixed(1)}%
                </Badge>
                <div className="h-3 w-px bg-border" />
              </div>
            )}

            {/* Expanded details */}
            {isExp && (
              <div className="w-full max-w-sm mt-1 mb-1 p-2.5 rounded-lg border bg-card shadow-sm animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-medium">Custos</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">CPC:</span><span className="font-bold">{formatCurrency(metrics.cpc)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">CPL:</span><span className="font-bold">{formatCurrency(metrics.cpl)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">CAC:</span><span className="font-bold">{formatCurrency(metrics.cac)}</span></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-medium">Resultado</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">ROI:</span><span className={cn('font-bold', metrics.roi >= 0 ? 'text-success' : 'text-destructive')}>{metrics.roi.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Lucro:</span><span className={cn('font-bold', metrics.isProfitable ? 'text-success' : 'text-destructive')}>{formatCurrency(metrics.profit)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Conv. Total:</span><span className="font-bold">{metrics.convTotal.toFixed(2)}%</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Insights Generator ─────────────────────────────────────────
function getCreativeInsights(c: AdCreative): string[] {
  const m = calculateCreativeMetrics(c);
  const insights: string[] = [];
  if (m.convClickToLead < 15) insights.push('🚨 Alto clique e baixo lead → problema na página ou atendimento');
  if (m.convLeadToAppointment < 20) insights.push('⚠️ Poucos agendamentos → revisar abordagem de captação');
  if (m.convAppointmentToAttendance < 30) insights.push('⚠️ Baixo comparecimento → melhorar confirmação de consulta');
  if (m.convAttendanceToSale < 25) insights.push('⚠️ Baixa taxa de fechamento → revisar abordagem comercial');
  if (m.isProfitable && m.roi > 100) insights.push('🟢 Criativo altamente lucrativo → considere escalar');
  if (!m.isProfitable) insights.push('🚨 Criativo com CAC acima do retorno → avaliar pausar');
  return insights;
}

// ─── Add/Edit Dialog ────────────────────────────────────────────
function CreativeFormDialog({ creative, onSave, trigger }: {
  creative?: AdCreative;
  onSave: (data: Partial<AdCreative>) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: creative?.name || '',
    link_url: creative?.link_url || '',
    investment: creative?.investment || 0,
    clicks: creative?.clicks || 0,
    leads_generated: creative?.leads_generated || 0,
    appointments: creative?.appointments || 0,
    attendance: creative?.attendance || 0,
    sales: creative?.sales || 0,
    revenue: creative?.revenue || 0,
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
        <DialogHeader>
          <DialogTitle>{creative ? 'Editar Criativo' : 'Novo Criativo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do Criativo *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Story Implantes Março" />
          </div>
          <div>
            <Label>Link do Criativo</Label>
            <Input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <Label>Mês de Referência</Label>
            <Input type="month" value={form.reference_month.slice(0, 7)} onChange={e => setForm(f => ({ ...f, reference_month: e.target.value + '-01' }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Investimento (R$)</Label>
              <CurrencyInput value={form.investment} onChange={v => setForm(f => ({ ...f, investment: v }))} />
            </div>
            <div>
              <Label>Cliques</Label>
              <Input type="number" value={form.clicks} onChange={e => setForm(f => ({ ...f, clicks: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Leads Gerados</Label>
              <Input type="number" value={form.leads_generated} onChange={e => setForm(f => ({ ...f, leads_generated: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Agendamentos</Label>
              <Input type="number" value={form.appointments} onChange={e => setForm(f => ({ ...f, appointments: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Comparecimento</Label>
              <Input type="number" value={form.attendance} onChange={e => setForm(f => ({ ...f, attendance: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Vendas</Label>
              <Input type="number" value={form.sales} onChange={e => setForm(f => ({ ...f, sales: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <Label>Faturamento (R$)</Label>
              <CurrencyInput value={form.revenue} onChange={v => setForm(f => ({ ...f, revenue: v }))} />
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full">
            {creative ? 'Salvar Alterações' : 'Adicionar Criativo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
// ─── Conferência com o CAC e resultado real dos leads de tráfego ──
const PAID_ORIGINS = ['facebook', 'instagram', 'google'];

function TrafficReconciliation({ month, creatives }: { month: Date; creatives: AdCreative[] }) {
  const range = { start: startOfMonth(month), end: endOfMonth(month) };
  const { data } = useQuery({
    queryKey: ['traffic-reconciliation', range.start.toISOString()],
    queryFn: () => fetchMetricsData(range),
  });
  if (!data) return null;

  const check = trafficInvestmentCheck(creatives, data.costs, month);
  const isPaid = (id?: string | null) => {
    const l = data.leads.find(x => x.id === id);
    return !!l && PAID_ORIGINS.includes(leadOrigin(l));
  };
  const paidLeads = newLeads(data.leads, range).filter(l => PAID_ORIGINS.includes(leadOrigin(l))).length;
  const paidSales = sales(data.leads, range).filter(l => PAID_ORIGINS.includes(leadOrigin(l))).length;
  const paidRevenue = revenue(data.payments.filter(p => isPaid(p.lead_id)), range);
  const typedRevenue = creatives.reduce((sum, c) => sum + Number(c.revenue || 0), 0);
  const typedSales = creatives.reduce((sum, c) => sum + Number(c.sales || 0), 0);

  return (
    <Card className={cn('monday-card', !check.matches && 'border-warning')}>
      <CardContent className="p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          {check.matches ? <CheckCircle className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
          {check.matches
            ? 'Investimento das campanhas confere com o CAC (Anúncios)'
            : `Investimento das campanhas difere do CAC (Anúncios) em ${formatCurrency(Math.abs(check.difference))}`}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
          <p>Campanhas: <span className="font-semibold text-foreground">{formatCurrency(check.campaigns)}</span></p>
          <p>CAC – Anúncios: <span className="font-semibold text-foreground">{formatCurrency(check.cac)}</span></p>
          <p>Leads reais (Facebook, Instagram, Google): <span className="font-semibold text-foreground">{paidLeads}</span></p>
          <p>Vendas reais: <span className="font-semibold text-foreground">{paidSales}</span> (digitado: {typedSales})</p>
          <p className="col-span-2">Faturamento real desses leads: <span className="font-semibold text-foreground">{formatCurrency(paidRevenue)}</span> (digitado: {formatCurrency(typedRevenue)})</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FunilTrafego() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { creatives, consolidated, bestCreative, worstCreative, isLoading, addCreative, updateCreative, deleteCreative } = useAdCreatives(selectedMonth);
  const [viewMode, setViewMode] = useState<'individual' | 'consolidated'>('consolidated');
  const [selectedCreative, setSelectedCreative] = useState<string | null>(null);

  const consolidatedMetrics = useMemo(() => {
    const inv = consolidated.totalInvestment;
    const s = consolidated.totalSales;
    const rev = consolidated.totalRevenue;
    return {
      cac: s > 0 ? inv / s : 0,
      roi: inv > 0 ? ((rev - inv) / inv) * 100 : 0,
      profit: rev - inv,
      isProfitable: rev > inv,
    };
  }, [consolidated]);

  const consolidatedFunnel: AdCreative = useMemo(() => ({
    id: 'consolidated',
    name: 'Todos os Criativos',
    link_url: null,
    platform: 'instagram',
    investment: consolidated.totalInvestment,
    clicks: consolidated.totalClicks,
    leads_generated: consolidated.totalLeads,
    appointments: consolidated.totalAppointments,
    attendance: consolidated.totalAttendance,
    sales: consolidated.totalSales,
    revenue: consolidated.totalRevenue,
    reference_month: '',
    is_active: true,
    created_by: '',
    created_at: '',
    updated_at: '',
  }), [consolidated]);

  const handleAdd = (data: Partial<AdCreative>) => {
    addCreative.mutate(data as any);
  };

  const handleUpdate = (data: Partial<AdCreative>) => {
    if (data.id) updateCreative.mutate(data as any);
  };

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
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Funil de Tráfego Pago
            </h1>
            <p className="text-xs text-muted-foreground">Análise inteligente por criativo</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              className="w-40 text-xs"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={e => {
                const [y, m] = e.target.value.split('-');
                setSelectedMonth(new Date(Number(y), Number(m) - 1, 1));
              }}
            />
            <CreativeFormDialog
              onSave={handleAdd}
              trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Criativo</Button>}
            />
          </div>
        </div>

        <TrafficReconciliation month={selectedMonth} creatives={creatives} />

        {/* Summary Cards */}
        {creatives.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="monday-card">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Investimento</p>
                <p className="text-sm font-bold">{formatCurrency(consolidated.totalInvestment)}</p>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Faturamento</p>
                <p className="text-sm font-bold text-success">{formatCurrency(consolidated.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">ROI</p>
                <p className={cn('text-sm font-bold', consolidatedMetrics.roi >= 0 ? 'text-success' : 'text-destructive')}>
                  {consolidatedMetrics.roi.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Lucro</p>
                <p className={cn('text-sm font-bold', consolidatedMetrics.isProfitable ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(consolidatedMetrics.profit)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* View Toggle */}
        {creatives.length > 0 && (
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)}>
            <TabsList className="grid grid-cols-2 w-full sm:w-72">
              <TabsTrigger value="consolidated" className="text-xs">
                <Eye className="h-3 w-3 mr-1" /> Consolidado
              </TabsTrigger>
              <TabsTrigger value="individual" className="text-xs">
                <Megaphone className="h-3 w-3 mr-1" /> Individual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="consolidated">
              <Card className="monday-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Funil Consolidado</CardTitle>
                    <Badge variant="outline" className="text-xs">{creatives.length} criativos</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CreativeFunnel creative={consolidatedFunnel} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="individual" className="space-y-3">
              {creatives.map(c => {
                const metrics = calculateCreativeMetrics(c);
                const insights = getCreativeInsights(c);
                return (
                  <Card key={c.id} className={cn('monday-card overflow-hidden', !metrics.isProfitable && 'border-destructive/30')}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge variant={metrics.isProfitable ? 'default' : 'destructive'} className="text-[9px] shrink-0">
                            {metrics.isProfitable ? '✅ Lucrativo' : '🚨 Prejuízo'}
                          </Badge>
                          <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {safeUrl(c.link_url) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={safeUrl(c.link_url) ?? "#"} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink className="h-3 w-3" /></a>
                            </Button>
                          )}
                          <CreativeFormDialog
                            creative={c}
                            onSave={handleUpdate}
                            trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="h-3 w-3" /></Button>}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCreative.mutate(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CreativeFunnel creative={c} />

                      {/* Metrics summary */}
                      <div className="grid grid-cols-3 gap-2 mt-2 p-2 rounded-lg bg-muted/50 text-xs">
                        <div className="text-center">
                          <p className="text-muted-foreground">CPC</p>
                          <p className="font-bold">{formatCurrency(metrics.cpc)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">CPL</p>
                          <p className="font-bold">{formatCurrency(metrics.cpl)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">CAC</p>
                          <p className="font-bold">{formatCurrency(metrics.cac)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">ROI</p>
                          <p className={cn('font-bold', metrics.roi >= 0 ? 'text-success' : 'text-destructive')}>{metrics.roi.toFixed(1)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Lucro</p>
                          <p className={cn('font-bold', metrics.isProfitable ? 'text-success' : 'text-destructive')}>{formatCurrency(metrics.profit)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Conv. Total</p>
                          <p className="font-bold">{metrics.convTotal.toFixed(2)}%</p>
                        </div>
                      </div>

                      {/* Insights */}
                      {insights.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <Lightbulb className="h-3 w-3" /> Insights
                          </div>
                          {insights.map((ins, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground pl-4">{ins}</p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {creatives.length === 0 && (
          <Card className="monday-card">
            <CardContent className="p-8 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">Nenhum criativo cadastrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Adicione seu primeiro criativo para começar a análise de tráfego pago.</p>
              <CreativeFormDialog
                onSave={handleAdd}
                trigger={<Button className="mt-4"><Plus className="h-4 w-4 mr-1" /> Adicionar Criativo</Button>}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
