import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { endOfDay, startOfDay } from 'date-fns';
import { PhoneCall } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import type { Lead, Task } from '@/types/crm';

const OPEN = new Set(['pendente', 'reagendado']);

/** Retornos para hoje e atrasados (tarefas em aberto até o fim do dia). */
export function useDueReturns() {
  const { data: tasks = [], isLoading } = useTasks();
  const due = useMemo(() => {
    const limit = endOfDay(new Date()).getTime();
    return tasks
      .filter(t => OPEN.has(t.status) && new Date(t.scheduled_at).getTime() <= limit)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [tasks]);
  return { due, isLoading };
}

function whenLabel(t: Task) {
  const d = new Date(t.scheduled_at);
  const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  if (d.getTime() < startOfDay(new Date()).getTime()) {
    return { text: `Atrasado desde ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })}`, late: true };
  }
  return { text: `Hoje às ${time}`, late: d.getTime() < Date.now() };
}

interface Props {
  leadsById: Map<string, Lead>;
  onOpen: (lead: Lead) => void;
}

/** Primeira coluna do Comercial 1: quem precisa de retorno hoje. */
export function ReturnColumn({ leadsById, onOpen }: Props) {
  const { due, isLoading } = useDueReturns();
  const late = due.filter(t => whenLabel(t).late).length;

  return (
    <div className="w-56 lg:w-64 shrink-0 h-full flex flex-col min-h-0 rounded-xl border border-primary/30 bg-primary/[0.03]">
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="text-sm font-semibold flex-1">Retorno</span>
          <span
            className={cn(
              'min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums flex items-center justify-center',
              due.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
            aria-label={`${due.length} retornos para hoje`}
          >
            {due.length}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {late > 0 ? `${late} atrasado${late > 1 ? 's' : ''} · ` : ''}
          <Link to="/crc?aba=retorno" className="text-primary hover:underline">ver todos</Link>
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-1.5">
        {!isLoading && due.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhum retorno para hoje</p>
        )}
        {due.map(t => {
          const lead = t.lead_id ? leadsById.get(t.lead_id) : undefined;
          const when = whenLabel(t);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => lead && onOpen(lead)}
              disabled={!lead}
              className="w-full text-left rounded-lg border bg-background px-2.5 py-2 shadow-sm transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
            >
              <p className="text-sm font-medium truncate">{lead?.name ?? t.lead?.name ?? t.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.title}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate tabular-nums text-muted-foreground">{lead?.phone ?? t.lead?.phone ?? ''}</span>
                <span className={cn('shrink-0 font-medium', when.late ? 'text-destructive' : 'text-primary')}>{when.text}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
