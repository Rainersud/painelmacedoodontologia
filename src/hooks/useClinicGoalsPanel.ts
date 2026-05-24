import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  startOfDay, endOfDay, subDays,
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths,
  eachDayOfInterval, eachHourOfInterval, isWeekend,
} from 'date-fns';

export type Period = 'hoje' | 'semana' | 'mes';

export interface PanelMetric {
  key: string;
  label: string;
  current: number;
  target: number;
  percentage: number;
  display: string;
  targetDisplay: string;
  /** texto curto da meta saudável (ex: "300/mês", "R$ 6.000", "até 5 min") */
  healthyGoal: string;
  status: 'healthy' | 'warning' | 'critical';
  delta: number;
  trend: number[];
  lowerIsBetter?: boolean;
  unit?: 'currency' | 'count' | 'percent' | 'multiplier' | 'duration';
  /** taxa associada (ex.: Agendamentos -> taxa de agendamento) embutida no mesmo card */
  rate?: {
    label: string;
    display: string;
    targetDisplay: string;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export interface ClinicGoalsPanelData {
  period: Period;
  businessDays: number;
  totalBusinessDays: number;
  metrics: PanelMetric[];
  insights: string[];
  projectedRevenue: number;
}

interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  businessDays: number;
  totalBusinessDays: number;
  buckets: { start: Date; end: Date }[];
}

function countBusinessDays(start: Date, end: Date) {
  return eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length;
}

function buildRange(period: Period): PeriodRange {
  const now = new Date();
  if (period === 'hoje') {
    const start = startOfDay(now);
    const end = endOfDay(now);
    const prev = subDays(now, 1);
    // 8 buckets de 3h
    const hours = eachHourOfInterval({ start, end }).filter((_, i) => i % 3 === 0);
    const buckets = hours.map((h, i) => {
      const next = i + 1 < hours.length ? hours[i + 1] : end;
      return { start: h, end: next };
    });
    return {
      start, end,
      prevStart: startOfDay(prev), prevEnd: endOfDay(prev),
      businessDays: 1, totalBusinessDays: 1,
      buckets,
    };
  }
  if (period === 'semana') {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const prev = subWeeks(now, 1);
    const days = eachDayOfInterval({ start, end });
    return {
      start, end,
      prevStart: startOfWeek(prev, { weekStartsOn: 1 }),
      prevEnd: endOfWeek(prev, { weekStartsOn: 1 }),
      businessDays: 5, totalBusinessDays: 5,
      buckets: days.map(d => ({ start: startOfDay(d), end: endOfDay(d) })),
    };
  }
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const prev = subMonths(now, 1);
  const days = eachDayOfInterval({ start, end });
  return {
    start, end,
    prevStart: startOfMonth(prev), prevEnd: endOfMonth(prev),
    businessDays: countBusinessDays(start, now),
    totalBusinessDays: countBusinessDays(start, end),
    buckets: days.map(d => ({ start: startOfDay(d), end: endOfDay(d) })),
  };
}

const fmtBRL = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `R$ ${v.toLocaleString('pt-BR')}`;

const fmtBRLFull = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

export function useClinicGoalsPanel(period: Period) {
  return useQuery({
    queryKey: ['clinic-goals-panel', period],
    queryFn: async (): Promise<ClinicGoalsPanelData> => {
      const range = buildRange(period);

      // Settings (oficiais)
      const { data: settings } = await supabase.from('meta_settings').select('setting_key, setting_value');
      const s: Record<string, number> = {};
      (settings || []).forEach(r => { s[r.setting_key] = Number(r.setting_value); });

      const get = (k: string, fallback: number) => (s[k] ?? fallback);

      // Metas mensais oficiais
      const monthly = {
        leads: get('meta_leads', 300),
        agendamentos: get('meta_agendamentos', 135),
        taxaAgendamento: get('taxa_agendamentos', 45),
        comparecimentos: get('meta_comparecimentos', 95),
        taxaComparecimento: get('taxa_comparecimentos', 70),
        vendas: get('meta_fechamentos', 20),
        taxaFechamento: get('taxa_fechamentos', 21),
        ticket: get('meta_ticket_medio', 6000),
        faturamento: get('meta_faturamento', 120000),
        investimento: get('investimento_marketing', 6000),
        cpl: get('meta_cpl', 20),
        cac: get('meta_cac', 300),
        roi: get('meta_roi', 8),
        roas: get('meta_roas_bruto', 20),
      };

      // Proporciona meta mensal pelo período
      const proportion = range.businessDays / 20;
      const prop = (m: number) => Math.max(1, Math.round(m * proportion));

      // Buscas paralelas
      const [
        leadsRes,
        appsScheduledRes, appsAttendedRes,
        salesRes, paymentsRes,
        prevLeadsRes, prevSalesRes, prevPaymentsRes,
      ] = await Promise.all([
        supabase.from('leads').select('id, created_at, first_response_at')
          .gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString()),
        supabase.from('appointments').select('id, scheduled_at')
          .gte('scheduled_at', range.start.toISOString()).lte('scheduled_at', range.end.toISOString()),
        supabase.from('appointments').select('id, attended_at').not('attended_at', 'is', null)
          .gte('attended_at', range.start.toISOString()).lte('attended_at', range.end.toISOString()),
        supabase.from('leads').select('id, closed_at, treatment_value').eq('status', 'fechado')
          .gte('closed_at', range.start.toISOString()).lte('closed_at', range.end.toISOString()),
        supabase.from('payments').select('net_value, gross_value, paid_at').eq('status', 'pago')
          .gte('paid_at', range.start.toISOString()).lte('paid_at', range.end.toISOString()),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .gte('created_at', range.prevStart.toISOString()).lte('created_at', range.prevEnd.toISOString()),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'fechado')
          .gte('closed_at', range.prevStart.toISOString()).lte('closed_at', range.prevEnd.toISOString()),
        supabase.from('payments').select('net_value').eq('status', 'pago')
          .gte('paid_at', range.prevStart.toISOString()).lte('paid_at', range.prevEnd.toISOString()),
      ]);

      const leads = leadsRes.data || [];
      const appsSched = appsScheduledRes.data || [];
      const appsAtt = appsAttendedRes.data || [];
      const sales = salesRes.data || [];
      const payments = paymentsRes.data || [];

      const leadsCount = leads.length;
      const agendCount = appsSched.length;
      const compCount = appsAtt.length;
      const salesCount = sales.length;
      const revenue = payments.reduce((sum, p) => sum + Number(p.net_value || 0), 0);
      const grossRevenue = payments.reduce((sum, p) => sum + Number(p.gross_value || p.net_value || 0), 0);

      // Investimento proporcional
      const investmentProp = monthly.investimento * proportion;

      const taxaAgendamento = leadsCount ? (agendCount / leadsCount) * 100 : 0;
      const taxaComparecimento = agendCount ? (compCount / agendCount) * 100 : 0;
      const taxaFechamento = compCount ? (salesCount / compCount) * 100 : 0;
      const ticketMedio = salesCount ? revenue / salesCount : 0;
      const cpl = leadsCount ? investmentProp / leadsCount : 0;
      const cac = salesCount ? investmentProp / salesCount : 0;
      const roi = investmentProp ? revenue / investmentProp : 0;
      const roas = investmentProp ? grossRevenue / investmentProp : 0;

      // Período anterior
      const prevLeads = prevLeadsRes.count || 0;
      const prevSales = prevSalesRes.count || 0;
      const prevRevenue = (prevPaymentsRes.data || []).reduce((sum, p) => sum + Number(p.net_value || 0), 0);

      const delta = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;

      // Sparkline buckets
      const inBucket = (iso: string | null, b: { start: Date; end: Date }) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return t >= b.start.getTime() && t <= b.end.getTime();
      };
      const trendOf = <T extends { created_at?: string; scheduled_at?: string; attended_at?: string | null; closed_at?: string | null; paid_at?: string | null }>(
        rows: T[], field: keyof T,
      ) => range.buckets.map(b => rows.filter(r => inBucket((r as any)[field] || null, b)).length);

      const trendLeads = trendOf(leads as any[], 'created_at');
      const trendAgend = trendOf(appsSched as any[], 'scheduled_at');
      const trendComp = trendOf(appsAtt as any[], 'attended_at');
      const trendSales = trendOf(sales as any[], 'closed_at');
      const trendRevenue = range.buckets.map(b =>
        payments.filter(p => inBucket(p.paid_at as string | null, b)).reduce((sum, p) => sum + Number(p.net_value || 0), 0),
      );
      // taxas como séries pontuais (simplificado)
      const trendRate = (a: number[], b: number[]) => a.map((v, i) => b[i] ? Math.round((v / b[i]) * 100) : 0);

      // status helper (lower-is-better invertido)
      const statusOf = (current: number, target: number, lowerIsBetter = false): PanelMetric['status'] => {
        if (target <= 0) return 'warning';
        const ratio = lowerIsBetter ? target / Math.max(current, 0.0001) : current / target;
        if (ratio >= 0.85) return 'healthy';
        if (ratio >= 0.55) return 'warning';
        return 'critical';
      };

      const metrics: PanelMetric[] = [
        {
          key: 'leads', label: 'Novos Leads',
          current: leadsCount, target: prop(monthly.leads),
          percentage: Math.min(100, Math.round((leadsCount / prop(monthly.leads)) * 100)),
          display: String(leadsCount), targetDisplay: String(prop(monthly.leads)),
          status: statusOf(leadsCount, prop(monthly.leads)),
          delta: delta(leadsCount, prevLeads),
          trend: trendLeads, unit: 'count',
        },
        {
          key: 'agendamentos', label: 'Agendamentos',
          current: agendCount, target: prop(monthly.agendamentos),
          percentage: Math.min(100, Math.round((agendCount / prop(monthly.agendamentos)) * 100)),
          display: String(agendCount), targetDisplay: String(prop(monthly.agendamentos)),
          status: statusOf(agendCount, prop(monthly.agendamentos)),
          delta: 0, trend: trendAgend, unit: 'count',
        },
        {
          key: 'taxa_agendamento', label: 'Taxa de Agendamento',
          current: Math.round(taxaAgendamento), target: monthly.taxaAgendamento,
          percentage: Math.min(100, Math.round((taxaAgendamento / monthly.taxaAgendamento) * 100)),
          display: `${taxaAgendamento.toFixed(1)}%`, targetDisplay: `${monthly.taxaAgendamento}%`,
          status: statusOf(taxaAgendamento, monthly.taxaAgendamento),
          delta: 0, trend: trendRate(trendAgend, trendLeads), unit: 'percent',
        },
        {
          key: 'comparecimentos', label: 'Comparecimentos',
          current: compCount, target: prop(monthly.comparecimentos),
          percentage: Math.min(100, Math.round((compCount / prop(monthly.comparecimentos)) * 100)),
          display: String(compCount), targetDisplay: String(prop(monthly.comparecimentos)),
          status: statusOf(compCount, prop(monthly.comparecimentos)),
          delta: 0, trend: trendComp, unit: 'count',
        },
        {
          key: 'taxa_comparecimento', label: 'Taxa de Comparecimento',
          current: Math.round(taxaComparecimento), target: monthly.taxaComparecimento,
          percentage: Math.min(100, Math.round((taxaComparecimento / monthly.taxaComparecimento) * 100)),
          display: `${taxaComparecimento.toFixed(1)}%`, targetDisplay: `${monthly.taxaComparecimento}%`,
          status: statusOf(taxaComparecimento, monthly.taxaComparecimento),
          delta: 0, trend: trendRate(trendComp, trendAgend), unit: 'percent',
        },
        {
          key: 'vendas', label: 'Vendas Realizadas',
          current: salesCount, target: prop(monthly.vendas),
          percentage: Math.min(100, Math.round((salesCount / prop(monthly.vendas)) * 100)),
          display: String(salesCount), targetDisplay: String(prop(monthly.vendas)),
          status: statusOf(salesCount, prop(monthly.vendas)),
          delta: delta(salesCount, prevSales),
          trend: trendSales, unit: 'count',
        },
        {
          key: 'taxa_fechamento', label: 'Taxa de Fechamento',
          current: Math.round(taxaFechamento), target: monthly.taxaFechamento,
          percentage: Math.min(100, Math.round((taxaFechamento / monthly.taxaFechamento) * 100)),
          display: `${taxaFechamento.toFixed(1)}%`, targetDisplay: `${monthly.taxaFechamento}%`,
          status: statusOf(taxaFechamento, monthly.taxaFechamento),
          delta: 0, trend: trendRate(trendSales, trendComp), unit: 'percent',
        },
        {
          key: 'ticket_medio', label: 'Ticket Médio',
          current: Math.round(ticketMedio), target: monthly.ticket,
          percentage: Math.min(100, Math.round((ticketMedio / monthly.ticket) * 100)),
          display: fmtBRL(ticketMedio), targetDisplay: fmtBRL(monthly.ticket),
          status: statusOf(ticketMedio, monthly.ticket),
          delta: 0, trend: trendSales.map((c, i) => c ? Math.round(trendRevenue[i] / c) : 0), unit: 'currency',
        },
        {
          key: 'faturamento', label: 'Faturamento',
          current: Math.round(revenue), target: Math.round(monthly.faturamento * proportion),
          percentage: Math.min(100, Math.round((revenue / (monthly.faturamento * proportion)) * 100)),
          display: fmtBRL(revenue), targetDisplay: fmtBRL(monthly.faturamento * proportion),
          status: statusOf(revenue, monthly.faturamento * proportion),
          delta: delta(revenue, prevRevenue),
          trend: trendRevenue, unit: 'currency',
        },
        {
          key: 'investimento', label: 'Investimento Tráfego',
          current: Math.round(investmentProp), target: Math.round(monthly.investimento * proportion),
          percentage: 100,
          display: fmtBRL(investmentProp), targetDisplay: fmtBRL(monthly.investimento * proportion),
          status: 'healthy',
          delta: 0,
          trend: range.buckets.map(() => investmentProp / range.buckets.length), unit: 'currency',
        },
        {
          key: 'cpl', label: 'CPL Médio',
          current: Math.round(cpl), target: monthly.cpl,
          percentage: cpl ? Math.min(100, Math.round((monthly.cpl / cpl) * 100)) : 0,
          display: fmtBRL(cpl), targetDisplay: fmtBRL(monthly.cpl),
          status: statusOf(cpl, monthly.cpl, true),
          delta: 0, trend: trendLeads.map(c => c ? Math.round((investmentProp / range.buckets.length) / c) : 0),
          lowerIsBetter: true, unit: 'currency',
        },
        {
          key: 'cac', label: 'CAC Médio',
          current: Math.round(cac), target: monthly.cac,
          percentage: cac ? Math.min(100, Math.round((monthly.cac / cac) * 100)) : 0,
          display: fmtBRL(cac), targetDisplay: fmtBRL(monthly.cac),
          status: statusOf(cac, monthly.cac, true),
          delta: 0, trend: trendSales.map(c => c ? Math.round((investmentProp / range.buckets.length) / c) : 0),
          lowerIsBetter: true, unit: 'currency',
        },
        {
          key: 'roi', label: 'ROI Líquido',
          current: Math.round(roi * 10) / 10, target: monthly.roi,
          percentage: Math.min(100, Math.round((roi / monthly.roi) * 100)),
          display: `${roi.toFixed(1)}x`, targetDisplay: `${monthly.roi}x`,
          status: statusOf(roi, monthly.roi),
          delta: 0, trend: trendRevenue.map(v => investmentProp ? Math.round((v / (investmentProp / range.buckets.length)) * 10) / 10 : 0),
          unit: 'multiplier',
        },
        {
          key: 'roas', label: 'ROAS Bruto',
          current: Math.round(roas * 10) / 10, target: monthly.roas,
          percentage: Math.min(100, Math.round((roas / monthly.roas) * 100)),
          display: `${roas.toFixed(1)}x`, targetDisplay: `${monthly.roas}x`,
          status: statusOf(roas, monthly.roas),
          delta: 0, trend: trendRevenue.map(v => investmentProp ? Math.round((v / (investmentProp / range.buckets.length)) * 10) / 10 : 0),
          unit: 'multiplier',
        },
      ];

      // Insights
      const insights: string[] = [];
      const m = (k: string) => metrics.find(x => x.key === k)!;
      const projectedRevenue = range.businessDays > 0
        ? Math.round((revenue / range.businessDays) * range.totalBusinessDays)
        : 0;

      if (period === 'mes' && projectedRevenue > 0) {
        if (projectedRevenue >= monthly.faturamento) {
          insights.push(`📈 No ritmo atual, o faturamento projeta ${fmtBRLFull(projectedRevenue)} este mês — acima da meta.`);
        } else {
          insights.push(`⚠️ No ritmo atual, o faturamento projeta apenas ${fmtBRLFull(projectedRevenue)} este mês.`);
        }
      }
      const vendas = m('vendas');
      if (vendas.current < vendas.target) {
        insights.push(`🎯 Faltam ${vendas.target - vendas.current} vendas para atingir a meta do período.`);
      }
      const tComp = m('taxa_comparecimento');
      if (tComp.status !== 'healthy' && tComp.current > 0) {
        insights.push(`👥 Taxa de comparecimento (${tComp.display}) abaixo da meta saudável (${tComp.targetDisplay}).`);
      }
      const tFec = m('taxa_fechamento');
      if (tFec.status === 'healthy' && tFec.current > 0) {
        insights.push(`✅ Taxa de fechamento (${tFec.display}) está saudável.`);
      } else if (tFec.current > 0) {
        insights.push(`🔻 Taxa de fechamento (${tFec.display}) abaixo do ideal (${tFec.targetDisplay}).`);
      }
      const cacM = m('cac');
      if (cacM.status === 'critical') {
        insights.push(`💸 CAC (${cacM.display}) está acima do ideal (${cacM.targetDisplay}).`);
      }
      const cplM = m('cpl');
      if (cplM.status === 'critical') {
        insights.push(`📢 CPL (${cplM.display}) acima da meta (${cplM.targetDisplay}) — revise criativos.`);
      }
      // Gargalo
      const stages = [
        { name: 'Agendamento', metric: m('taxa_agendamento') },
        { name: 'Comparecimento', metric: m('taxa_comparecimento') },
        { name: 'Fechamento', metric: m('taxa_fechamento') },
      ];
      const gargalo = stages.reduce((worst, s) =>
        s.metric.percentage < worst.metric.percentage ? s : worst, stages[0]);
      if (gargalo.metric.current > 0) {
        insights.push(`🔍 Principal gargalo: etapa de ${gargalo.name} (${gargalo.metric.percentage}% da meta).`);
      }

      return {
        period,
        businessDays: range.businessDays,
        totalBusinessDays: range.totalBusinessDays,
        metrics,
        insights,
        projectedRevenue,
      };
    },
    refetchInterval: 60_000,
  });
}
