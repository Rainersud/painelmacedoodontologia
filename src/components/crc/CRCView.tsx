import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Cake, CalendarClock, CalendarX, CircleDollarSign, FileSpreadsheet, Info, Loader2,
  Plus, Search, Stethoscope, UserX, UserRoundX, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { describeError } from '@/lib/errors';
import { CRC_BOARDS, CRC_BOARD_MAP, openCount, type CrcBoardKey, type CrcItem } from '@/lib/crc';
import { useCrcBoards, useMoveCrcCard } from '@/hooks/useCRC';
import { CRCPatientSheet } from './CRCPatientSheet';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import type { Lead } from '@/types/crm';

const ICONS: Record<CrcBoardKey, typeof Cake> = {
  sem_confirmacao: CalendarClock,
  aniversariantes: Cake,
  desmarcacoes: CalendarX,
  faltas: UserX,
  faltas_primeira: UserRoundX,
  inadimplencia: CircleDollarSign,
  orcamentos: FileSpreadsheet,
  tratamento_sem_agendamento: Stethoscope,
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CRCView() {
  const [params, setParams] = useSearchParams();
  const boardKey = params.get('quadro') as CrcBoardKey | null;
  const board = boardKey && CRC_BOARD_MAP[boardKey] ? CRC_BOARD_MAP[boardKey] : null;
  const { boards, leads, ready, isLoading, error } = useCrcBoards();

  const openBoard = (key: CrcBoardKey | null) => {
    const next = new URLSearchParams(params);
    if (key) next.set('quadro', key); else next.delete('quadro');
    setParams(next);
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }
  if (error || !boards) {
    return (
      <div className="monday-card p-6 text-sm">
        <p className="font-medium">Não foi possível carregar o CRC.</p>
        <p className="text-muted-foreground mt-1">{describeError(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!ready && (
        <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning-strong" />
          <p>
            Os quadros já mostram os pacientes, mas mover entre colunas, anotar e anexar só vão salvar depois que a
            atualização do banco do CRC for aplicada no Lovable.
          </p>
        </div>
      )}
      {board ? (
        <CRCBoardView board={board.key} items={boards[board.key]} leads={leads} onBack={() => openBoard(null)} />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {CRC_BOARDS.map(b => {
            const Icon = ICONS[b.key];
            const items = boards[b.key];
            const open = openCount(b.key, items);
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => openBoard(b.key)}
                className="monday-card group relative flex flex-col justify-start text-left p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        role="img"
                        aria-label={`Quem entra em ${b.label}`}
                        onClick={e => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <Info className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">{b.rule}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="mt-3 font-semibold leading-snug">{b.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">{open}</span>
                  <span className="text-xs text-muted-foreground">
                    a tratar{items.length !== open ? ` · ${items.length} no total` : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface BoardProps {
  board: CrcBoardKey;
  items: CrcItem[];
  leads: Lead[];
  onBack: () => void;
}

function CRCBoardView({ board, items, leads, onBack }: BoardProps) {
  const def = CRC_BOARD_MAP[board];
  const move = useMoveCrcCard();
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  const shown = useMemo(() => {
    const q = norm(query.trim());
    const digits = query.replace(/\D/g, '');
    if (!q) return items;
    return items.filter(i => norm(i.lead.name).includes(q) || (digits.length >= 3 && i.lead.phone.replace(/\D/g, '').includes(digits)));
  }, [items, query]);

  const selected = items.find(i => i.lead.id === selectedId) ?? null;
  const selectedLead = leads.find(l => l.id === selectedId) ?? null;
  const total = items.reduce((s, i) => s + (i.amount ?? 0), 0);

  const drop = (stage: string) => {
    setOverStage(null);
    const item = items.find(i => i.lead.id === dragging);
    setDragging(null);
    if (!item || item.stage === stage) return;
    move.mutate({ board, leadId: item.lead.id, from: item.stage, to: stage, manual: item.manual });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quadros
        </Button>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{def.label}</h2>
          <p className="text-xs text-muted-foreground">
            {def.rule}
            {total > 0 && <> · {formatCurrency(total)} em jogo</>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar paciente" className="h-9 w-52 pl-8" />
          </div>
          <AddPatient board={board} leads={leads} present={new Set(items.map(i => i.lead.id))} />
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {def.stages.map(stage => {
          const col = shown.filter(i => i.stage === stage.key);
          return (
            <div
              key={stage.key}
              onDragOver={e => { e.preventDefault(); setOverStage(stage.key); }}
              onDragLeave={() => setOverStage(s => (s === stage.key ? null : s))}
              onDrop={e => { e.preventDefault(); drop(stage.key); }}
              className={cn(
                'w-64 shrink-0 rounded-xl border flex flex-col max-h-[calc(100vh-260px)]',
                stage.done ? 'bg-muted/40 border-border/60' : 'bg-card border-border',
                overStage === stage.key && 'ring-2 ring-primary ring-offset-2',
              )}
            >
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <span className={cn('text-sm font-semibold', stage.done && 'text-muted-foreground')}>{stage.label}</span>
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[11px]">{col.length}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
                {col.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">Arraste um paciente para cá</p>
                )}
                {col.map(item => (
                  <button
                    key={item.lead.id}
                    type="button"
                    draggable
                    onDragStart={() => setDragging(item.lead.id)}
                    onDragEnd={() => { setDragging(null); setOverStage(null); }}
                    onClick={() => setSelectedId(item.lead.id)}
                    className={cn(
                      'w-full text-left rounded-lg border bg-background px-2.5 py-2 shadow-sm transition hover:border-primary/50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      dragging === item.lead.id && 'opacity-50',
                    )}
                  >
                    <p className="text-sm font-medium truncate">{item.lead.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.reason}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{item.lead.phone}</span>
                      {item.manual && <span className="shrink-0">manual</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <CRCPatientSheet
        item={selected}
        prontuarioUrl={selectedLead?.prontuario_url}
        open={!!selected && !leadOpen}
        onOpenChange={o => { if (!o) setSelectedId(null); }}
        onOpenLead={() => setLeadOpen(true)}
      />
      <LeadDetailDialog lead={selectedLead} open={leadOpen} onOpenChange={setLeadOpen} />
    </div>
  );
}

function AddPatient({ board, leads, present }: { board: CrcBoardKey; leads: Lead[]; present: Set<string> }) {
  const move = useMoveCrcCard();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const first = CRC_BOARD_MAP[board].stages[0].key;

  const results = useMemo(() => {
    const t = norm(q.trim());
    const digits = q.replace(/\D/g, '');
    if (t.length < 2) return [];
    return leads
      .filter(l => !present.has(l.id))
      .filter(l => norm(l.name).includes(t) || (digits.length >= 3 && l.phone.replace(/\D/g, '').includes(digits)))
      .slice(0, 8);
  }, [q, leads, present]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="h-9"><Plus className="h-4 w-4 mr-1" /> Adicionar paciente</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nome ou telefone" className="h-9" />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {q.trim().length >= 2 && results.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum lead encontrado fora deste quadro.</p>
          )}
          {results.map(l => (
            <button
              key={l.id}
              type="button"
              className="w-full text-left rounded-md px-2 py-1.5 hover:bg-accent"
              onClick={() => {
                move.mutate({ board, leadId: l.id, to: first, manual: true });
                setOpen(false);
                setQ('');
              }}
            >
              <span className="block text-sm font-medium truncate">{l.name}</span>
              <span className="block text-xs text-muted-foreground">{l.phone}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
