import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, Loader2, Image as ImageIcon, Mic, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LossAttachment {
  id: string;
  lead_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
}

const BUCKET = 'loss-attachments';

export function useLossAttachments(leadId?: string) {
  return useQuery({
    queryKey: ['loss-attachments', leadId ?? 'all'],
    queryFn: async (): Promise<LossAttachment[]> => {
      let query = (supabase as any)
        .from('lead_loss_attachments')
        .select('*')
        .order('created_at', { ascending: false });
      if (leadId) query = query.eq('lead_id', leadId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LossAttachment[];
    },
  });
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

interface Props {
  leadId: string;
  compact?: boolean;
}

export function LossAttachments({ leadId, compact = false }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { data: attachments = [] } = useLossAttachments(leadId);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['loss-attachments'] });
  }, [queryClient]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${leadId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { error: dbErr } = await (supabase as any).from('lead_loss_attachments').insert({
          lead_id: leadId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
        });
        if (dbErr) throw dbErr;
      }
      toast.success('Arquivo(s) anexado(s) ao motivo de perda.');
      refresh();
    } catch (e: any) {
      toast.error(`Erro ao anexar: ${e.message || e}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = useMutation({
    mutationFn: async (att: LossAttachment) => {
      await supabase.storage.from(BUCKET).remove([att.file_path]);
      const { error } = await (supabase as any)
        .from('lead_loss_attachments')
        .delete()
        .eq('id', att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Anexo removido.');
      refresh();
    },
    onError: (e: any) => toast.error(`Erro ao remover: ${e.message || e}`),
  });

  const open = async (att: LossAttachment) => {
    const url = await getSignedUrl(att.file_path);
    if (url) window.open(url, '_blank');
    else toast.error('Não foi possível abrir o arquivo.');
  };

  return (
    <div className={cn('space-y-2', compact && 'space-y-1')}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="h-8 text-xs gap-1.5 border-chart-5/30 text-chart-5 hover:bg-chart-5/10"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        Anexar áudio ou imagem
      </Button>

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((att) => {
            const isAudio = (att.mime_type || '').startsWith('audio');
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
              >
                {isAudio ? <Mic className="h-3.5 w-3.5 text-chart-5 shrink-0" /> : <ImageIcon className="h-3.5 w-3.5 text-chart-5 shrink-0" />}
                <span className="text-xs truncate flex-1">{att.file_name}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => open(att)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => remove.mutate(att)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
