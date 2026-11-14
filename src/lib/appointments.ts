// Consulta do lead acompanha o status: é daqui que saem comparecimentos, faltas,
// confirmações e o histórico de agendamentos (antes o status mudava e a consulta não).
import { supabase } from '@/integrations/supabase/client';

const SCHEDULED = new Set(['agendou', 'consulta_agendada']);
const NO_SHOW = new Set(['faltou', 'nao_compareceu']);
/** Etapas que só existem depois de o paciente ter vindo à clínica. */
export const ATTENDED_STAGES = new Set([
  'compareceu', 'orcamentos_abertos', 'quase_cliente', 'potencial', 'nao_cliente',
  'fechado', 'tratamento_andamento', 'concluido', 'pos_venda',
]);

type Result = { error?: unknown } | undefined;

/** Consulta em aberto mais recente do lead (ainda não aconteceu, não faltou, não foi trocada). */
async function openAppointment(leadId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, scheduled_at, confirmed_at')
    .eq('lead_id', leadId)
    .is('attended_at', null)
    .is('cancelled_at', null)
    .is('rescheduled_at', null)
    .is('no_show_at', null)
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * O que acontece com a consulta quando o lead muda de etapa.
 * - Agendou: cria a consulta na data informada.
 * - Confirmado: marca a consulta em aberto como confirmada.
 * - Compareceu (ou qualquer etapa pós-consulta, vindo de antes dela): marca presença;
 *   se não havia consulta registrada, registra a que aconteceu agora.
 * - Faltou: marca a falta; se não havia consulta, registra a que faltou.
 */
export async function syncAppointmentWithStatus(p: {
  leadId: string;
  oldStatus: string | null | undefined;
  newStatus: string;
  agentId: string | null;
  scheduledAt?: string | null;
}): Promise<Result> {
  const now = new Date().toISOString();
  const { leadId, oldStatus, newStatus, agentId } = p;

  if (SCHEDULED.has(newStatus)) {
    return supabase.from('appointments').insert({
      lead_id: leadId,
      agent_id: agentId,
      scheduled_at: p.scheduledAt || now,
      notes: 'Agendamento criado automaticamente via funil',
    });
  }

  if (newStatus === 'confirmado') {
    const open = await openAppointment(leadId);
    if (!open || open.confirmed_at) return undefined;
    return supabase.from('appointments').update({ confirmed_at: now }).eq('id', open.id);
  }

  const cameNow = ATTENDED_STAGES.has(newStatus) && !ATTENDED_STAGES.has(oldStatus ?? '');
  if (cameNow || NO_SHOW.has(newStatus)) {
    const field = cameNow ? 'attended_at' : 'no_show_at';
    const open = await openAppointment(leadId);
    if (open) return supabase.from('appointments').update({ [field]: now }).eq('id', open.id);
    return supabase.from('appointments').insert({
      lead_id: leadId,
      agent_id: agentId,
      scheduled_at: now,
      [field]: now,
      notes: 'Consulta registrada ao mudar a etapa (não havia agendamento no painel)',
    });
  }
  return undefined;
}

/**
 * Nova data para a consulta: a antiga fica no histórico como "Reagendada" e entra uma nova
 * apontando para ela. Reagendar não conta como novo agendamento nos indicadores.
 */
export async function rescheduleAppointment(leadId: string, isoDate: string, agentId: string | null): Promise<Result> {
  const open = await openAppointment(leadId);
  if (open && new Date(open.scheduled_at).getTime() === new Date(isoDate).getTime()) return undefined;
  if (open) {
    const { error } = await supabase.from('appointments')
      .update({ rescheduled_at: new Date().toISOString() }).eq('id', open.id);
    if (error) return { error };
  }
  return supabase.from('appointments').insert({
    lead_id: leadId,
    agent_id: agentId,
    scheduled_at: isoDate,
    rescheduled_from_id: open?.id ?? null,
    notes: open ? 'Reagendamento' : 'Agendamento criado ao definir a data da consulta',
  });
}
