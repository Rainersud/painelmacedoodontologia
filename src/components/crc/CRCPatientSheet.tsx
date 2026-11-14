import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowRightLeft, ClipboardList, ExternalLink, FileText, ImageIcon, Loader2, MessageCircle,
  Paperclip, Phone, StickyNote, Trash2, X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { CRC_BOARD_MAP, type CrcItem } from '@/lib/crc';
import {
  openCrcFile, useAddCrcEntry, useArchiveCrcCard, useCrcEntries, useDeleteCrcEntry,
  useSaveProntuario, type CrcEntry, type CrcEntryKind,
} from '@/hooks/useCRC';

const KIND_META: Record<CrcEntryKind, { label: string; icon: typeof StickyNote }> = {
  situacao: { label: 'Situação', icon: ClipboardList },
  contato: { label: 'Contato', icon: Phone },
  nota: { label: 'Anotação', icon: StickyNote },
  anexo: { label: 'Arquivo', icon: Paperclip },
  movimento: { label: 'Movimento', icon: ArrowRightLeft },
};

interface Props {
  item: CrcItem | null;
  prontuarioUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLead: () => void;
  /** Mudar de coluna (quem chama decide se pede confirmação, ex.: Fim de ciclo). */
  onMove: (to: string) => void;
}

export function CRCPatientSheet({ item, prontuarioUrl, open, onOpenChange, onOpenLead, onMove }: Props) {
  const leadId = item?.lead.id ?? null;
  const board = item ? CRC_BOARD_MAP[item.board] : null;
  const { data, isLoading } = useCrcEntries(open ? leadId : null);
  const archive = useArchiveCrcCard();
  const add = useAddCrcEntry();
  const del = useDeleteCrcEntry();
  const saveProntuario = useSaveProntuario();

  const [kind, setKind] = useState<Exclude<CrcEntryKind, 'anexo' | 'movimento'>>('contato');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Troca de paciente: limpa o rascunho
  useEffect(() => {
    setBody('');
    setFile(null);
    setKind('contato');
    setLink(prontuarioUrl ?? '');
  }, [leadId, prontuarioUrl]);

  if (!item || !board) return null;

  const digits = item.lead.phone.replace(/\D/g, '');
  const whatsapp = digits ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}` : null;
  const entries = data?.entries ?? [];

  const submit = () => {
    if (!body.trim() && !file) return;
    add.mutate(
      { leadId: item.lead.id, board: item.board, kind, body, file },
      { onSuccess: () => { setBody(''); setFile(null); } },
    );
  };

  // Colar um print direto no campo de texto
  const onPaste = (e: React.ClipboardEvent) => {
    const img = Array.from(e.clipboardData.files).find(f => f.type.startsWith('image/'));
    if (img) {
      e.preventDefault();
      setFile(new File([img], img.name && img.name !== 'image.png' ? img.name : `print_${Date.now()}.png`, { type: img.type }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b space-y-1 text-left">
          <SheetTitle className="text-lg leading-tight pr-6">{item.lead.name}</SheetTitle>
          <SheetDescription className="text-sm">{board.label} · {item.reason}</SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {whatsapp && (
              <Button size="sm" variant="outline" asChild>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                </a>
              </Button>
            )}
            {digits && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${digits}`}><Phone className="h-4 w-4 mr-1.5" /> {item.lead.phone}</a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onOpenLead}>
              <FileText className="h-4 w-4 mr-1.5" /> Ficha do lead
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Coluna no quadro */}
          <section className="space-y-2">
            <Label className="text-xs text-muted-foreground">Etapa em {board.label}</Label>
            <div className="flex gap-2">
              <Select
                value={item.stage}
                onValueChange={(to) => to !== item.stage && onMove(to)}
              >
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {board.stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                disabled={archive.isPending}
                onClick={() => archive.mutate({ board: item.board, leadId: item.lead.id, stage: item.stage }, { onSuccess: () => onOpenChange(false) })}
              >
                Tirar do quadro
              </Button>
            </div>
          </section>

          {/* Prontuário */}
          <section className="space-y-2">
            <Label htmlFor="crc-prontuario" className="text-xs text-muted-foreground">Link do prontuário original</Label>
            <div className="flex gap-2">
              <Input
                id="crc-prontuario"
                placeholder="https://…"
                value={link}
                onChange={e => setLink(e.target.value)}
              />
              {link.trim() !== (prontuarioUrl ?? '') ? (
                <Button
                  disabled={saveProntuario.isPending}
                  onClick={() => saveProntuario.mutate({ leadId: item.lead.id, url: link })}
                >
                  Salvar
                </Button>
              ) : prontuarioUrl ? (
                <Button variant="outline" asChild>
                  <a href={prontuarioUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir
                  </a>
                </Button>
              ) : null}
            </div>
          </section>

          {/* Novo registro */}
          <section className="space-y-2">
            <Label className="text-xs text-muted-foreground">Registrar no histórico</Label>
            <ToggleGroup
              type="single"
              value={kind}
              onValueChange={(v) => v && setKind(v as typeof kind)}
              className="justify-start"
            >
              {(['situacao', 'contato', 'nota'] as const).map(k => {
                const Icon = KIND_META[k].icon;
                return (
                  <ToggleGroupItem key={k} value={k} size="sm" className="gap-1.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                    <Icon className="h-3.5 w-3.5" /> {KIND_META[k].label}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
            <Textarea
              rows={3}
              value={body}
              onChange={e => setBody(e.target.value)}
              onPaste={onPaste}
              placeholder={
                kind === 'situacao' ? 'Como está o caso agora? Ex.: aguardando o marido para decidir'
                  : kind === 'contato' ? 'O que foi conversado? Ex.: liguei, pediu retorno sexta às 14h'
                  : 'Anotação livre'
              }
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
              {file ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs max-w-[60%]">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} aria-label="Remover arquivo">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-1.5" /> Anexar print ou arquivo
                </Button>
              )}
              <Button className="ml-auto" size="sm" disabled={add.isPending || (!body.trim() && !file)} onClick={submit}>
                {add.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Registrar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Dica: dá para colar um print (Ctrl+V) direto no campo de texto.</p>
          </section>

          {/* Histórico */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Histórico</h3>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada registrado ainda. Anote o primeiro contato acima.</p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-4">
                {entries.map(e => <EntryRow key={e.id} entry={e} onDelete={() => del.mutate(e)} />)}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EntryRow({ entry, onDelete }: { entry: CrcEntry; onDelete: () => void }) {
  const meta = KIND_META[entry.kind] ?? KIND_META.nota;
  const Icon = meta.icon;
  const isMove = entry.kind === 'movimento';
  const boardLabel = CRC_BOARD_MAP[entry.board as keyof typeof CRC_BOARD_MAP]?.label;
  return (
    <li className="ml-4 group">
      <span className={cn(
        'absolute -left-[9px] mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border bg-background',
        isMove ? 'text-muted-foreground' : 'text-primary border-primary/40',
      )}>
        <Icon className="h-2.5 w-2.5" />
      </span>
      <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
        <span className={cn('font-medium', !isMove && 'text-foreground')}>{meta.label}</span>
        <span>{format(new Date(entry.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
        {!isMove && boardLabel && <span className="truncate">· {boardLabel}</span>}
        {!isMove && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive"
            aria-label="Apagar registro"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {entry.body && (
        <p className={cn('mt-0.5 whitespace-pre-wrap', isMove ? 'text-xs text-muted-foreground' : 'text-sm')}>{entry.body}</p>
      )}
      {entry.file_path && (
        <button
          type="button"
          onClick={() => openCrcFile(entry.file_path!)}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent"
        >
          {entry.mime_type?.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
          {entry.file_name || 'Abrir arquivo'}
        </button>
      )}
    </li>
  );
}
