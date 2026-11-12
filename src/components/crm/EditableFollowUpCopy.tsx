import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FOLLOWUP_COPY_TEMPLATES } from '@/types/crm';
import { toast } from 'sonner';
import { Check, RotateCcw } from 'lucide-react';

interface Props {
  stageKey: string;
  leadName: string;
}

export function EditableFollowUpCopy({ stageKey, leadName }: Props) {
  const tpl = FOLLOWUP_COPY_TEMPLATES[stageKey];
  const storageKey = `followup_copy_${stageKey}`;
  const [text, setText] = useState<string>(() => {
    if (typeof window === 'undefined') return tpl.copy;
    return localStorage.getItem(storageKey) ?? tpl.copy;
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setText(localStorage.getItem(storageKey) ?? tpl.copy);
  }, [storageKey, tpl.copy]);

  const handleChange = (value: string) => {
    setText(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      localStorage.setItem(storageKey, value);
      setSavedAt(Date.now());
    }, 500);
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setText(tpl.copy);
    setSavedAt(null);
    toast.success('Copy restaurada para o padrão');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text.replace(/\[Nome\]/g, leadName));
    toast.success('Copy copiada!');
  };

  return (
    <div className="p-4 bg-chart-1/5 rounded-lg border border-chart-1/20 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-medium text-chart-1 flex items-center gap-2 text-sm">
          SUGESTÃO DE COPY - {tpl.label}
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {tpl.format === 'audio'? 'Áudio': 'Texto'}
          </Badge>
          {savedAt && (
            <span className="text-[10px] text-success flex items-center gap-1">
              <Check className="h-3 w-3" /> Salvo
            </span>
          )}
        </div>
      </div>
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={4}
        className="text-sm bg-background"
        placeholder="Edite a copy..."
      />
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">[Nome]</code> para inserir o nome do lead automaticamente. Salvamento automático.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={handleCopy}>
          Copiar mensagem
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleReset}>
          <RotateCcw className="h-3 w-3 mr-1" /> Restaurar padrão
        </Button>
      </div>
    </div>
  );
}
