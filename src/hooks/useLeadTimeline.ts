import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineEvent {
  id: string;
  type: 'whatsapp_inbound' | 'whatsapp_outbound' | 'call_inbound' | 'call_outbound' | 'status_change' | 'note' | 'appointment';
  content: string;
  metadata?: {
    duration?: number;
    status?: string;
    oldStatus?: string;
    newStatus?: string;
    agentName?: string;
  };
  createdAt: Date;
  agentId?: string;
  agentName?: string;
}

export function useLeadTimeline(leadId: string) {
  return useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: async (): Promise<TimelineEvent[]> => {
      const events: TimelineEvent[] = [];

      // Fetch WhatsApp messages
      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select(`
          id,
          direction,
          content,
          created_at,
          agent_id,
          profiles:agent_id (full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      messages?.forEach((msg: any) => {
        events.push({
          id: msg.id,
          type: msg.direction === 'inbound' ? 'whatsapp_inbound' : 'whatsapp_outbound',
          content: msg.content || 'Mensagem de mídia',
          createdAt: new Date(msg.created_at),
          agentId: msg.agent_id,
          agentName: msg.profiles?.full_name,
        });
      });

      // Fetch call logs
      const { data: calls } = await supabase
        .from('call_logs')
        .select(`
          id,
          call_type,
          duration_seconds,
          result,
          notes,
          created_at,
          agent_id,
          profiles:agent_id (full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      calls?.forEach((call: any) => {
        events.push({
          id: call.id,
          type: call.call_type === 'inbound' ? 'call_inbound' : 'call_outbound',
          content: call.notes || `Ligação ${call.result || 'realizada'}`,
          metadata: {
            duration: call.duration_seconds,
            status: call.result,
          },
          createdAt: new Date(call.created_at),
          agentId: call.agent_id,
          agentName: call.profiles?.full_name,
        });
      });

      // Fetch interactions (notes, status changes)
      const { data: interactions } = await supabase
        .from('lead_interactions')
        .select(`
          id,
          type,
          content,
          duration_seconds,
          created_at,
          user_id,
          profiles:user_id (full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      interactions?.forEach((interaction: any) => {
        let eventType: TimelineEvent['type'] = 'note';
        if (interaction.type === 'agendamento') eventType = 'appointment';
        else if (interaction.type.includes('whatsapp')) {
          eventType = interaction.type === 'whatsapp_recebido' ? 'whatsapp_inbound' : 'whatsapp_outbound';
        } else if (interaction.type.includes('ligacao')) {
          eventType = interaction.type === 'ligacao_recebida' ? 'call_inbound' : 'call_outbound';
        }

        events.push({
          id: interaction.id,
          type: eventType,
          content: interaction.content || '',
          metadata: {
            duration: interaction.duration_seconds,
          },
          createdAt: new Date(interaction.created_at),
          agentId: interaction.user_id,
          agentName: interaction.profiles?.full_name,
        });
      });

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          confirmed_at,
          attended_at,
          cancelled_at,
          treatment_type,
          notes,
          created_at,
          agent_id,
          profiles:agent_id (full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      appointments?.forEach((apt: any) => {
        events.push({
          id: apt.id,
          type: 'appointment',
          content: `Consulta agendada: ${apt.treatment_type || 'Avaliação'}`,
          metadata: {
            status: apt.attended_at ? 'compareceu' : apt.cancelled_at ? 'cancelado' : apt.confirmed_at ? 'confirmado' : 'agendado',
          },
          createdAt: new Date(apt.created_at),
          agentId: apt.agent_id,
          agentName: apt.profiles?.full_name,
        });
      });

      // Sort by date descending
      return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    enabled: !!leadId,
  });
}
