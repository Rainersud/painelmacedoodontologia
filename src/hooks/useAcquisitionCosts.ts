import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface AcquisitionCost {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  reference_month: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const COST_CATEGORIES = [
  { value: 'anuncios', label: 'Anúncios (Meta/Google Ads)' },
  { value: 'salarios_vendas', label: 'Salários Equipe de Vendas' },
  { value: 'comissoes', label: 'Comissões de Vendedores' },
  { value: 'ferramentas', label: 'Ferramentas de Marketing (CRM, etc.)' },
  { value: 'marketing_geral', label: 'Custos Gerais de Marketing' },
  { value: 'salarios_operacional', label: 'Salários Equipe Operacional' },
  { value: 'outros', label: 'Outros Custos' },
] as const;

export function useAcquisitionCosts(referenceMonth?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const month = referenceMonth || new Date();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const costsQuery = useQuery({
    queryKey: ['acquisition-costs', monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acquisition_costs' as any)
        .select('*')
        .gte('reference_month', monthStart.toISOString().split('T')[0])
        .lte('reference_month', monthEnd.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AcquisitionCost[];
    },
  });

  const addCost = useMutation({
    mutationFn: async (cost: { category: string; description?: string; amount: number; reference_month: string }) => {
      const { error } = await supabase
        .from('acquisition_costs' as any)
        .insert({ ...cost, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-costs'] });
      toast.success('Despesa adicionada');
    },
    onError: () => toast.error('Erro ao adicionar despesa'),
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; category?: string; description?: string; amount?: number }) => {
      const { error } = await supabase
        .from('acquisition_costs' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-costs'] });
      toast.success('Despesa atualizada');
    },
    onError: () => toast.error('Erro ao atualizar despesa'),
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('acquisition_costs' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-costs'] });
      toast.success('Despesa removida');
    },
    onError: () => toast.error('Erro ao remover despesa'),
  });

  // Calculate totals by category
  const costs = costsQuery.data || [];
  const totalByCategory = COST_CATEGORIES.map(cat => ({
    ...cat,
    total: costs.filter(c => c.category === cat.value).reduce((sum, c) => sum + Number(c.amount), 0),
  }));
  const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);

  return {
    costs,
    totalByCategory,
    totalCosts,
    isLoading: costsQuery.isLoading,
    addCost,
    updateCost,
    deleteCost,
  };
}

export function useCACMetrics(referenceMonth?: Date) {
  const month = referenceMonth || new Date();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  return useQuery({
    queryKey: ['cac-metrics', monthStart.toISOString()],
    queryFn: async () => {
      // Total acquisition costs
      const { data: costsData } = await supabase
        .from('acquisition_costs' as any)
        .select('amount, category')
        .gte('reference_month', monthStart.toISOString().split('T')[0])
        .lte('reference_month', monthEnd.toISOString().split('T')[0]);

      const costs = (costsData || []) as unknown as { amount: number; category: string }[];
      const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);

      // Cost distribution
      const distribution: Record<string, number> = {};
      costs.forEach(c => {
        distribution[c.category] = (distribution[c.category] || 0) + Number(c.amount);
      });

      // Clients acquired (closed leads in period)
      const { count: clientsAcquired } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'fechado')
        .gte('closed_at', monthStart.toISOString())
        .lte('closed_at', monthEnd.toISOString());

      // Revenue from payments
      const { data: paidPayments } = await supabase
        .from('payments')
        .select('net_value')
        .eq('status', 'pago')
        .gte('paid_at', monthStart.toISOString())
        .lte('paid_at', monthEnd.toISOString());

      const totalRevenue = (paidPayments || []).reduce((sum, p) => sum + (p.net_value || 0), 0);
      const salesCount = clientsAcquired || 0;

      // Total leads in period
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const cac = salesCount > 0 ? totalCosts / salesCount : 0;
      const ticketMedio = salesCount > 0 ? totalRevenue / salesCount : 0;
      const lucroPorVenda = ticketMedio - cac;
      const isProfitable = ticketMedio > cac;
      const conversionRate = (totalLeads || 0) > 0 ? (salesCount / (totalLeads || 1)) * 100 : 0;

      return {
        cac,
        ticketMedio,
        lucroPorVenda,
        isProfitable,
        totalCosts,
        totalRevenue,
        salesCount,
        totalLeads: totalLeads || 0,
        conversionRate,
        distribution,
      };
    },
  });
}
