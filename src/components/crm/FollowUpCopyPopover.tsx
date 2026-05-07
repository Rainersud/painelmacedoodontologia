import { useEffect, useRef, useState } from 'react';
import { Copy, Check, MessageSquare, Mic, Save, RotateCcw, Image as ImageIcon, Download, Trash2, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FOLLOWUP_COPY_TEMPLATES } from '@/types/crm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface FollowUpCopyPopoverProps {
  stageKey: string;
}

interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  url: string;
}

export function FollowUpCopyPopover({ stageKey }: FollowUpCopyPopoverProps) {
  const template = FOLLOWUP_COPY_TEMPLATES[stageKey];
  const storageKey = `followup_copy_${stageKey}`;
  const [copied, setCopied] = useState(false);
  const [savedCopy, setSavedCopy] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(storageKey) ?? '';
  });
  const [editedCopy, setEditedCopy] = useState<string>(savedCopy);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ['copy-attachments', stageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('copy_attachments')
        .select('id, file_path, file_name, mime_type')
        .eq('stage_key', stageKey)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((a) => ({
        ...a,
        url: supabase.storage.from('copy-attachments').getPublicUrl(a.file_path).data.publicUrl,
      }));
    },
  });

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 10MB)');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${stageKey}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('copy-attachments')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbErr } = await supabase.from('copy_attachments').insert({
        stage_key: stageKey,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        uploaded_by: user?.id,
      });
      if (dbErr) throw dbErr;
      toast.success('Imagem salva!');
      queryClient.invalidateQueries({ queryKey: ['copy-attachments', stageKey] });
    } catch (e: any) {
      toast.error('Erro ao enviar: ' + e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    try {
      await supabase.storage.from('copy-attachments').remove([att.file_path]);
      await supabase.from('copy_attachments').delete().eq('id', att.id);
      toast.success('Imagem removida');
      queryClient.invalidateQueries({ queryKey: ['copy-attachments', stageKey] });
    } catch (e: any) {
      toast.error('Erro ao remover');
    }
  };

  const handleDownload = async (att: Attachment) => {
    try {
      const res = await fetch(att.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) ?? '';
    setSavedCopy(stored);
    setEditedCopy(stored);
  }, [storageKey]);

  if (!template) return null;

  const baseCopy = savedCopy || template.copy;
  const currentCopy = isEditing ? (editedCopy || template.copy) : baseCopy;
  const isCustom = !!savedCopy && savedCopy !== template.copy;

  const handleSave = () => {
    const value = editedCopy.trim();
    if (!value) {
      toast.error('Copy vazia');
      return;
    }
    localStorage.setItem(storageKey, value);
    setSavedCopy(value);
    setIsEditing(false);
    toast.success('Copy salva!');
  };

  const handleResetToDefault = () => {
    localStorage.removeItem(storageKey);
    setSavedCopy('');
    setEditedCopy(template.copy);
    toast.success('Copy restaurada para o padrão');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCopy);
      setCopied(true);
      toast.success('Copy copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0 hover:bg-primary/10">
          <MessageSquare className="h-3 w-3 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{template.label}</p>
            <div className="flex items-center gap-1">
              {isCustom && (
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/40 text-primary">
                  ✏️ Personalizada
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                {template.format === 'audio' ? (
                  <><Mic className="h-2 w-2 mr-0.5" /> Áudio</>
                ) : (
                  <><MessageSquare className="h-2 w-2 mr-0.5" /> Texto</>
                )}
              </Badge>
            </div>
          </div>

          {isEditing ? (
            <Textarea
              value={editedCopy}
              onChange={(e) => setEditedCopy(e.target.value)}
              className="text-xs min-h-[80px] resize-none"
              placeholder={template.copy}
            />
          ) : (
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {currentCopy}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {isEditing ? (
              <>
                <Button size="sm" variant="default" className="h-7 text-xs flex-1 gap-1" onClick={handleSave}>
                  <Save className="h-3 w-3" /> Salvar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => { setEditedCopy(savedCopy || template.copy); setIsEditing(false); }}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="default" className="h-7 text-xs flex-1 gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => { setEditedCopy(savedCopy || template.copy); setIsEditing(true); }}>
                  Editar
                </Button>
                {isCustom && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleResetToDefault} title="Restaurar padrão">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
