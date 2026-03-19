import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  lead_id: string;
  agent_id: string;
  payment_method: 'credito' | 'debito' | 'pix' | 'cheque' | 'boleto';
  gross_value: number;
  installments: number;
  fee_percentage: number;
  fee_amount: number;
  net_value: number;
  status: 'pendente' | 'pago' | 'cancelado';
  due_date: string | null;
  paid_at: string | null;
  installment_number: number;
  total_installments: number;
  parent_payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: { name: string; phone: string } | null;
}

export function usePayments(leadId?: string) {
  return useQuery({
    queryKey: ['payments', leadId],
    queryFn: async (): Promise<Payment[]> => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch lead names
      const leadIds = [...new Set((data || []).map(p => p.lead_id))];
      let leadMap: Record<string, { name: string; phone: string }> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, phone')
          .in('id', leadIds);
        if (leads) {
          leadMap = Object.fromEntries(leads.map(l => [l.id, { name: l.name, phone: l.phone }]));
        }
      }

      return (data || []).map(p => ({
        ...p,
        payment_method: p.payment_method as Payment['payment_method'],
        status: p.status as Payment['status'],
        lead: leadMap[p.lead_id] || null,
      }));
    },
  });
}

export function useReceivedRevenue(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['received-revenue', startDate, endDate],
    queryFn: async (): Promise<number> => {
      // Sum net_value of all paid payments in the period
      const { data, error } = await supabase
        .from('payments')
        .select('net_value')
        .eq('status', 'pago')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate);

      if (error) throw error;
      return (data || []).reduce((sum, p) => sum + (p.net_value || 0), 0);
    },
  });
}

export function useCreatePayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      lead_id: string;
      payment_method: Payment['payment_method'];
      gross_value: number;
      installments: number;
      fee_percentage: number;
      fee_amount: number;
      net_value: number;
      boleto_dates?: string[]; // For boleto installments
    }) => {
      if (!user) throw new Error('Não autenticado');

      if (data.payment_method === 'boleto' && data.boleto_dates && data.boleto_dates.length > 0) {
        // Create multiple boleto payments (one per installment)
        const perInstallment = data.gross_value / data.boleto_dates.length;
        const payments = data.boleto_dates.map((date, idx) => ({
          lead_id: data.lead_id,
          agent_id: user.id,
          payment_method: 'boleto',
          gross_value: perInstallment,
          installments: data.boleto_dates!.length,
          fee_percentage: 0,
          fee_amount: 0,
          net_value: perInstallment,
          status: 'pendente',
          due_date: date,
          installment_number: idx + 1,
          total_installments: data.boleto_dates!.length,
        }));

        const { error } = await supabase.from('payments').insert(payments);
        if (error) throw error;
      } else if (data.payment_method === 'credito') {
        // Credit card: single payment, immediately "pago" but with fee deduction
        const { error } = await supabase.from('payments').insert({
          lead_id: data.lead_id,
          agent_id: user.id,
          payment_method: 'credito',
          gross_value: data.gross_value,
          installments: data.installments,
          fee_percentage: data.fee_percentage,
          fee_amount: data.fee_amount,
          net_value: data.net_value,
          status: 'pago',
          paid_at: new Date().toISOString(),
          installment_number: 1,
          total_installments: 1,
        });
        if (error) throw error;
      } else {
        // Pix, Débito, Cheque: immediate full payment
        const { error } = await supabase.from('payments').insert({
          lead_id: data.lead_id,
          agent_id: user.id,
          payment_method: data.payment_method,
          gross_value: data.gross_value,
          installments: 1,
          fee_percentage: 0,
          fee_amount: 0,
          net_value: data.gross_value,
          status: 'pago',
          paid_at: new Date().toISOString(),
          installment_number: 1,
          total_installments: 1,
        });
        if (error) throw error;
      }

      // Update lead treatment_value
      await supabase
        .from('leads')
        .update({ treatment_value: data.gross_value, budget_value: data.gross_value })
        .eq('id', data.lead_id);

      // Log the payment activity
      const { data: leadData } = await supabase
        .from('leads')
        .select('name')
        .eq('id', data.lead_id)
        .maybeSingle();

      await supabase.from('activity_logs').insert({
        lead_id: data.lead_id,
        agent_id: user.id,
        activity_type: 'value_updated',
        title: `Pagamento registrado: ${leadData?.name || 'Lead'}`,
        description: `${data.payment_method.toUpperCase()} - R$ ${data.gross_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${data.payment_method === 'credito' ? ` (${data.installments}x, líquido: R$ ${data.net_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}`,
        new_value: String(data.net_value),
        metadata: { payment_method: data.payment_method, gross_value: data.gross_value, net_value: data.net_value, installments: data.installments },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['received-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao registrar pagamento');
    },
  });
}

export function useConfirmBoletoPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'pago', paid_at: new Date().toISOString() })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['received-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
      toast.success('Boleto dado como pago!');
    },
    onError: () => {
      toast.error('Erro ao confirmar pagamento');
    },
  });
}
