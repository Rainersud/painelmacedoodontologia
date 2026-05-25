import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, differenceInDays } from 'date-fns';

export type PeriodKey = '30' | '60' | '90' | '180' | '365' | 'all';

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  // Inputs
  leadsRecebidos: number;
  contatosRealizados: number;
  agendamentos: number;
  comparecimentos: number;
  vendasRealizadas: number;
  valorTotalVendido: number; // Comercial 1 (initial sales)
  pacientesRecorrentes: number; // distinct leads with >1 purchase in upsell
  receitaRecorrente: number; // Comercial 2 (upsell paid)
  investimentoTrafego: number; // proportional share
  comissaoPaga: number; // estimated (5% default) — placeholder
  custosOperacionais: number; // proportional share
  perdas: number;
  motivosPerda: Record<string, number>;
  // Computed
  taxaAgendamento: number;
  taxaComparecimento: number;
  taxaFechamento: number;
  ticketMedio: number;
  cac: number;
  ltv: number;
  roi: number;
  roas: number;
  receitaPorLead: number;
  receitaPorComparecimento: number;
  receitaTotal: number; // Com1 + Com2
  tempoMedioConversao: number; // days
  totalClientes: number;
}

export interface PerformanceData {
  period: PeriodKey;
  startISO: string;
  endISO: string;
  perAgent: AgentPerformance[];
  com1: AgentPerformance; // aggregated synthetic
  com2: AgentPerformance;
  totalInvestimento: number;
  totalCustosOperacionais: number;
  totalComissao: number;
}

function emptyAgg(id: string, name: string): AgentPerformance {
  return {
    agentId: id, agentName: name,
    leadsRecebidos: 0, contatosRealizados: 0, agendamentos: 0, comparecimentos: 0,
    vendasRealizadas: 0, valorTotalVendido: 0, pacientesRecorrentes: 0, receitaRecorrente: 0,
    investimentoTrafego: 0, comissaoPaga: 0, custosOperacionais: 0, perdas: 0, motivosPerda: {},
    taxaAgendamento: 0, taxaComparecimento: 0, taxaFechamento: 0, ticketMedio: 0,
    cac: 0, ltv: 0, roi: 0, roas: 0, receitaPorLead: 0, receitaPorComparecimento: 0,
    receitaTotal: 0, tempoMedioConversao: 0, totalClientes: 0,
  };
}

function finalize(a: AgentPerformance): AgentPerformance {
  const investTotal = a.investimentoTrafego + a.custosOperacionais + a.comissaoPaga;
  a.receitaTotal = a.valorTotalVendido + a.receitaRecorrente;
  a.taxaAgendamento = a.leadsRecebidos > 0 ? (a.agendamentos / a.leadsRecebidos) * 100 : 0;
  a.taxaComparecimento = a.agendamentos > 0 ? (a.comparecimentos / a.agendamentos) * 100 : 0;
  a.taxaFechamento = a.comparecimentos > 0 ? (a.vendasRealizadas / a.comparecimentos) * 100 : 0;
  a.ticketMedio = a.vendasRealizadas > 0 ? a.valorTotalVendido / a.vendasRealizadas : 0;
  a.cac = a.vendasRealizadas > 0 ? investTotal / a.vendasRealizadas : 0;
  a.totalClientes = a.vendasRealizadas;
  a.ltv = a.totalClientes > 0 ? a.receitaTotal / a.totalClientes : 0;
  a.roi = investTotal > 0 ? ((a.receitaTotal - investTotal) / investTotal) * 100 : 0;
  a.roas = a.investimentoTrafego > 0 ? a.receitaTotal / a.investimentoTrafego : 0;
  a.receitaPorLead = a.leadsRecebidos > 0 ? a.valorTotalVendido / a.leadsRecebidos : 0;
  a.receitaPorComparecimento = a.comparecimentos > 0 ? a.valorTotalVendido / a.comparecimentos : 0;
  return a;
}

export function usePerformanceFinanceiro(period: PeriodKey = '90') {
  return useQuery({
    queryKey: ['performance-financeiro', period],
    queryFn: async (): Promise<PerformanceData> => {
      const end = new Date();
      const start = period === 'all' ? new Date(2000, 0, 1) : subDays(end, Number(period));
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const [leadsRes, apptsRes, paymentsRes, costsRes, upsellRes, profilesRes, interRes] = await Promise.all([
        supabase.from('leads').select('id, assigned_agent_id, status, created_at, closed_at, first_response_at, treatment_value, loss_reason'),
        supabase.from('appointments').select('id, agent_id, scheduled_at, attended_at, lead_id').gte('scheduled_at', startISO).lte('scheduled_at', endISO),
        supabase.from('payments').select('id, agent_id, lead_id, net_value, paid_at, status, upsell_opportunity_id').eq('status', 'pago').gte('paid_at', startISO).lte('paid_at', endISO),
        supabase.from('acquisition_costs').select('amount, category, reference_month').gte('reference_month', startDate).lte('reference_month', endDate),
        supabase.from('upsell_opportunities').select('lead_id, agent_id, closed_value, purchase_count, status'),
        supabase.from('profiles').select('user_id, full_name, is_active'),
        supabase.from('lead_interactions').select('user_id, lead_id, created_at').gte('created_at', startISO).lte('created_at', endISO),
      ]);

      const leads = leadsRes.data || [];
      const appts = apptsRes.data || [];
      const payments = paymentsRes.data || [];
      const costs = costsRes.data || [];
      const upsells = upsellRes.data || [];
      const profiles = profilesRes.data || [];
      const interactions = interRes.data || [];

      const leadsInPeriod = leads.filter(l => l.created_at >= startISO && l.created_at <= endISO);
      const totalInvestimento = costs.filter(c => /tr[áa]fego|ads|m[ií]dia|marketing/i.test(c.category)).reduce((s, c) => s + Number(c.amount || 0), 0);
      const totalCustosOperacionais = costs.filter(c => !/tr[áa]fego|ads|m[ií]dia|marketing/i.test(c.category)).reduce((s, c) => s + Number(c.amount || 0), 0);
      // Estimated commission: 5% of total paid revenue (placeholder, in absence of explicit table)
      const totalPaidAll = payments.reduce((s, p) => s + Number(p.net_value || 0), 0);
      const totalComissao = totalPaidAll * 0.05;

      // Initialize agents
      const agentMap = new Map<string, AgentPerformance>();
      profiles.forEach(p => agentMap.set(p.user_id, emptyAgg(p.user_id, p.full_name || 'Sem nome')));
      const ensure = (id: string | null | undefined) => {
        if (!id) return null;
        if (!agentMap.has(id)) agentMap.set(id, emptyAgg(id, 'Vendedor'));
        return agentMap.get(id)!;
      };

      // Leads recebidos & perdas & conversion time
      const convTimes: Record<string, number[]> = {};
      leadsInPeriod.forEach(l => {
        const a = ensure(l.assigned_agent_id);
        if (!a) return;
        a.leadsRecebidos += 1;
        if (l.loss_reason) {
          a.perdas += 1;
          a.motivosPerda[l.loss_reason] = (a.motivosPerda[l.loss_reason] || 0) + 1;
        }
        if (l.status === 'fechado' && l.closed_at) {
          const d = differenceInDays(new Date(l.closed_at), new Date(l.created_at));
          if (!isNaN(d) && d >= 0) {
            convTimes[l.assigned_agent_id!] = convTimes[l.assigned_agent_id!] || [];
            convTimes[l.assigned_agent_id!].push(d);
          }
        }
      });

      // Contatos: interactions count per agent
      interactions.forEach(i => {
        const a = ensure(i.user_id);
        if (a) a.contatosRealizados += 1;
      });

      // Agendamentos & comparecimentos
      appts.forEach(ap => {
        const a = ensure(ap.agent_id);
        if (!a) return;
        a.agendamentos += 1;
        if (ap.attended_at) a.comparecimentos += 1;
      });

      // Vendas & receita: payments without upsell_opportunity_id => Com1; with => Com2
      const leadAgentMap: Record<string, string> = {};
      leads.forEach(l => { if (l.assigned_agent_id) leadAgentMap[l.id] = l.assigned_agent_id; });
      const closedLeadsByAgent: Record<string, Set<string>> = {};
      payments.forEach(p => {
        const agentId = p.agent_id || leadAgentMap[p.lead_id || ''];
        const a = ensure(agentId);
        if (!a) return;
        const value = Number(p.net_value || 0);
        if (p.upsell_opportunity_id) {
          a.receitaRecorrente += value;
        } else {
          a.valorTotalVendido += value;
          if (p.lead_id) {
            closedLeadsByAgent[a.agentId] = closedLeadsByAgent[a.agentId] || new Set();
            closedLeadsByAgent[a.agentId].add(p.lead_id);
          }
        }
      });
      Object.entries(closedLeadsByAgent).forEach(([aid, set]) => {
        const a = agentMap.get(aid);
        if (a) a.vendasRealizadas = set.size;
      });

      // Pacientes recorrentes
      const recurringByAgent: Record<string, Set<string>> = {};
      upsells.forEach(u => {
        if ((u.purchase_count || 1) > 1) {
          const aid = u.agent_id || leadAgentMap[u.lead_id];
          if (aid) {
            recurringByAgent[aid] = recurringByAgent[aid] || new Set();
            recurringByAgent[aid].add(u.lead_id);
          }
        }
      });
      Object.entries(recurringByAgent).forEach(([aid, set]) => {
        const a = agentMap.get(aid);
        if (a) a.pacientesRecorrentes = set.size;
      });

      // Conversion time avg
      Object.entries(convTimes).forEach(([aid, arr]) => {
        const a = agentMap.get(aid);
        if (a && arr.length) a.tempoMedioConversao = arr.reduce((x, y) => x + y, 0) / arr.length;
      });

      // Distribute investments/costs/commission proportionally by vendasRealizadas
      const totalVendas = Array.from(agentMap.values()).reduce((s, a) => s + a.vendasRealizadas, 0);
      agentMap.forEach(a => {
        const share = totalVendas > 0 ? a.vendasRealizadas / totalVendas : 0;
        a.investimentoTrafego = totalInvestimento * share;
        a.custosOperacionais = totalCustosOperacionais * share;
        a.comissaoPaga = totalComissao * share;
      });

      // Finalize per-agent
      const perAgent = Array.from(agentMap.values())
        .filter(a => a.leadsRecebidos > 0 || a.vendasRealizadas > 0 || a.receitaRecorrente > 0 || a.agendamentos > 0)
        .map(finalize)
        .sort((a, b) => b.receitaTotal - a.receitaTotal);

      // Aggregate Com1 / Com2 (synthetic)
      const com1 = emptyAgg('com1', 'Comercial 1 (Aquisição)');
      const com2 = emptyAgg('com2', 'Comercial 2 (LTV / Pós-venda)');
      perAgent.forEach(a => {
        com1.leadsRecebidos += a.leadsRecebidos;
        com1.contatosRealizados += a.contatosRealizados;
        com1.agendamentos += a.agendamentos;
        com1.comparecimentos += a.comparecimentos;
        com1.vendasRealizadas += a.vendasRealizadas;
        com1.valorTotalVendido += a.valorTotalVendido;
        com1.perdas += a.perdas;
        Object.entries(a.motivosPerda).forEach(([k, v]) => { com1.motivosPerda[k] = (com1.motivosPerda[k] || 0) + v; });
      });
      // Com2 derived from upsells
      upsells.forEach(u => {
        if ((u.purchase_count || 1) > 1) {
          com2.vendasRealizadas += 1;
          com2.valorTotalVendido += Number(u.closed_value || 0);
        }
      });
      com2.receitaRecorrente = perAgent.reduce((s, a) => s + a.receitaRecorrente, 0);
      // Investments
      com1.investimentoTrafego = totalInvestimento;
      com1.custosOperacionais = totalCustosOperacionais;
      com1.comissaoPaga = totalComissao * 0.7;
      com2.comissaoPaga = totalComissao * 0.3;
      finalize(com1);
      finalize(com2);

      return {
        period, startISO, endISO, perAgent, com1, com2,
        totalInvestimento, totalCustosOperacionais, totalComissao,
      };
    },
    refetchInterval: 60000,
  });
}
