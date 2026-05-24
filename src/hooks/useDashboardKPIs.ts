import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';

export interface KPIValue {
  value: number;
  prev: number;
  change: number; // percentage delta
}

export interface DashboardKPIs {
  leadsRecebidos: KPIValue;
  leadsAtendidos: KPIValue;
  consultasAgendadas: KPIValue;
  taxaComparecimento: KPIValue;
  taxaConversao: KPIValue;
  roi: KPIValue;
  receita: KPIValue;
  investimento: KPIValue;
}

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

async function fetchPeriodData(start: Date, end: Date) {
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const [leadsRes, apptsRes, paymentsRes, costsRes] = await Promise.all([
    supabase.from('leads').select('id, status, first_response_at, created_at, closed_at').gte('created_at', startISO).lte('created_at', endISO),
    supabase.from('appointments').select('id, attended_at, scheduled_at').gte('scheduled_at', startISO).lte('scheduled_at', endISO),
    supabase.from('payments').select('net_value, status, paid_at, lead_id').eq('status', 'pago').gte('paid_at', startISO).lte('paid_at', endISO),
    supabase.from('acquisition_costs').select('amount').gte('reference_month', start.toISOString().split('T')[0]).lte('reference_month', end.toISOString().split('T')[0]),
  ]);

  const leads = leadsRes.data || [];
  const appts = apptsRes.data || [];
  const payments = paymentsRes.data || [];
  const costs = costsRes.data || [];

  const leadsRecebidos = leads.length;
  const leadsAtendidos = leads.filter(l => l.first_response_at || (l.status && l.status !== 'novo_lead')).length;
  const consultasAgendadas = appts.length;
  const compareceram = appts.filter(a => a.attended_at).length;
  const taxaComparecimento = consultasAgendadas > 0 ? Math.round((compareceram / consultasAgendadas) * 100) : 0;

  // Conversão = vendas pagas / compareceram
  const paidLeadIds = new Set(payments.map(p => p.lead_id));
  const vendasRealizadas = paidLeadIds.size;
  const taxaConversao = compareceram > 0 ? Math.round((vendasRealizadas / compareceram) * 100) : 0;

  const receita = payments.reduce((s, p) => s + (p.net_value || 0), 0);
  const investimento = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
  const roi = investimento > 0 ? Math.round(((receita - investimento) / investimento) * 100) : 0;

  return {
    leadsRecebidos,
    leadsAtendidos,
    consultasAgendadas,
    taxaComparecimento,
    taxaConversao,
    receita,
    investimento,
    roi,
  };
}

export function useDashboardKPIs() {
  const { range } = usePeriodFilter();

  return useQuery({
    queryKey: ['dashboard-kpis', range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<DashboardKPIs> => {
      const [curr, prev] = await Promise.all([
        fetchPeriodData(range.start, range.end),
        fetchPeriodData(range.prevStart, range.prevEnd),
      ]);

      const wrap = (k: keyof typeof curr): KPIValue => ({
        value: curr[k],
        prev: prev[k],
        change: calcChange(curr[k], prev[k]),
      });

      return {
        leadsRecebidos: wrap('leadsRecebidos'),
        leadsAtendidos: wrap('leadsAtendidos'),
        consultasAgendadas: wrap('consultasAgendadas'),
        taxaComparecimento: wrap('taxaComparecimento'),
        taxaConversao: wrap('taxaConversao'),
        roi: wrap('roi'),
        receita: wrap('receita'),
        investimento: wrap('investimento'),
      };
    },
    refetchInterval: 60000,
  });
}
