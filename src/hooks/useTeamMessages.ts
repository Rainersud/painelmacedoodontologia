import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMessageFile { id: string; path: string; name: string; mime: string | null; size: number | null; url?: string }
export interface TeamMessage {
  id: string;
  from_user: string;
  to_user: string;
  texto: string | null;
  created_at: string;
  done_at: string | null;
  done_by: string | null;
  files: TeamMessageFile[];
}

const BUCKET = 'team-messages';
const KEY = ['team-messages'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas novas, fora dos tipos gerados
const db = supabase as any;

/**
 * Recados da equipe. O banco só devolve os recados de que a pessoa participa
 * (o administrador recebe todos). Atualiza ao vivo quando alguém manda ou conclui.
 */
export function useTeamMessages() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel('team-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages' }, () => qc.invalidateQueries({ queryKey: KEY }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<TeamMessage[]> => {
      const { data, error } = await db
        .from('team_messages')
        .select('id, from_user, to_user, texto, created_at, done_at, done_by, files:team_message_files(id, path, name, mime, size)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const msgs = (data ?? []) as TeamMessage[];
      const paths = msgs.flatMap(m => m.files.map(f => f.path));
      if (paths.length) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
        const byPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));
        for (const m of msgs) for (const f of m.files) f.url = byPath.get(f.path) ?? undefined;
      }
      return msgs;
    },
  });
}

const safeName = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80);

export function useSendTeamMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, to, texto, files }: { from: string; to: string; texto: string; files: File[] }) => {
      const { data: msg, error } = await db
        .from('team_messages')
        .insert({ from_user: from, to_user: to, texto: texto.trim() || null })
        .select('id')
        .single();
      if (error) throw error;
      for (const file of files) {
        const path = `${msg.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
        if (up.error) throw up.error;
        const { error: e2 } = await db.from('team_message_files').insert({
          message_id: msg.id, path, name: file.name, mime: file.type || null, size: file.size,
        });
        if (e2) throw e2;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Concluir / reabrir: o banco só aceita de quem recebeu o recado. */
export function useToggleTeamMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { data, error } = await db
        .from('team_messages').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Só quem recebeu o recado pode concluir.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTeamMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: TeamMessage) => {
      if (m.files.length) await supabase.storage.from(BUCKET).remove(m.files.map(f => f.path));
      const { error } = await db.from('team_messages').delete().eq('id', m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
