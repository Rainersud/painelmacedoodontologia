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

      // Tempo de resposta (minutos) — média entre created_at e first_response_at
      const responded = (leads as any[]).filter(l => l.first_response_at);
      const responseTimes = responded.map(l =>
        (new Date(l.first_response_at).getTime() - new Date(l.created_at).getTime()) / 60000
      ).filter(v => v >= 0 && Number.isFinite(v));
      const avgResponseMin = responseTimes.length
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
      const trendResponse = range.buckets.map(b => {
        const inB = responded.filter((l: any) => inBucket(l.first_response_at, b));
        if (!inB.length) return 0;
        const sum = inB.reduce((acc: number, l: any) =>
          acc + (new Date(l.first_response_at).getTime() - new Date(l.created_at).getTime()) / 60000, 0);
        return Math.round(sum / inB.length);
      });
      const fmtDuration = (m: number) => {
        if (m < 1) return `${Math.round(m * 60)}s`;
        if (m < 60) return `${m.toFixed(1)} min`;
        const h = Math.floor(m / 60);
        return `${h}h ${Math.round(m - h * 60)}m`;
      };

      const rateStatus = (cur: number, target: number): PanelMetric['status'] => statusOf(cur, target);

      const metrics: PanelMetric[] = [
        {
          key: 'leads', label: 'Novos Leads',
          current: leadsCount, target: prop(monthly.leads),
          percentage: Math.min(100, Math.round((leadsCount / prop(monthly.leads)) * 100)),
          display: String(leadsCount), targetDisplay: String(prop(monthly.leads)),
          healthyGoal: `${monthly.leads}/mês`,
          status: statusOf(leadsCount, prop(monthly.leads)),
          delta: delta(leadsCount, prevLeads),
          trend: trendLeads, unit: 'count',
        },
        {
          key: 'agendamentos', label: 'Agendamentos',
          current: agendCount, target: prop(monthly.agendamentos),
          percentage: Math.min(100, Math.round((agendCount / prop(monthly.agendamentos)) * 100)),
          display: `${agendCount} agendamentos`, targetDisplay: String(prop(monthly.agendamentos)),
          healthyGoal: `${monthly.taxaAgendamento}%`,
          status: statusOf(agendCount, prop(monthly.agendamentos)),
          delta: 0, trend: trendAgend, unit: 'count',
          rate: {
            label: 'Taxa de Agendamento',
            display: `${taxaAgendamento.toFixed(1)}%`,
            targetDisplay: `${monthly.taxaAgendamento}%`,
            status: rateStatus(taxaAgendamento, monthly.taxaAgendamento),
          },
        },
        {
          key: 'comparecimentos', label: 'Comparecimentos',
          current: compCount, target: prop(monthly.comparecimentos),
          percentage: Math.min(100, Math.round((compCount / prop(monthly.comparecimentos)) * 100)),
          display: `${compCount} pacientes`, targetDisplay: String(prop(monthly.comparecimentos)),
          healthyGoal: `${monthly.taxaComparecimento}%`,
          status: statusOf(compCount, prop(monthly.comparecimentos)),
          delta: 0, trend: trendComp, unit: 'count',
          rate: {
            label: 'Taxa de Comparecimento',
            display: `${taxaComparecimento.toFixed(1)}%`,
            targetDisplay: `${monthly.taxaComparecimento}%`,
            status: rateStatus(taxaComparecimento, monthly.taxaComparecimento),
          },
        },
        {
          key: 'vendas', label: 'Vendas Realizadas',
          current: salesCount, target: prop(monthly.vendas),
          percentage: Math.min(100, Math.round((salesCount / prop(monthly.vendas)) * 100)),
          display: `${salesCount} vendas`, targetDisplay: String(prop(monthly.vendas)),
          healthyGoal: `${monthly.taxaFechamento}%`,
          status: statusOf(salesCount, prop(monthly.vendas)),
          delta: delta(salesCount, prevSales),
          trend: trendSales, unit: 'count',
          rate: {
            label: 'Taxa de Fechamento',
            display: `${taxaFechamento.toFixed(1)}%`,
            targetDisplay: `${monthly.taxaFechamento}%`,
            status: rateStatus(taxaFechamento, monthly.taxaFechamento),
          },
        },
        {
          key: 'ticket_medio', label: 'Ticket Médio',
          current: Math.round(ticketMedio), target: monthly.ticket,
          percentage: Math.min(100, Math.round((ticketMedio / monthly.ticket) * 100)),
          display: fmtBRL(ticketMedio), targetDisplay: fmtBRL(monthly.ticket),
          healthyGoal: fmtBRL(monthly.ticket),
          status: statusOf(ticketMedio, monthly.ticket),
          delta: 0, trend: trendSales.map((c, i) => c ? Math.round(trendRevenue[i] / c) : 0), unit: 'currency',
        },
        {
          key: 'faturamento', label: 'Faturamento',
          current: Math.round(revenue), target: Math.round(monthly.faturamento * proportion),
          percentage: Math.min(100, Math.round((revenue / (monthly.faturamento * proportion)) * 100)),
          display: fmtBRL(revenue), targetDisplay: fmtBRL(monthly.faturamento * proportion),
          healthyGoal: fmtBRL(monthly.faturamento * proportion) + (period === 'hoje' ? '/dia' : period === 'semana' ? '/semana' : '/mês'),
          status: statusOf(revenue, monthly.faturamento * proportion),
          delta: delta(revenue, prevRevenue),
          trend: trendRevenue, unit: 'currency',
        },
        {
          key: 'tempo_resposta', label: 'Tempo de Resposta',
          current: Math.round(avgResponseMin * 10) / 10, target: 5,
          percentage: avgResponseMin ? Math.min(100, Math.round((5 / avgResponseMin) * 100)) : 100,
          display: avgResponseMin > 0 ? fmtDuration(avgResponseMin) : '—',
          targetDisplay: 'até 5 min',
          healthyGoal: 'até 5 minutos',
          status: avgResponseMin === 0 ? 'warning' : statusOf(avgResponseMin, 5, true),
          delta: 0, trend: trendResponse,
          lowerIsBetter: true, unit: 'duration',
        },
        {
          key: 'cpl', label: 'CPL Médio',
          current: Math.round(cpl), target: monthly.cpl,
          percentage: cpl ? Math.min(100, Math.round((monthly.cpl / cpl) * 100)) : 0,
          display: fmtBRL(cpl), targetDisplay: fmtBRL(monthly.cpl),
          healthyGoal: fmtBRL(monthly.cpl),
          status: statusOf(cpl, monthly.cpl, true),
          delta: 0, trend: trendLeads.map(c => c ? Math.round((investmentProp / range.buckets.length) / c) : 0),
          lowerIsBetter: true, unit: 'currency',
        },
        {
          key: 'cac', label: 'CAC Médio',
          current: Math.round(cac), target: monthly.cac,
          percentage: cac ? Math.min(100, Math.round((monthly.cac / cac) * 100)) : 0,
          display: fmtBRL(cac), targetDisplay: fmtBRL(monthly.cac),
          healthyGoal: fmtBRL(monthly.cac),
          status: statusOf(cac, monthly.cac, true),
          delta: 0, trend: trendSales.map(c => c ? Math.round((investmentProp / range.buckets.length) / c) : 0),
          lowerIsBetter: true, unit: 'currency',
        },
        {
          key: 'roas', label: 'ROAS Bruto',
          current: Math.round(roas * 10) / 10, target: monthly.roas,
          percentage: Math.min(100, Math.round((roas / monthly.roas) * 100)),
          display: `${roas.toFixed(1)}x`, targetDisplay: `${monthly.roas}x`,
          healthyGoal: `${monthly.roas}x`,
          status: statusOf(roas, monthly.roas),
          delta: 0, trend: trendRevenue.map(v => investmentProp ? Math.round((v / (investmentProp / range.buckets.length)) * 10) / 10 : 0),
          unit: 'multiplier',
        },
        {
          key: 'roi', label: 'ROI Líquido',
          current: Math.round(roi * 10) / 10, target: monthly.roi,
          percentage: Math.min(100, Math.round((roi / monthly.roi) * 100)),
          display: `${roi.toFixed(1)}x`, targetDisplay: `${monthly.roi}x`,
          healthyGoal: `${monthly.roi}x`,
          status: statusOf(roi, monthly.roi),
          delta: 0, trend: trendRevenue.map(v => investmentProp ? Math.round((v / (investmentProp / range.buckets.length)) * 10) / 10 : 0),
          unit: 'multiplier',
        },
        {
          key: 'investimento', label: 'Investimento Tráfego',
          current: Math.round(investmentProp), target: Math.round(monthly.investimento * proportion),
          percentage: 100,
          display: fmtBRL(investmentProp), targetDisplay: fmtBRL(monthly.investimento * proportion),
          healthyGoal: fmtBRL(monthly.investimento) + '/mês',
          status: 'healthy',
          delta: 0,
          trend: range.buckets.map(() => investmentProp / range.buckets.length), unit: 'currency',
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
      const compM = m('comparecimentos');
      if (compM.rate && compM.rate.status !== 'healthy' && compM.current > 0) {
        insights.push(`👥 Taxa de comparecimento (${compM.rate.display}) abaixo da meta saudável (${compM.rate.targetDisplay}).`);
      }
      const vendasM = m('vendas');
      if (vendasM.rate) {
        if (vendasM.rate.status === 'healthy' && vendasM.current > 0) {
          insights.push(`✅ Taxa de fechamento (${vendasM.rate.display}) está saudável.`);
        } else if (vendasM.current > 0) {
          insights.push(`🔻 Taxa de fechamento (${vendasM.rate.display}) abaixo do ideal (${vendasM.rate.targetDisplay}).`);
        }
      }
      const cacM = m('cac');
      if (cacM.status === 'critical') {
        insights.push(`💸 CAC (${cacM.display}) está acima do ideal (${cacM.targetDisplay}).`);
      }
      const cplM = m('cpl');
      if (cplM.status === 'critical') {
        insights.push(`📢 CPL (${cplM.display}) acima da meta (${cplM.targetDisplay}) — revise criativos.`);
      }
      const trespM = m('tempo_resposta');
      if (trespM.current > 5) {
        insights.push(`⏱️ Tempo de resposta (${trespM.display}) acima do ideal (${trespM.targetDisplay}).`);
      }
      // Gargalo (usa as taxas embutidas)
      const stageMetrics = [
        { name: 'Agendamento', m: m('agendamentos') },
        { name: 'Comparecimento', m: m('comparecimentos') },
        { name: 'Fechamento', m: m('vendas') },
      ];
      const gargalo = stageMetrics.reduce((worst, s) =>
        s.m.percentage < worst.m.percentage ? s : worst, stageMetrics[0]);
      if (gargalo.m.current > 0) {
        insights.push(`🔍 Principal gargalo: etapa de ${gargalo.name} (${gargalo.m.percentage}% da meta).`);
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
