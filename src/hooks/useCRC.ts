import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { allPages } from '@/lib/paging';
import { recordStageTransition } from '@/hooks/useStageHistory';
import { describeError } from '@/lib/errors';
import {
  buildCrcBoards,
  CRC_BOARD_MAP,
  type CrcAppointment,
  type CrcBirthday,
  type CrcBoardKey,
  type CrcCardRow,
  type CrcOverduePayment,
  END_OF_CYCLE,
} from '@/lib/crc';
import { endContactCycle } from '@/lib/contactCycle';

export const CRC_BUCKET = 'crc-attachments';

export type CrcEntryKind = 'situacao' | 'contato' | 'nota' | 'anexo' | 'movimento';

export interface CrcEntry {
  id: string;
  lead_id: string;
  board: string;
  kind: CrcEntryKind;
  body: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  created_by: string | null;
  created_at: string;
}

/** A estrutura do CRC ainda não foi criada no banco (migration pendente). */
function isMissingTable(error: unknown) {
  const e = error as { code?: string; message?: string } | null;
  return !!e && (e.code === '42P01' || e.code === 'PGRST205' || /crc_(cards|entries)/.test(e.message ?? '') && /not find|does not exist/i.test(e.message ?? ''));
}

interface CrcSources {
  appointments: CrcAppointment[];
  overduePayments: CrcOverduePayment[];
  birthdays: CrcBirthday[];
  cards: CrcCardRow[];
  /** false = tabelas do CRC ainda não existem; a tela mostra os quadros, mas não grava colunas. */
  ready: boolean;
}

function useCrcSources() {
  return useQuery({
    queryKey: ['crc-sources'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<CrcSources> => {
      const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const [appts, pays, triage, cards] = await Promise.all([
        allPages<CrcAppointment>(
          supabase.from('appointments')
            .select('lead_id, scheduled_at, created_at, confirmed_at, attended_at, cancelled_at, rescheduled_at, no_show_at')
            .or(`scheduled_at.gte.${since},cancelled_at.gte.${since}`)
            .order('id'),
        ),
        allPages<CrcOverduePayment>(
          supabase.from('payments')
            .select('lead_id, due_date, gross_value')
            .eq('status', 'pendente')
            .lt('due_date', todayStr)
            .order('id'),
        ),
        allPages<CrcBirthday>(
          supabase.from('patient_triage')
            .select('lead_id, birth_date')
            .not('birth_date', 'is', null)
            .order('id'),
        ),
        allPages<CrcCardRow>(
          supabase.from('crc_cards')
            .select('board, lead_id, stage, manual, archived_at, updated_at')
            .order('id'),
        ),
      ]);

      for (const r of [appts, pays, triage]) if (r.error) throw r.error;
      let ready = true;
      if (cards.error) {
        if (isMissingTable(cards.error)) ready = false;
        else throw cards.error;
      }

      return {
        appointments: appts.data,
        overduePayments: pays.data.filter(p => p.due_date),
        birthdays: triage.data.filter(b => b.birth_date),
        cards: ready ? cards.data : [],
        ready,
      };
    },
  });
}

/** Os 8 quadros, já montados. */
export function useCrcBoards() {
  const leadsQ = useCRMLeads();
  const srcQ = useCrcSources();
  // As confirmações andam com o relógio (24h, 2h, 10 min antes): recalcula a cada minuto
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const boards = useMemo(() => {
    if (!leadsQ.data || !srcQ.data) return null;
    return buildCrcBoards({
      now: new Date(),
      leads: leadsQ.data.map(l => ({ ...l, status: l.status as string })),
      appointments: srcQ.data.appointments,
      overduePayments: srcQ.data.overduePayments,
      birthdays: srcQ.data.birthdays,
      cards: srcQ.data.cards,
    });
  }, [leadsQ.data, srcQ.data, tick]);

  return {
    boards,
    leads: leadsQ.data ?? [],
    ready: srcQ.data?.ready ?? true,
    isLoading: leadsQ.isLoading || srcQ.isLoading,
    error: leadsQ.error || srcQ.error,
  };
}

function useInvalidateCrc() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['crc-sources'] });
    qc.invalidateQueries({ queryKey: ['crc-entries'] });
  };
}

const NOT_READY = 'O CRC ainda não foi ativado no banco. Peça para aplicar a atualização do banco (migration do CRC) e tente de novo.';

function fail(err: unknown): never {
  throw new Error(isMissingTable(err) ? NOT_READY : describeError(err));
}

/** Muda o paciente de coluna e registra no histórico. */
export function useMoveCrcCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = useInvalidateCrc();

  return useMutation({
    mutationFn: async (p: { board: CrcBoardKey; leadId: string; from?: string; to: string; manual?: boolean }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('crc_cards').upsert(
        { board: p.board, lead_id: p.leadId, stage: p.to, updated_by: user?.id ?? null, updated_at: now, archived_at: null, ...(p.manual ? { manual: true } : {}) },
        { onConflict: 'board,lead_id' },
      );
      if (error) fail(error);

      const stages = CRC_BOARD_MAP[p.board].stages;
      const label = (k?: string) => stages.find(s => s.key === k)?.label ?? k ?? '';
      const body = p.from
        ? `${CRC_BOARD_MAP[p.board].label}: ${label(p.from)} → ${label(p.to)}`
        : `${CRC_BOARD_MAP[p.board].label}: entrou em ${label(p.to)}`;
      await supabase.from('crc_entries').insert({ lead_id: p.leadId, board: p.board, kind: 'movimento', body, created_by: user?.id ?? null });

      // Fim de ciclo: não quer mais receber contato (vale para o lead inteiro, não só este quadro)
      if (p.to === END_OF_CYCLE) {
        const res = await endContactCycle(p.leadId, `CRC · ${CRC_BOARD_MAP[p.board].label}`, user?.id ?? null);
        if (res.error) throw new Error(`A coluna mudou, mas o fim de ciclo não foi aplicado: ${res.error}`);
        qc.invalidateQueries({ queryKey: ['crm-leads'] });
        qc.invalidateQueries({ queryKey: ['tasks'] });
      }

      // Confirmar no CRC também confirma a consulta na agenda e no funil.
      if (p.board === 'sem_confirmacao' && p.to === 'confirmado') {
        await supabase.from('appointments')
          .update({ confirmed_at: now })
          .eq('lead_id', p.leadId)
          .is('confirmed_at', null).is('cancelled_at', null).is('attended_at', null).is('rescheduled_at', null).is('no_show_at', null)
          .gte('scheduled_at', now);
        const { data: lead } = await supabase.from('leads').select('status').eq('id', p.leadId).maybeSingle();
        if (lead && (lead.status === 'agendou' || lead.status === 'consulta_agendada')) {
          const { error: stErr } = await supabase.from('leads').update({ status: 'confirmado', stage_entered_at: now }).eq('id', p.leadId);
          if (!stErr) await recordStageTransition(p.leadId, lead.status, 'confirmado');
          qc.invalidateQueries({ queryKey: ['crm-leads'] });
        }
      }
    },
    onMutate: async (p) => {
      // Mostra a mudança na hora; se falhar, volta.
      await qc.cancelQueries({ queryKey: ['crc-sources'] });
      const prev = qc.getQueryData<CrcSources>(['crc-sources']);
      if (prev) {
        const now = new Date().toISOString();
        const others = prev.cards.filter(c => !(c.board === p.board && c.lead_id === p.leadId));
        const old = prev.cards.find(c => c.board === p.board && c.lead_id === p.leadId);
        qc.setQueryData<CrcSources>(['crc-sources'], {
          ...prev,
          cards: [...others, { board: p.board, lead_id: p.leadId, stage: p.to, manual: p.manual || old?.manual, archived_at: null, updated_at: now }],
        });
      }
      return { prev };
    },
    onError: (err, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(['crc-sources'], ctx.prev);
      toast.error(err instanceof Error ? err.message : describeError(err));
    },
    onSettled: invalidate,
  });
}

/** Tira o paciente do quadro (volta sozinho se acontecer um caso novo). */
export function useArchiveCrcCard() {
  const { user } = useAuth();
  const invalidate = useInvalidateCrc();
  return useMutation({
    mutationFn: async (p: { board: CrcBoardKey; leadId: string; stage: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('crc_cards').upsert(
        { board: p.board, lead_id: p.leadId, stage: p.stage, archived_at: now, updated_at: now, updated_by: user?.id ?? null },
        { onConflict: 'board,lead_id' },
      );
      if (error) fail(error);
      await supabase.from('crc_entries').insert({
        lead_id: p.leadId, board: p.board, kind: 'movimento',
        body: `${CRC_BOARD_MAP[p.board].label}: tirado do quadro`, created_by: user?.id ?? null,
      });
    },
    onSuccess: () => toast.success('Paciente tirado do quadro'),
    onError: (err) => toast.error(err instanceof Error ? err.message : describeError(err)),
    onSettled: invalidate,
  });
}

/** Histórico do paciente no CRC (todos os quadros). */
export function useCrcEntries(leadId: string | null) {
  return useQuery({
    queryKey: ['crc-entries', leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<{ entries: CrcEntry[]; ready: boolean }> => {
      const { data, error } = await supabase
        .from('crc_entries')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false });
      if (error) {
        if (isMissingTable(error)) return { entries: [], ready: false };
        throw error;
      }
      return { entries: (data ?? []) as CrcEntry[], ready: true };
    },
  });
}

/** Grava situação, contato ou anotação; com arquivo, sobe o print/arquivo junto. */
export function useAddCrcEntry() {
  const { user } = useAuth();
  const invalidate = useInvalidateCrc();
  return useMutation({
    mutationFn: async (p: { leadId: string; board: CrcBoardKey; kind: CrcEntryKind; body?: string; file?: File | null }) => {
      let file_path: string | null = null;
      if (p.file) {
        const safe = p.file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');
        file_path = `${p.leadId}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage.from(CRC_BUCKET).upload(file_path, p.file, { contentType: p.file.type || undefined });
        if (upErr) throw new Error(`O arquivo não subiu: ${describeError(upErr)}`);
      }
      const { error } = await supabase.from('crc_entries').insert({
        lead_id: p.leadId,
        board: p.board,
        kind: p.file && !p.body?.trim() ? 'anexo' : p.kind,
        body: p.body?.trim() || null,
        file_path,
        file_name: p.file?.name ?? null,
        mime_type: p.file?.type || null,
        created_by: user?.id ?? null,
      });
      if (error) {
        if (file_path) await supabase.storage.from(CRC_BUCKET).remove([file_path]);
        fail(error);
      }
    },
    onSuccess: () => toast.success('Registrado no histórico'),
    onError: (err) => toast.error(err instanceof Error ? err.message : describeError(err)),
    onSettled: invalidate,
  });
}

export function useDeleteCrcEntry() {
  const invalidate = useInvalidateCrc();
  return useMutation({
    mutationFn: async (entry: CrcEntry) => {
      const { error } = await supabase.from('crc_entries').delete().eq('id', entry.id);
      if (error) fail(error);
      if (entry.file_path) await supabase.storage.from(CRC_BUCKET).remove([entry.file_path]);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : describeError(err)),
    onSettled: invalidate,
  });
}

/** Link temporário (1 hora) para abrir um print/arquivo da pasta privada. */
export async function openCrcFile(path: string) {
  const { data, error } = await supabase.storage.from(CRC_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    toast.error(`Não foi possível abrir o arquivo: ${describeError(error)}`);
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener');
}

/** Salva o link do prontuário original no cadastro do lead. */
export function useSaveProntuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { leadId: string; url: string }) => {
      const url = p.url.trim();
      if (url && !/^https?:\/\//i.test(url)) throw new Error('O link do prontuário precisa começar com http:// ou https://');
      const { error } = await supabase.from('leads').update({ prontuario_url: url || null }).eq('id', p.leadId);
      if (error) {
        const msg = describeError(error);
        throw new Error(/prontuario_url/.test(msg) ? NOT_READY : msg);
      }
    },
    onSuccess: () => {
      toast.success('Link do prontuário salvo');
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : describeError(err)),
  });
}
