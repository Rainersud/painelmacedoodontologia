import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface PendingInstallment {
  id: string;
  lead_id: string;
  gross_value: number;
  net_value: number;
  due_date: string | null;
  installment_number: number;
  total_installments: number;
  payment_method: string;
  upsell_opportunity_id: string | null;
  lead_name?: string;
}

export interface MonthlyProjection {
  month: string; // 'YYYY-MM'
  label: string; // 'Mai/26'
  total: number;
  count: number;
}

export function useRevenueProjection() {
  return useQuery({
    queryKey: ['revenue-projection'],
    queryFn: async () => {
      // Fetch all pending (unpaid) installments
      const { data, error } = await supabase
        .from('payments')
        .select('id, lead_id, gross_value, net_value, due_date, installment_number, total_installments, payment_method, upsell_opportunity_id')
        .eq('status', 'pendente')
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Get lead names
      const leadIds = [...new Set((data || []).map(p => p.lead_id))];
      let leadMap: Record<string, string> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds);
        if (leads) {
          leadMap = Object.fromEntries(leads.map(l => [l.id, l.name]));
        }
      }

      const installments: PendingInstallment[] = (data || []).map(p => ({
        ...p,
        lead_name: leadMap[p.lead_id] || 'Desconhecido',
      }));

      // Group by month
      const now = new Date();
      const monthlyMap: Record<string, MonthlyProjection> = {};

      // Pre-create next 12 months
      for (let i = 0; i < 12; i++) {
        const d = addMonths(now, i);
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMM/yy', { locale: ptBR });
        monthlyMap[key] = { month: key, label, total: 0, count: 0 };
      }

      // Assign installments to months
      const noDateKey = 'sem-data';
      let noDateTotal = 0;
      let noDateCount = 0;

      installments.forEach(inst => {
        if (inst.due_date) {
          const key = inst.due_date.substring(0, 7); // 'YYYY-MM'
          if (monthlyMap[key]) {
            monthlyMap[key].total += inst.net_value;
            monthlyMap[key].count += 1;
          } else {
            // Future month beyond 12
            const label = format(new Date(inst.due_date), 'MMM/yy', { locale: ptBR });
            monthlyMap[key] = { month: key, label, total: inst.net_value, count: 1 };
          }
        } else {
          noDateTotal += inst.net_value;
          noDateCount += 1;
        }
      });

      const monthlyProjections = Object.values(monthlyMap)
        .filter(m => m.total > 0)
        .sort((a, b) => a.month.localeCompare(b.month));

      const totalFuturo = installments.reduce((sum, i) => sum + i.net_value, 0);
      const totalCount = installments.length;

      // Period calculations
      const next30 = installments.filter(i => {
        if (!i.due_date) return false;
        const d = new Date(i.due_date);
        const limit = addMonths(now, 1);
        return d >= now && d <= limit;
      }).reduce((sum, i) => sum + i.net_value, 0);

      const next60 = installments.filter(i => {
        if (!i.due_date) return false;
        const d = new Date(i.due_date);
        const limit = addMonths(now, 2);
        return d >= now && d <= limit;
      }).reduce((sum, i) => sum + i.net_value, 0);

      const next90 = installments.filter(i => {
        if (!i.due_date) return false;
        const d = new Date(i.due_date);
        const limit = addMonths(now, 3);
        return d >= now && d <= limit;
      }).reduce((sum, i) => sum + i.net_value, 0);

      // Concentration alert: check if any month has >40% of total
      const concentrationAlert = monthlyProjections.find(
        m => totalFuturo > 0 && (m.total / totalFuturo) > 0.4
      );

      return {
        installments,
        monthlyProjections,
        totalFuturo,
        totalCount,
        next30,
        next60,
        next90,
        noDateTotal,
        noDateCount,
        concentrationAlert: concentrationAlert ? concentrationAlert.label : null,
      };
    },
  });
}

// CAC data: first purchases (payments without upsell_opportunity_id)
export function useCACMonthly() {
  return useQuery({
    queryKey: ['cac-monthly-chart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('net_value, paid_at, created_at')
        .eq('status', 'pago')
        .is('upsell_opportunity_id', null)
        .order('paid_at', { ascending: true });

      if (error) throw error;

      const monthlyMap: Record<string, { month: string; label: string; total: number }> = {};

      (data || []).forEach(p => {
        const dateStr = p.paid_at || p.created_at;
        const key = dateStr.substring(0, 7);
        if (!monthlyMap[key]) {
          const label = format(new Date(dateStr), 'MMM/yy', { locale: ptBR });
          monthlyMap[key] = { month: key, label, total: 0 };
        }
        monthlyMap[key].total += p.net_value;
      });

      return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    },
  });
}

// Total received revenue (all paid payments) — same source as Dashboard "Receita"
export function useTotalReceivedRevenue() {
  return useQuery({
    queryKey: ['total-received-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('net_value')
        .eq('status', 'pago');
      if (error) throw error;
      return (data || []).reduce((sum, p) => sum + Number(p.net_value || 0), 0);
    },
  });
}

// Global CAC — total acquisition costs divided by count of Comercial 1 closings (fechado leads)
export function useGlobalCAC() {
  return useQuery({
    queryKey: ['global-cac'],
    queryFn: async () => {
      const [{ data: costs }, { count: closedCount }] = await Promise.all([
        supabase.from('acquisition_costs').select('amount'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'fechado'),
      ]);
      const totalCosts = (costs || []).reduce((sum, c: any) => sum + Number(c.amount || 0), 0);
      const sales = closedCount || 0;
      return {
        cac: sales > 0 ? totalCosts / sales : 0,
        totalCosts,
        salesCount: sales,
      };
    },
  });
}

// LTV data: upsell payments (with upsell_opportunity_id)
export function useLTVMonthly() {
  return useQuery({
    queryKey: ['ltv-monthly-chart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('gross_value, paid_at, created_at')
        .eq('status', 'pago')
        .not('upsell_opportunity_id', 'is', null)
        .order('paid_at', { ascending: true });

      if (error) throw error;

      const monthlyMap: Record<string, { month: string; label: string; total: number }> = {};

      (data || []).forEach(p => {
        const dateStr = p.paid_at || p.created_at;
        const key = dateStr.substring(0, 7);
        if (!monthlyMap[key]) {
          const label = format(new Date(dateStr), 'MMM/yy', { locale: ptBR });
          monthlyMap[key] = { month: key, label, total: 0 };
        }
        monthlyMap[key].total += p.gross_value;
      });

      return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    },
  });
}
