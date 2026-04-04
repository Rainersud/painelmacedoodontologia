import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface AdCreative {
  id: string;
  name: string;
  link_url: string | null;
  platform: string;
  investment: number;
  clicks: number;
  leads_generated: number;
  appointments: number;
  attendance: number;
  sales: number;
  revenue: number;
  reference_month: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreativeMetrics {
  cpc: number;
  cpl: number;
  costPerAppointment: number;
  costPerAttendance: number;
  cac: number;
  roi: number;
  convClickToLead: number;
  convLeadToAppointment: number;
  convAppointmentToAttendance: number;
  convAttendanceToSale: number;
  convTotal: number;
  profit: number;
  isProfitable: boolean;
}

export function calculateCreativeMetrics(c: AdCreative): CreativeMetrics {
  const inv = Number(c.investment) || 0;
  const clicks = c.clicks || 0;
  const leads = c.leads_generated || 0;
  const appts = c.appointments || 0;
  const attend = c.attendance || 0;
  const sales = c.sales || 0;
  const rev = Number(c.revenue) || 0;

  return {
    cpc: clicks > 0 ? inv / clicks : 0,
    cpl: leads > 0 ? inv / leads : 0,
    costPerAppointment: appts > 0 ? inv / appts : 0,
    costPerAttendance: attend > 0 ? inv / attend : 0,
    cac: sales > 0 ? inv / sales : 0,
    roi: inv > 0 ? ((rev - inv) / inv) * 100 : 0,
    convClickToLead: clicks > 0 ? (leads / clicks) * 100 : 0,
    convLeadToAppointment: leads > 0 ? (appts / leads) * 100 : 0,
    convAppointmentToAttendance: appts > 0 ? (attend / appts) * 100 : 0,
    convAttendanceToSale: attend > 0 ? (sales / attend) * 100 : 0,
    convTotal: clicks > 0 ? (sales / clicks) * 100 : 0,
    profit: rev - inv,
    isProfitable: rev > inv,
  };
}

export function useAdCreatives(referenceMonth?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const month = referenceMonth || new Date();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const query = useQuery({
    queryKey: ['ad-creatives', monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_creatives' as any)
        .select('*')
        .gte('reference_month', monthStart.toISOString().split('T')[0])
        .lte('reference_month', monthEnd.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AdCreative[];
    },
  });

  const addCreative = useMutation({
    mutationFn: async (creative: Partial<AdCreative>) => {
      const { error } = await supabase
        .from('ad_creatives' as any)
        .insert({ ...creative, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      toast.success('Criativo adicionado');
    },
    onError: () => toast.error('Erro ao adicionar criativo'),
  });

  const updateCreative = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdCreative> & { id: string }) => {
      const { error } = await supabase
        .from('ad_creatives' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      toast.success('Criativo atualizado');
    },
    onError: () => toast.error('Erro ao atualizar criativo'),
  });

  const deleteCreative = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_creatives' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      toast.success('Criativo removido');
    },
    onError: () => toast.error('Erro ao remover criativo'),
  });

  const creatives = query.data || [];

  // Consolidated metrics
  const consolidated = {
    totalInvestment: creatives.reduce((s, c) => s + Number(c.investment), 0),
    totalClicks: creatives.reduce((s, c) => s + c.clicks, 0),
    totalLeads: creatives.reduce((s, c) => s + c.leads_generated, 0),
    totalAppointments: creatives.reduce((s, c) => s + c.appointments, 0),
    totalAttendance: creatives.reduce((s, c) => s + c.attendance, 0),
    totalSales: creatives.reduce((s, c) => s + c.sales, 0),
    totalRevenue: creatives.reduce((s, c) => s + Number(c.revenue), 0),
  };

  const bestCreative = creatives.length > 0
    ? creatives.reduce((best, c) => (Number(c.revenue) - Number(c.investment)) > (Number(best.revenue) - Number(best.investment)) ? c : best)
    : null;

  const worstCreative = creatives.length > 0
    ? creatives.reduce((worst, c) => (Number(c.revenue) - Number(c.investment)) < (Number(worst.revenue) - Number(worst.investment)) ? c : worst)
    : null;

  return {
    creatives,
    consolidated,
    bestCreative,
    worstCreative,
    isLoading: query.isLoading,
    addCreative,
    updateCreative,
    deleteCreative,
  };
}
