import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineEvent {
  id: string;
  type: 'lead_created' | 'status_changed' | 'task_created' | 'task_completed' | 'task_rescheduled' | 'note_added' | 'call_logged' | 'appointment_scheduled' | 'value_updated' | 'lead_edited' | 'payment_registered' | 'referral_added' | 'whatsapp_inbound' | 'whatsapp_outbound' | 'call_inbound' | 'call_outbound' | 'appointment' | 'note' | 'interaction';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  agentName?: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export function useLeadTimeline(leadId: string) {
  return useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: async (): Promise<TimelineEvent[]> => {
      const events: TimelineEvent[] = [];

      // 1. Activity logs — primary source for all tracked actions
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      // Collect agent IDs for batch profile lookup
      const agentIds = new Set<string>();

      logs?.forEach((log) => {
        if (log.agent_id) agentIds.add(log.agent_id);
        events.push({
          id: `log-${log.id}`,
          type: log.activity_type as TimelineEvent['type'],
          content: log.description || log.title,
          metadata: (log.metadata as Record<string, unknown>) || undefined,
          createdAt: new Date(log.created_at),
          oldValue: log.old_value,
          newValue: log.new_value,
          agentName: undefined, // filled below
        });
      });

      // 2. Lead interactions (notes, calls, whatsapp from manual input)
      const { data: interactions } = await supabase
        .from('lead_interactions')
        .select('id, type, content, duration_seconds, created_at, user_id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      interactions?.forEach((i) => {
        if (i.user_id) agentIds.add(i.user_id);
        events.push({
          id: `int-${i.id}`,
          type: 'interaction',
          content: i.content || `Interação: ${i.type}`,
          metadata: { interactionType: i.type, duration: i.duration_seconds },
          createdAt: new Date(i.created_at),
        });
      });

      // 3. Appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, scheduled_at, confirmed_at, attended_at, cancelled_at, treatment_type, notes, created_at, agent_id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      appointments?.forEach((apt) => {
        if (apt.agent_id) agentIds.add(apt.agent_id);
        const status = apt.attended_at ? 'compareceu' : apt.cancelled_at ? 'cancelado' : apt.confirmed_at ? 'confirmado' : 'agendado';
        events.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          content: `Consulta: ${apt.treatment_type || 'Avaliação'} — ${status}`,
          metadata: { status, scheduledAt: apt.scheduled_at },
          createdAt: new Date(apt.created_at),
        });
      });

      // 4. WhatsApp messages
      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('id, direction, content, created_at, agent_id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      messages?.forEach((msg) => {
        if (msg.agent_id) agentIds.add(msg.agent_id);
        events.push({
          id: `wpp-${msg.id}`,
          type: msg.direction === 'inbound' ? 'whatsapp_inbound' : 'whatsapp_outbound',
          content: msg.content || 'Mensagem de mídia',
          createdAt: new Date(msg.created_at),
        });
      });

      // 5. Call logs
      const { data: calls } = await supabase
        .from('call_logs')
        .select('id, call_type, duration_seconds, result, notes, created_at, agent_id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      calls?.forEach((call) => {
        if (call.agent_id) agentIds.add(call.agent_id);
        events.push({
          id: `call-${call.id}`,
          type: call.call_type === 'inbound' ? 'call_inbound' : 'call_outbound',
          content: call.notes || `Ligação ${call.result || 'realizada'}`,
          metadata: { duration: call.duration_seconds, result: call.result },
          createdAt: new Date(call.created_at),
        });
      });

      // Batch fetch profile names
      const agentIdArr = Array.from(agentIds);
      let profileMap: Record<string, string> = {};
      if (agentIdArr.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIdArr);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name]));
        }
      }

      // Assign agent names from logs
      logs?.forEach((log, i) => {
        if (log.agent_id && profileMap[log.agent_id]) {
          // Find the corresponding event
          const ev = events.find((e) => e.id === `log-${log.id}`);
          if (ev) ev.agentName = profileMap[log.agent_id];
        }
      });
      interactions?.forEach((int) => {
        if (int.user_id && profileMap[int.user_id]) {
          const ev = events.find((e) => e.id === `int-${int.id}`);
          if (ev) ev.agentName = profileMap[int.user_id];
        }
      });
      appointments?.forEach((apt) => {
        if (apt.agent_id && profileMap[apt.agent_id]) {
          const ev = events.find((e) => e.id === `apt-${apt.id}`);
          if (ev) ev.agentName = profileMap[apt.agent_id];
        }
      });
      messages?.forEach((msg) => {
        if (msg.agent_id && profileMap[msg.agent_id]) {
          const ev = events.find((e) => e.id === `wpp-${msg.id}`);
          if (ev) ev.agentName = profileMap[msg.agent_id];
        }
      });
      calls?.forEach((call) => {
        if (call.agent_id && profileMap[call.agent_id]) {
          const ev = events.find((e) => e.id === `call-${call.id}`);
          if (ev) ev.agentName = profileMap[call.agent_id];
        }
      });

      // Deduplicate: activity_logs should be authoritative; remove interaction/appointment/call/message dupes
      // Simple approach: keep all, sort by date
      return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    enabled: !!leadId,
  });
}
