import { useQuery } from '@tanstack/react-query';
import { allPages } from '@/lib/paging';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface LTVFinancialData {
  totalRecebido: number;        // LTV payments paid
  totalPendente: number;        // LTV payments pending
  receitaRecorrente: number;    // LTV revenue (last 30d paid)
  receitaLiquida: number;       // totalRecebido (net)
  receitaPorPaciente: number;   // avg per patient (LTV/patient)
  receitaMesAtual: number;      // LTV paid this month
  ticketAcumulado: number;      // sum of LTV transactions
  ltvAtual: number;             // total LTV (paid)
  projecaoFutura: number;       // sum LTV pending
  totalPacientesLTV: number;    // distinct paying patients (LTV)
  crescimentoPct: number;       // current month vs previous month %
  health: 'success' | 'warning' | 'destructive';
  receitaPorVendedor: Array<{ agentId: string; agentName: string; total: number; pacientes: number }>;
  evolucaoMensal: Array<{ month: string; label: string; ltv: number; recebido: number; pendente: number }>;
}

export function useLTVFinancial() {
  return useQuery({
    queryKey: ['ltv-financial-panel'],
    queryFn: async (): Promise<LTVFinancialData> => {
      // 1. All LTV payments (with upsell_opportunity_id)
      const { data: ltvPays } = await allPages(supabase
        .from('payments')
        .select('id, net_value, gross_value, status, paid_at, due_date, created_at, lead_id, agent_id, upsell_opportunity_id')
        .not('upsell_opportunity_id', 'is', null)
        .order('id'));

      const all = ltvPays || [];
      const paid = all.filter(p => p.status === 'pago');
      const pending = all.filter(p => p.status === 'pendente');

      const totalRecebido = paid.reduce((s, p) => s + Number(p.net_value || 0), 0);
      const totalPendente = pending.reduce((s, p) => s + Number(p.net_value || 0), 0);
      const ticketAcumulado = paid.reduce((s, p) => s + Number(p.gross_value || 0), 0);

      // last 30 days
      const now = new Date();
      const d30 = subMonths(now, 1);
      const receitaRecorrente = paid
        .filter(p => p.paid_at && new Date(p.paid_at) >= d30)
        .reduce((s, p) => s + Number(p.net_value || 0), 0);

      // current month + previous month
      const monthStart = startOfMonth(now);
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const receitaMesAtual = paid
        .filter(p => p.paid_at && new Date(p.paid_at) >= monthStart)
        .reduce((s, p) => s + Number(p.net_value || 0), 0);
      const receitaMesAnterior = paid
        .filter(p => p.paid_at && new Date(p.paid_at) >= prevMonthStart && new Date(p.paid_at) < monthStart)
        .reduce((s, p) => s + Number(p.net_value || 0), 0);

      const crescimentoPct = receitaMesAnterior > 0
        ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100
        : (receitaMesAtual > 0 ? 100 : 0);

      // distinct patients with paid LTV
      const pacientesSet = new Set(paid.map(p => p.lead_id));
      const totalPacientesLTV = pacientesSet.size;
      const receitaPorPaciente = totalPacientesLTV > 0 ? totalRecebido / totalPacientesLTV : 0;

      // revenue per seller
      const agentMap: Record<string, { total: number; pacientes: Set<string> }> = {};
      paid.forEach(p => {
        if (!p.agent_id) return;
        if (!agentMap[p.agent_id]) agentMap[p.agent_id] = { total: 0, pacientes: new Set() };
        agentMap[p.agent_id].total += Number(p.net_value || 0);
        agentMap[p.agent_id].pacientes.add(p.lead_id);
      });
      const agentIds = Object.keys(agentMap);
      let profiles: Array<{ user_id: string; full_name: string }> = [];
      if (agentIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds);
        profiles = data || [];
      }
      const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
      const receitaPorVendedor = agentIds.map(id => ({
        agentId: id,
        agentName: profileMap[id] || 'Vendedor',
        total: agentMap[id].total,
        pacientes: agentMap[id].pacientes.size,
      })).sort((a, b) => b.total - a.total);

      // monthly evolution (last 6 months)
      const monthlyMap: Record<string, { month: string; label: string; ltv: number; recebido: number; pendente: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const key = format(d, 'yyyy-MM');
        monthlyMap[key] = { month: key, label: format(d, 'MMM/yy', { locale: ptBR }), ltv: 0, recebido: 0, pendente: 0 };
      }
      paid.forEach(p => {
        const d = p.paid_at || p.created_at;
        if (!d) return;
        const key = d.substring(0, 7);
        if (monthlyMap[key]) {
          monthlyMap[key].recebido += Number(p.net_value || 0);
          monthlyMap[key].ltv += Number(p.net_value || 0);
        }
      });
      pending.forEach(p => {
        const d = p.due_date || p.created_at;
        if (!d) return;
        const key = d.substring(0, 7);
        if (monthlyMap[key]) {
          monthlyMap[key].pendente += Number(p.net_value || 0);
        }
      });
      const evolucaoMensal = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

      // health
      let health: 'success' | 'warning' | 'destructive' = 'warning';
      if (crescimentoPct >= 5 && receitaRecorrente > 0) health = 'success';
      else if (crescimentoPct < -10 || (receitaMesAtual === 0 && receitaMesAnterior > 0)) health = 'destructive';

      return {
        totalRecebido,
        totalPendente,
        receitaRecorrente,
        receitaLiquida: totalRecebido,
        receitaPorPaciente,
        receitaMesAtual,
        ticketAcumulado,
        ltvAtual: totalRecebido,
        projecaoFutura: totalPendente,
        totalPacientesLTV,
        crescimentoPct,
        health,
        receitaPorVendedor,
        evolucaoMensal,
      };
    },
  });
}
