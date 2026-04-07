import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  RotateCcw, 
  Phone, 
  MessageSquare, 
  ChevronRight, 
  Users, 
  Clock,
  Zap
} from 'lucide-react';
import { 
  useRemarketingEntries, 
  useAdvanceRmktStage, 
  useReturnToComercial, 
  useMoveRmktStage 
} from '@/hooks/useRemarketing';
import { 
  RMKT_STAGES, 
  RMKT_PHASE_CONFIG, 
  type RemarketingPhase, 
  type RemarketingEntry 
} from '@/types/remarketing';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function RmktLeadCard({ entry, onAdvance, onReturn }: { 
  entry: RemarketingEntry; 
  onAdvance: () => void; 
  onReturn: () => void;
}) {
  const lead = entry.lead;
  const enteredAgo = formatDistanceToNow(new Date(entry.entered_at), { addSuffix: true, locale: ptBR });

  return (
    <div className="p-2.5 rounded-lg border border-border bg-card hover:shadow-md transition-shadow space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-sm font-medium truncate">{lead?.name || 'Lead'}</span>
        {entry.return_count > 0 && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            🔁 {entry.return_count}x
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Phone className="h-3 w-3" />
        <span className="truncate">{lead?.phone}</span>
      </div>
      {lead?.interest_product && (
        <div className="text-[11px] text-muted-foreground truncate">
          💊 {lead.interest_product}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {enteredAgo}
      </div>
      <div className="flex gap-1 pt-1">
        <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1" onClick={onAdvance}>
          <ChevronRight className="h-3 w-3 mr-0.5" /> Avançar
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={onReturn}>
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function Remarketing() {
  const { data: entries = [], isLoading } = useRemarketingEntries();
  const advanceMutation = useAdvanceRmktStage();
  const returnMutation = useReturnToComercial();
  const [activePhase, setActivePhase] = useState<RemarketingPhase | 'todos'>('todos');

  const filteredStages = useMemo(() => {
    if (activePhase === 'todos') return RMKT_STAGES;
    return RMKT_STAGES.filter(s => s.phase === activePhase);
  }, [activePhase]);

  const entriesByStage = useMemo(() => {
    const map: Record<string, RemarketingEntry[]> = {};
    for (const stage of RMKT_STAGES) {
      map[stage.key] = entries.filter(e => e.current_stage === stage.key);
    }
    return map;
  }, [entries]);

  const phaseStats = useMemo(() => {
    const stats: Record<string, number> = { aquecimento: 0, nutricao: 0, reativacao: 0, urgencia: 0 };
    entries.forEach(e => {
      const phase = RMKT_STAGES.find(s => s.key === e.current_stage)?.phase;
      if (phase) stats[phase]++;
    });
    return stats;
  }, [entries]);

  return (
    <AppLayout>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Remarketing 365 Dias
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Recuperação contínua de leads não convertidos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              <Users className="h-3.5 w-3.5 mr-1" />
              {entries.length} leads ativos
            </Badge>
          </div>
        </div>

        {/* Phase Stats */}
        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(RMKT_PHASE_CONFIG) as RemarketingPhase[]).map(phase => {
            const cfg = RMKT_PHASE_CONFIG[phase];
            return (
              <Card 
                key={phase} 
                className={`cursor-pointer transition-all ${activePhase === phase ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setActivePhase(activePhase === phase ? 'todos' : phase)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cfg.emoji} {cfg.label}</span>
                    <Badge variant="outline">{phaseStats[phase]}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kanban Board */}
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-4" style={{ minWidth: filteredStages.length * 220 }}>
            {filteredStages.map(stage => {
              const stageEntries = entriesByStage[stage.key] || [];
              const phaseCfg = RMKT_PHASE_CONFIG[stage.phase];

              return (
                <div key={stage.key} className="w-[210px] flex-shrink-0">
                  <div className={`rounded-t-lg px-3 py-2 ${phaseCfg.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${phaseCfg.color}`}>
                        {stage.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {stageEntries.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="border border-t-0 rounded-b-lg bg-muted/30 min-h-[300px] p-2 space-y-2">
                    {stageEntries.map(entry => (
                      <RmktLeadCard
                        key={entry.id}
                        entry={entry}
                        onAdvance={() => advanceMutation.mutate({ entryId: entry.id, leadId: entry.lead_id })}
                        onReturn={() => returnMutation.mutate({ entryId: entry.id, leadId: entry.lead_id })}
                      />
                    ))}
                    {stageEntries.length === 0 && (
                      <div className="text-center text-[11px] text-muted-foreground py-8">
                        Sem leads
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
