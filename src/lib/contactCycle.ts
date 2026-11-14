// Fim de ciclo: a pessoa não quer mais receber contato.
// - marca o lead (contact_opt_out_at) → sai de todos os quadros de contato do CRC
// - cancela os retornos em aberto
// - tira do remarketing
// - quem ainda não é paciente vai para "Sem interesse" com o motivo registrado
//   (paciente que já comprou não muda de etapa, para não mexer nas vendas)
import { supabase } from '@/integrations/supabase/client';
import { describeError } from '@/lib/errors';
import { isSoldStatus } from '@/lib/metrics/stages';
import { recordStageTransition } from '@/hooks/useStageHistory';

export const END_OF_CYCLE_REASON = 'Fim de ciclo — não quer mais receber contato';

export async function endContactCycle(
  leadId: string, where: string, userId: string | null,
): Promise<{ error?: string }> {
  const now = new Date().toISOString();
  const { data: lead, error: readErr } = await supabase
    .from('leads').select('status').eq('id', leadId).maybeSingle();
  if (readErr) return { error: describeError(readErr) };
  if (!lead) return { error: 'Lead não encontrado.' };

  const toLost = !isSoldStatus(lead.status) && lead.status !== 'sem_interesse';
  const updates: Record<string, unknown> = {
    contact_opt_out_at: now,
    contact_opt_out_reason: where,
    rmkt_status: 'inativo',
  };
  if (toLost) Object.assign(updates, { status: 'sem_interesse', stage_entered_at: now, loss_reason: END_OF_CYCLE_REASON });

  const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
  if (error) return { error: describeError(error) };

  const side = await Promise.all([
    supabase.from('tasks')
      .update({ status: 'cancelado', response: END_OF_CYCLE_REASON, completed_at: now })
      .eq('lead_id', leadId).in('status', ['pendente', 'reagendado']),
    supabase.from('remarketing_entries').update({ is_active: false }).eq('lead_id', leadId).eq('is_active', true),
    supabase.from('activity_logs').insert({
      lead_id: leadId, agent_id: userId, activity_type: 'status_changed',
      title: 'Fim de ciclo', description: `${END_OF_CYCLE_REASON} (${where})`,
      old_value: lead.status, new_value: toLost ? 'sem_interesse' : lead.status,
    }),
  ]);
  if (toLost) await recordStageTransition(leadId, lead.status, 'sem_interesse');
  const failed = side.find(r => r.error);
  return failed?.error ? { error: describeError(failed.error) } : {};
}
