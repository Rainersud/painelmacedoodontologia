import { useStageHistory } from '@/hooks/useStageHistory';
import { FUNNEL_STAGES } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StageHistoryPanelProps {
  leadId: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'aguardando';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function StageHistoryPanel({ leadId }: StageHistoryPanelProps) {
  const { data: history, isLoading } = useStageHistory(leadId);

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (!history?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum histórico de movimentação registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Histórico do Funil
      </h4>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 font-medium">Etapa</th>
              <th className="text-left p-2 font-medium">Entrada</th>
              <th className="text-left p-2 font-medium">Saída</th>
              <th className="text-left p-2 font-medium">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, i) => {
              const stageConfig = FUNNEL_STAGES.find(s => s.key === entry.stage);
              const isActive = !entry.exited_at;
              return (
                <tr key={entry.id} className={cn("border-t", isActive && "bg-primary/5")}>
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-2 w-2 rounded-full", stageConfig?.color || 'bg-muted')} />
                      <span className="font-medium">{stageConfig?.label || entry.stage}</span>
                    </div>
                  </td>
                  <td className="p-2 text-muted-foreground">{formatDate(entry.entered_at)}</td>
                  <td className="p-2 text-muted-foreground">{entry.exited_at ? formatDate(entry.exited_at) : '—'}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={cn(
                      "text-[10px] border-0",
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {isActive ? '⏳ aguardando' : formatDuration(entry.duration_seconds)}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
