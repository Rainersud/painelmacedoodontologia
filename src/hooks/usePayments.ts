import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { describeError } from '@/lib/errors';
import { refreshBusinessData } from '@/lib/refresh';
import { isSoldStatus } from '@/lib/metrics/stages';
import { recordStageTransition } from './useStageHistory';

export interface Payment {
  id: string;
  lead_id: string;
  agent_id: string;
  payment_method: 'credito' | 'debito' | 'pix' | 'cheque' | 'boleto' | 'dinheiro';
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
  upsell_opportunity_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: { name: string; phone: string } | null;
}

export function usePayments(leadId?: string, upsellOpportunityId?: string) {
  return useQuery({
    queryKey: ['payments', leadId, upsellOpportunityId],
    queryFn: async (): Promise<Payment[]> => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      if (upsellOpportunityId) {
        query = query.eq('upsell_opportunity_id', upsellOpportunityId);
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
      boleto_dates?: string[];
      upsell_opportunity_id?: string;
    }) => {
      

      if (data.payment_method === 'boleto' && data.boleto_dates && data.boleto_dates.length > 0) {
        // Create multiple boleto payments (one per installment)
        // Parcelas em centavos exatos: a última leva a diferença do arredondamento
        const n = data.boleto_dates.length;
        const totalCents = Math.round(data.gross_value * 100);
        const baseCents = Math.floor(totalCents / n);
        const payments = data.boleto_dates.map((date, idx) => {
          const cents = idx === n - 1 ? totalCents - baseCents * (n - 1) : baseCents;
          const value = cents / 100;
          return {
          lead_id: data.lead_id,
          agent_id: user?.id ?? null,
          payment_method: 'boleto',
          gross_value: value,
          installments: n,
          fee_percentage: 0,
          fee_amount: 0,
          net_value: value,
          status: 'pendente',
          due_date: date,
          installment_number: idx + 1,
          total_installments: n,
          upsell_opportunity_id: data.upsell_opportunity_id || null,
          };
        });

        const { error } = await supabase.from('payments').insert(payments);
        if (error) throw error;
      } else if (data.payment_method === 'credito') {
        // Credit card: single payment, immediately "pago" but with fee deduction
        const { error } = await supabase.from('payments').insert({
          lead_id: data.lead_id,
          agent_id: user?.id ?? null,
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
          upsell_opportunity_id: data.upsell_opportunity_id || null,
        });
        if (error) throw error;
      } else {
        // Pix, Débito, Cheque: immediate full payment
        const { error } = await supabase.from('payments').insert({
          lead_id: data.lead_id,
          agent_id: user?.id ?? null,
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
          upsell_opportunity_id: data.upsell_opportunity_id || null,
        });
        if (error) throw error;
      }

      // Atualiza o lead SEM apagar o orçamento digitado.
      // Antes, cada pagamento trocava orçamento e valor do tratamento pelo valor DESTE pagamento
      // (uma parcela de R$ 1.000 num orçamento de R$ 10.000 deixava o orçamento em R$ 1.000).
      if (!data.upsell_opportunity_id) {
        const { data: current, error: readErr } = await supabase
          .from('leads')
          .select('status, budget_value, treatment_value')
          .eq('id', data.lead_id)
          .maybeSingle();
        if (readErr) throw new Error(`Pagamento registrado, mas o lead não foi lido: ${describeError(readErr)}`);

        const now = new Date().toISOString();
        const leadUpdate: Record<string, unknown> = {};
        // Valor do tratamento = orçamento; sem orçamento, o valor deste pagamento
        if (!current?.treatment_value) {
          leadUpdate.treatment_value = current?.budget_value || data.gross_value;
        }
        if (!current?.budget_value) leadUpdate.budget_value = data.gross_value;
        // Vira "Venda realizada" só na primeira venda; pagamentos seguintes não mudam etapa nem data da venda
        const alreadySold = isSoldStatus(current?.status);
        if (!alreadySold) {
          leadUpdate.status = 'fechado';
          leadUpdate.stage_entered_at = now;
          leadUpdate.closed_at = now; // nova venda (lead não estava vendido)
        }
        if (Object.keys(leadUpdate).length) {
          const { error: leadUpdateError } = await supabase
            .from('leads')
            .update(leadUpdate)
            .eq('id', data.lead_id);
          if (leadUpdateError) {
            throw new Error(`Pagamento registrado, mas o lead não foi marcado como venda: ${describeError(leadUpdateError)}`);
          }
          if (!alreadySold && current?.status) {
            await recordStageTransition(data.lead_id, current.status, 'fechado').catch(() => undefined);
          }
        }
      }

      // Log the payment activity
      const { data: leadData } = await supabase
        .from('leads')
        .select('name')
        .eq('id', data.lead_id)
        .maybeSingle();

      await supabase.from('activity_logs').insert({
        lead_id: data.lead_id,
        agent_id: user?.id ?? null,
        activity_type: 'value_updated',
        title: `Pagamento registrado: ${leadData?.name || 'Lead'}`,
        description: `${data.payment_method.toUpperCase()} - R$ ${data.gross_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${data.payment_method === 'credito' ? ` (${data.installments}x, líquido: R$ ${data.net_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}`,
        new_value: String(data.net_value),
        metadata: { payment_method: data.payment_method, gross_value: data.gross_value, net_value: data.net_value, installments: data.installments },
      }).then(({ error: logError }) => {
        if (logError) console.warn('Activity log failed:', logError);
      });
    },
    onSuccess: () => {
      void refreshBusinessData(queryClient);
      toast.success('Pagamento registrado');
    },
    onError: (err) => {
      // a mensagem já diz se o pagamento entrou e só o lead falhou
      void refreshBusinessData(queryClient);
      const msg = err instanceof Error && err.message.startsWith('Pagamento registrado') ? err.message : `O pagamento não foi registrado. ${describeError(err)}`;
      toast.error(msg);
    },
  });
}

function invalidateAllPaymentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // todas as telas abertas (Dashboard, metas, BI, relatórios...) recalculam
  void refreshBusinessData(queryClient);
}

export function useRevertPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'cancelado', paid_at: null })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllPaymentQueries(queryClient);
      toast.success('Pagamento revertido');
    },
    onError: (e) => {
      toast.error(`O pagamento não foi revertido. ${describeError(e)}`);
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllPaymentQueries(queryClient);
      toast.success('Pagamento excluído');
    },
    onError: (e) => {
      toast.error(`O pagamento não foi excluído. ${describeError(e)}`);
    },
  });
}

export function useEditPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; gross_value: number; net_value: number; fee_amount: number; fee_percentage: number }) => {
      const { error } = await supabase
        .from('payments')
        .update({
          gross_value: data.gross_value,
          net_value: data.net_value,
          fee_amount: data.fee_amount,
          fee_percentage: data.fee_percentage,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllPaymentQueries(queryClient);
      toast.success('Pagamento atualizado');
    },
    onError: (e) => {
      toast.error(`O pagamento não foi atualizado. ${describeError(e)}`);
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
      invalidateAllPaymentQueries(queryClient);
      toast.success('Boleto dado como pago');
    },
    onError: (e) => {
      toast.error(`O boleto não foi dado como pago. ${describeError(e)}`);
    },
  });
}
