import { useEffect, useState } from 'react';
import { Copy, Check, MessageSquare, Mic, Save, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FOLLOWUP_COPY_TEMPLATES } from '@/types/crm';
import { toast } from 'sonner';

interface FollowUpCopyPopoverProps {
  stageKey: string;
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
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
              {template.format === 'audio' ? (
                <><Mic className="h-2 w-2 mr-0.5" /> Áudio</>
              ) : (
                <><MessageSquare className="h-2 w-2 mr-0.5" /> Texto</>
              )}
            </Badge>
          </div>

          {isEditing ? (
            <Textarea
              value={editedCopy || template.copy}
              onChange={(e) => setEditedCopy(e.target.value)}
              className="text-xs min-h-[80px] resize-none"
            />
          ) : (
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {currentCopy}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs flex-1 gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setEditedCopy(template.copy);
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? 'Fechar' : 'Editar'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
