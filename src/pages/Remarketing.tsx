import { useState, useMemo, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronRight, 
  RotateCcw,
  Phone, 
  MessageSquare,
  Users, 
  Clock,
  Zap,
  Save,
  Copy,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  useRemarketingEntries, 
  useAdvanceRmktStage, 
  useReturnToComercial,
} from '@/hooks/useRemarketing';
import { useRmktCopyTemplates, useUpdateRmktCopy } from '@/hooks/useRmktCopyTemplates';
import { getScoreColor } from '@/hooks/useLeadScoring';
import { 
  RMKT_STAGES, 
  RMKT_PHASE_CONFIG, 
  type RemarketingPhase, 
  type RemarketingEntry 
} from '@/types/remarketing';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LeadCard } from '@/components/crm/LeadCard';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import type { Lead } from '@/types/crm';

const PHASE_ORIENTATION: Record<RemarketingPhase, { objetivo: string; acao: string }> = {
  aquecimento: {
    objetivo: 'Criar conexão, gerar familiaridade e reduzir resistência inicial',
    acao: 'Conteúdo leve, prova social, educação e quebra de objeções iniciais',
  },
  nutricao: {
    objetivo: 'Fortalecer autoridade e aumentar desejo',
    acao: 'Explicação de tratamentos, benefícios, diferenciais e casos reais',
  },
  reativacao: {
    objetivo: 'Retomar atenção de leads frios',
    acao: 'Reabordagens diretas, perguntas, gatilhos de curiosidade',
  },
  urgencia: {
    objetivo: 'Forçar tomada de decisão',
    acao: 'Escassez, condição especial, urgência e fechamento',
  },
};

function RmktLeadCard({ entry, onAdvance, onReturn, onOpen, index }: {
  entry: RemarketingEntry;
  onAdvance: () => void;
  onReturn: () => void;
  onOpen: (lead: Lead) => void;
  index: number;
}) {
  const lead = entry.lead as unknown as Lead | null;

  // Time-gated advance: compute day gap between current and next stage
  const currentIdx = RMKT_STAGES.findIndex(s => s.key === entry.current_stage);
  const currentStage = RMKT_STAGES[currentIdx];
  const nextStage = currentIdx >= 0 && currentIdx < RMKT_STAGES.length - 1 ? RMKT_STAGES[currentIdx + 1] : null;
  const requiredDays = nextStage && currentStage ? Math.max(1, nextStage.day - currentStage.day) : 0;
  const referenceTs = new Date(entry.last_advanced_at || entry.entered_at).getTime();
  const daysElapsed = Math.floor((Date.now() - referenceTs) / 86400000);
  const canAdvance = !!nextStage && daysElapsed >= requiredDays;
  const daysRemaining = Math.max(0, requiredDays - daysElapsed);

  if (!lead) return null;

  return (
    <div className="space-y-1">
      <LeadCard lead={lead} index={index} onClick={onOpen} />
      {entry.return_count > 0 && (
        <div className="text-[9px] bg-primary/10 text-primary rounded px-1.5 py-0.5">
          ↩️ Retomado em {currentStage?.label} ({entry.return_count}x)
        </div>
      )}
      {nextStage && (
        <div className={cn(
          "text-[9px] rounded px-1.5 py-0.5 text-center font-medium",
          canAdvance ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        )}>
          {canAdvance
            ? `✅ Pode avançar para ${nextStage.label}`
            : `⏳ Avança em ${daysRemaining}d (req. ${requiredDays}d)`}
        </div>
      )}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] flex-1"
          onClick={(e) => { e.stopPropagation(); onAdvance(); }}
          disabled={!canAdvance}
          title={canAdvance ? 'Avançar etapa' : `Aguardar ${daysRemaining} dia(s) para avançar`}
        >
          <ChevronRight className="h-3 w-3 mr-0.5" /> Avançar
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
          onClick={(e) => { e.stopPropagation(); onReturn(); }}
          title="Retornar ao Comercial 1 (mantém histórico)">
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function CopyEditor({ stageKey, suggestedCopy, customCopy, onSave }: {
  stageKey: string;
  suggestedCopy: string;
  customCopy: string | null;
  onSave: (stageKey: string, text: string) => void;
}) {
  const [text, setText] = useState(customCopy || '');
  const [editing, setEditing] = useState(false);
  const displayText = text || suggestedCopy;
  const isCustom = !!text && text !== suggestedCopy;

  return (
    <div className="space-y-1">
      {editing ? (
        <div className="space-y-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={suggestedCopy}
            className="text-[11px] min-h-[60px] resize-none"
          />
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-5 text-[10px] flex-1"
              onClick={() => { onSave(stageKey, text); setEditing(false); }}>
              <Save className="h-2.5 w-2.5 mr-0.5" /> Salvar
            </Button>
            <Button size="sm" variant="ghost" className="h-5 text-[10px]"
              onClick={() => { setText(''); setEditing(false); }}>
              Resetar
            </Button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setEditing(true)}
          className={cn(
            "text-[10px] p-1.5 rounded cursor-pointer border border-dashed transition-colors",
            isCustom 
              ? "border-primary/30 bg-primary/5 text-foreground" 
              : "border-muted-foreground/20 bg-muted/30 text-muted-foreground italic"
          )}
          title="Clique para editar"
        >
          <div className="flex items-center gap-1 mb-0.5">
            {isCustom ? (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">✏️ Personalizada</Badge>
            ) : (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 text-muted-foreground">
                <Copy className="h-2 w-2 mr-0.5" /> Sugestão
              </Badge>
            )}
          </div>
          <p className="line-clamp-2">{displayText}</p>
        </div>
      )}
    </div>
  );
}

export default function Remarketing() {
  const { data: entries = [], isLoading } = useRemarketingEntries();
  const { data: copyTemplates = [] } = useRmktCopyTemplates();
  const advanceMutation = useAdvanceRmktStage();
  const returnMutation = useReturnToComercial();
  const updateCopyMutation = useUpdateRmktCopy();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activePhase, setActivePhase] = useState<RemarketingPhase | 'todos'>('todos');
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    aquecimento: true, nutricao: true, reativacao: true, urgencia: true
  });

  const filteredStages = useMemo(() => {
    if (activePhase === 'todos') return RMKT_STAGES;
    // When filtering by phase, hide empty stages to focus on active leads only
    return RMKT_STAGES.filter(s => s.phase === activePhase && entries.some(e => e.current_stage === s.key));
  }, [activePhase, entries]);

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

  const copyMap = useMemo(() => {
    const map: Record<string, { suggested: string; custom: string | null }> = {};
    copyTemplates.forEach(t => {
      map[t.stage_key] = { suggested: t.suggested_copy, custom: t.custom_copy };
    });
    return map;
  }, [copyTemplates]);

  const handleSaveCopy = useCallback((stageKey: string, text: string) => {
    updateCopyMutation.mutate({ stageKey, customCopy: text });
  }, [updateCopyMutation]);

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  // Group stages by phase for visual separation
  const stagesByPhase = useMemo(() => {
    const phases: { phase: RemarketingPhase; stages: typeof RMKT_STAGES }[] = [];
    const phaseOrder: RemarketingPhase[] = ['aquecimento', 'nutricao', 'reativacao', 'urgencia'];
    
    for (const phase of phaseOrder) {
      const stages = filteredStages.filter(s => s.phase === phase);
      if (stages.length > 0) phases.push({ phase, stages });
    }
    return phases;
  }, [filteredStages]);

  return (
    <AppLayout>
      <div className="space-y-4 p-4 min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Remarketing 365 Dias
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Recuperação contínua de leads não convertidos
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3.5 w-3.5 mr-1" />
            {entries.length} leads ativos
          </Badge>
        </div>

        {/* Phase Filter Cards */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {(Object.keys(RMKT_PHASE_CONFIG) as RemarketingPhase[]).map(phase => {
            const cfg = RMKT_PHASE_CONFIG[phase];
            return (
              <Card 
                key={phase} 
                className={cn(
                  "cursor-pointer transition-all",
                  activePhase === phase ? 'ring-2 ring-primary' : ''
                )}
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

        {/* Kanban Board with Phase Separators */}
        <div className="flex-1 min-h-0 overflow-auto">
          <ScrollArea className="w-full h-full">
            <div className="flex gap-2 pb-4" style={{ minWidth: filteredStages.length * 215 }}>
              {stagesByPhase.map(({ phase, stages }) => {
                const phaseCfg = RMKT_PHASE_CONFIG[phase];
                const orientation = PHASE_ORIENTATION[phase];
                const isExpanded = expandedPhases[phase];

                return (
                  <div key={phase} className="flex gap-0.5">
                    {/* Phase separator header */}
                    <div className={cn(
                      "w-[32px] shrink-0 rounded-lg flex flex-col items-center py-2 gap-1 cursor-pointer",
                      phaseCfg.bgColor
                    )} onClick={() => togglePhase(phase)} title={`${phaseCfg.label}: ${orientation.objetivo}`}>
                      <span className="text-lg">{phaseCfg.emoji}</span>
                      <span className={cn("text-[9px] font-bold writing-vertical", phaseCfg.color)}
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                        {phaseCfg.label.toUpperCase()}
                      </span>
                      {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                    </div>

                    {/* Phase orientation tooltip */}
                    {isExpanded && (
                      <div className="flex gap-2">
                        {stages.map(stage => {
                          const stageEntries = entriesByStage[stage.key] || [];
                          const copy = copyMap[stage.key];

                          return (
                            <div key={stage.key} className="w-[200px] flex-shrink-0">
                              {/* Stage Header */}
                              <div className={cn("rounded-t-lg px-2.5 py-1.5", phaseCfg.bgColor)}>
                                <div className="flex items-center justify-between">
                                  <span className={cn("text-xs font-semibold", phaseCfg.color)}>
                                    {stage.label}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px] h-5">
                                    {stageEntries.length}
                                  </Badge>
                                </div>
                              </div>

                              {/* Copy Template Section */}
                              {copy && (
                                <div className="border-x border-border px-2 py-1.5 bg-muted/20">
                                  <CopyEditor
                                    stageKey={stage.key}
                                    suggestedCopy={copy.suggested}
                                    customCopy={copy.custom}
                                    onSave={handleSaveCopy}
                                  />
                                </div>
                              )}

                              {/* Lead Cards */}
                              <div className="border border-t-0 rounded-b-lg bg-muted/30 min-h-[200px] p-1.5 space-y-1.5">
                                {stageEntries.map((entry, idx) => (
                                  <RmktLeadCard
                                    key={entry.id}
                                    entry={entry}
                                    index={idx}
                                    onOpen={(l) => setSelectedLead(l)}
                                    onAdvance={() => advanceMutation.mutate({ entryId: entry.id, leadId: entry.lead_id })}
                                    onReturn={() => returnMutation.mutate({ entryId: entry.id, leadId: entry.lead_id })}
                                  />
                                ))}
                                {stageEntries.length === 0 && (
                                  <div className="text-center text-[11px] text-muted-foreground py-6">
                                    Sem leads
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Phase Orientation Panel */}
        {activePhase !== 'todos' && (
          <Card className="shrink-0">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {RMKT_PHASE_CONFIG[activePhase].emoji} {RMKT_PHASE_CONFIG[activePhase].label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <strong>Objetivo:</strong> {PHASE_ORIENTATION[activePhase].objetivo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Ação:</strong> {PHASE_ORIENTATION[activePhase].acao}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
