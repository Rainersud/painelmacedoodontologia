import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Search, X, Rows2, Rows3 } from 'lucide-react';
import { useCRMLeads, useUpdateLeadStatus } from '@/hooks/useCRMLeads';
import { LeadCard } from '@/components/crm/LeadCard';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { TodayTasksWidget } from '@/components/dashboard/TodayTasksWidget';
import { SmartAlertsWidget } from '@/components/dashboard/SmartAlertsWidget';
import { AddLeadDialog } from '@/components/crm/AddLeadDialog';
import { LossAnalysisPanel } from '@/components/crm/LossAnalysisPanel';
import { ScheduleAppointmentDialog } from '@/components/crm/ScheduleAppointmentDialog';
import { TriageFormDialog } from '@/components/crm/TriageFormDialog';
import { PaymentDialog } from '@/components/crm/PaymentDialog';
import { FUNNEL_STAGES, type Lead, type LeadStatus } from '@/types/crm';
import { FollowUpCopyPopover } from '@/components/crm/FollowUpCopyPopover';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { normalize, fuzzyMatch } from '@/lib/searchUtils';

const FOLLOWUP_KEYS = new Set([
  'followup_1','followup_2','followup_3','followup_4','followup_5',
  'followup_6','followup_7','followup_8','followup_9',
  'followup_10','followup_11','followup_12','followup_13','followup_14',
]);

// Synced dual-scrollbar Kanban board
interface KanbanBoardProps {
  stages: typeof FUNNEL_STAGES;
  getLeadsByStatus: (status: LeadStatus) => Lead[];
  getTotalBudgetByStatus: (status: LeadStatus) => number;
  dropTargetStatus: LeadStatus | null;
  draggedLeadId: string | null;
  handleDragOver: (e: React.DragEvent, stageKey: LeadStatus) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, newStatus: LeadStatus) => void;
  handleDragStart: (e: React.DragEvent, lead: Lead) => void;
  handleDragEnd: () => void;
  handleOpenDetail: (lead: Lead) => void;
}

function KanbanBoard({
  stages, getLeadsByStatus, getTotalBudgetByStatus,
  dropTargetStatus, draggedLeadId,
  handleDragOver, handleDragLeave, handleDrop,
  handleDragStart, handleDragEnd, handleOpenDetail,
}: KanbanBoardProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);
  const [dense, setDense] = useState<boolean>(() => localStorage.getItem('funil-dense') === '1');
  const syncing = useRef(false);

  const toggleDense = useCallback(() => {
    setDense((prev) => {
      localStorage.setItem('funil-dense', prev ? '0' : '1');
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setInnerWidth(entry.target.scrollWidth);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  const syncScroll = useCallback((source: 'top' | 'bottom') => {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === 'top' ? topScrollRef.current : bottomScrollRef.current;
    const to = source === 'top' ? bottomScrollRef.current : topScrollRef.current;
    if (from && to) to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Densidade da visualização */}
      <div className="shrink-0 flex justify-end px-1 pb-1">
        <Button
          variant={dense ? 'default' : 'outline'}
          size="sm"
          onClick={toggleDense}
          className="h-7 text-[11px] gap-1.5"
        >
          {dense ? <Rows2 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
          {dense ? 'Modo compacto ativo' : 'Modo compacto'}
        </Button>
      </div>

      {/* Top scrollbar */}
      <div
        ref={topScrollRef}
        className="shrink-0 overflow-x-auto overflow-y-hidden"
        style={{ height: 12 }}
        onScroll={() => syncScroll('top')}
      >
        <div style={{ width: innerWidth, height: 1 }} />
      </div>

      {/* Kanban content */}
      <div
        ref={bottomScrollRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scroll-container-x"
        onScroll={() => syncScroll('bottom')}
      >
        <div ref={innerRef} className="flex gap-2 min-w-max h-full pb-2 px-1">
          {stages.map((stage, stageIdx) => {
            const stageLeads = getLeadsByStatus(stage.key);
            const totalValue = getTotalBudgetByStatus(stage.key);
            const isDropTarget = dropTargetStatus === stage.key && draggedLeadId !== null;
            const isFollowUp = FOLLOWUP_KEYS.has(stage.key);
            const isFirstFollowUp = stage.key === 'followup_1';
            const isLastFollowUp = stage.key === 'followup_14';

            return (
              <div key={stage.key} className="flex gap-2 h-full">
                {/* Section separator before first follow-up */}
                {isFirstFollowUp && (
                  <div className="flex flex-col items-center justify-start shrink-0 py-2">
                    <div className="bg-warning/20 text-warning rounded-lg px-2 py-1.5 text-center whitespace-nowrap">
                      <p className="text-[10px] font-bold">🔄 FOLLOW-UP</p>
                      <p className="text-[8px] font-medium">INTELIGENTE</p>
                    </div>
                    <div className="flex-1 w-px bg-warning/30 mt-1" />
                  </div>
                )}

                <div
                  className={cn(
                    "w-56 lg:w-64 flex-shrink-0 flex flex-col min-h-0 h-full",
                  )}
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.key)}
                >
                  <div className={cn(
                    "flex flex-col min-h-0 h-full rounded-xl bg-card border shadow-sm transition-all duration-200",
                    isFollowUp ? 'border-warning/30' : 'border-border/50',
                    isDropTarget && 'ring-2 ring-primary ring-offset-2'
                  )}>
                    {/* Column header */}
                    <div className="shrink-0 px-2 pt-2 pb-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                        <span className="text-[11px] font-semibold flex-1 truncate">
                          {stage.label}
                        </span>
                        {isFollowUp && (
                          <FollowUpCopyPopover stageKey={stage.key} />
                        )}
                        <Badge variant="secondary" className="font-semibold bg-muted text-[10px] h-4 min-w-4 px-1 flex items-center justify-center">
                          {stageLeads.length}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium">
                        {formatCurrency(totalValue)}
                      </p>
                    </div>

                  {/* Column body */}
                  <div className="flex-1 min-h-0 px-1.5 pb-1.5">
                    <div className="h-full overflow-y-auto scroll-container-y space-y-1 pr-0.5">
                      {(() => {
                        const groupsOrder: { key: string; label: string; cls: string }[] = [
                          { key: 'hoje', label: '🟢 Hoje', cls: 'bg-success/10 text-success' },
                          { key: 'ontem', label: '🟡 Ontem', cls: 'bg-warning/10 text-warning' },
                          { key: 'semana', label: '📅 Esta Semana', cls: 'bg-primary/10 text-primary' },
                          { key: 'antigo', label: '📦 Antigos', cls: 'bg-muted text-muted-foreground' },
                        ];
                        const now = Date.now();
                        const categorize = (lead: Lead): string => {
                          const created = new Date(lead.created_at).getTime();
                          const createdDays = Math.floor((now - created) / 86400000);
                          if (createdDays === 0) return 'hoje';
                          if (createdDays === 1) return 'ontem';
                          if (createdDays <= 7) return 'semana';
                          return 'antigo';
                        };
                        const buckets: Record<string, typeof stageLeads> = {};
                        stageLeads.forEach(l => {
                          const k = categorize(l);
                          (buckets[k] ||= []).push(l);
                        });
                        let globalIndex = 0;
                        const rendered: React.ReactNode[] = [];
                        groupsOrder.forEach(g => {
                          const items = buckets[g.key];
                          if (!items || items.length === 0) return;
                          rendered.push(
                            <div key={`hdr-${g.key}`} className={cn("sticky top-0 z-10 rounded-md px-1.5 py-0.5 mt-1 first:mt-0 flex items-center justify-between", g.cls)}>
                              <span className="text-[9px] font-bold uppercase tracking-wide">{g.label}</span>
                              <span className="text-[9px] font-bold">{items.length}</span>
                            </div>
                          );
                          items.forEach(lead => {
                            rendered.push(
                              <div
                                key={lead.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, lead)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  "cursor-grab active:cursor-grabbing",
                                  draggedLeadId === lead.id && 'opacity-40'
                                )}
                              >
                                <LeadCard lead={lead} onClick={handleOpenDetail} compact dense={dense} index={globalIndex++} />
                              </div>
                            );
                          });
                        });
                        if (stageLeads.length === 0) {
                          rendered.push(
                            <div
                              key="empty"
                              className={cn(
                                "text-center py-6 rounded-lg",
                                stage.bgColor,
                                isDropTarget && 'border-2 border-dashed border-primary'
                              )}
                            >
                              <p className="text-[10px] text-muted-foreground">
                                {isDropTarget ? 'Solte aqui' : 'Nenhum contato'}
                              </p>
                            </div>
                          );
                        }
                        return rendered;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section separator after last follow-up */}
              {isLastFollowUp && (
                <div className="flex flex-col items-center justify-start shrink-0 py-2">
                  <div className="flex-1 w-px bg-warning/30" />
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const Funil = () => { // v2
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: leads, isLoading } = useCRMLeads();
  const updateStatus = useUpdateLeadStatus();
  
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<LeadStatus | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  // Auto-open lead from URL query param (e.g. from Alerts)
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId && leads && leads.length > 0) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        setDialogOpen(true);
        // Clean up the URL param
        searchParams.delete('leadId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [leads, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedLead?.id || !leads) return;
    const freshLead = leads.find(l => l.id === selectedLead.id);
    if (freshLead && freshLead.updated_at !== selectedLead.updated_at) {
      setSelectedLead(freshLead);
    }
  }, [leads, selectedLead?.id, selectedLead?.updated_at]);
  
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pendingScheduleLead, setPendingScheduleLead] = useState<Lead | null>(null);
  const [triageDialogOpen, setTriageDialogOpen] = useState(false);
  const [triageLead, setTriageLead] = useState<Lead | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentLead, setPaymentLead] = useState<Lead | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [treatmentFilter, setTreatmentFilter] = useState<string>('all');
  // Filtro de período padronizado com a Dashboard: all | hoje | semana | mes
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [smartCategory, setSmartCategory] = useState<string>('all');

  // Stages affected by date filter (agendamento e comparecimento)
  const dateFilteredStages: LeadStatus[] = ['agendou', 'consulta_agendada', 'compareceu'];

  const getFilterRange = useCallback((): { start: Date; end: Date } | null => {
    if (dateFilter === 'all') return null;
    const now = new Date();
    if (dateFilter === 'hoje') return { start: startOfDay(now), end: endOfDay(now) };
    if (dateFilter === 'semana') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    if (dateFilter === 'mes') return { start: startOfMonth(now), end: endOfMonth(now) };
    return null;
  }, [dateFilter]);

  // Smart visual categorization helpers (apenas hoje/ontem/semana — sem alertas)
  const matchesSmartCategory = useCallback((lead: Lead, cat: string): boolean => {
    if (cat === 'all') return true;
    const now = Date.now();
    const created = new Date(lead.created_at).getTime();
    const createdDays = Math.floor((now - created) / 86400000);
    switch (cat) {
      case 'hoje': return createdDays === 0;
      case 'ontem': return createdDays === 1;
      case 'semana': return createdDays >= 0 && createdDays <= 7;
      default: return true;
    }
  }, []);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    const range = getFilterRange();

    return leads.filter(lead => {
      const query = searchQuery.trim();
      const digitsQ = query.replace(/\D/g, '');
      const matchesSearch = !query ||
        fuzzyMatch(lead.name, query) ||
        (digitsQ.length > 0 && lead.phone.replace(/\D/g, '').includes(digitsQ)) ||
        (lead.interest_product && fuzzyMatch(lead.interest_product, query));
      const matchesTreatment = treatmentFilter === 'all' || lead.interest_product === treatmentFilter;

      // Date filter (range): only applies to agendou/consulta_agendada/compareceu
      let matchesDate = true;
      if (range && dateFilteredStages.includes(lead.status)) {
        const refDate = lead.status === 'compareceu'
          ? (lead.stage_entered_at || lead.updated_at)
          : (lead.scheduled_appointment_at || lead.stage_entered_at || lead.updated_at);
        if (refDate) {
          const t = new Date(refDate).getTime();
          matchesDate = t >= range.start.getTime() && t <= range.end.getTime();
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesTreatment && matchesDate && matchesSmartCategory(lead, smartCategory);
    });
  }, [leads, searchQuery, treatmentFilter, getFilterRange, smartCategory, matchesSmartCategory]);

  // Counts per smart category (against base + search/treatment but ignoring smart filter)
  const smartCounts = useMemo(() => {
    const base = (leads || []).filter(lead => {
      const query = searchQuery.trim();
      const digitsQ = query.replace(/\D/g, '');
      const matchesSearch = !query ||
        fuzzyMatch(lead.name, query) ||
        (digitsQ.length > 0 && lead.phone.replace(/\D/g, '').includes(digitsQ)) ||
        (lead.interest_product && fuzzyMatch(lead.interest_product, query));
      const matchesTreatment = treatmentFilter === 'all' || lead.interest_product === treatmentFilter;
      return matchesSearch && matchesTreatment;
    });
    const cats = ['hoje','ontem','semana'];
    const out: Record<string, number> = { all: base.length };
    cats.forEach(c => { out[c] = base.filter(l => matchesSmartCategory(l, c)).length; });
    return out;
  }, [leads, searchQuery, treatmentFilter, matchesSmartCategory]);


  const handleDragStart = useCallback((e: React.DragEvent, lead: Lead) => {
    setDraggedLeadId(lead.id);
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageKey: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetStatus(stageKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDropTargetStatus(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    e.stopPropagation();
    
    const leadId = e.dataTransfer.getData('text/plain');
    const lead = leads?.find(l => l.id === leadId);
    
    if (lead && lead.status !== newStatus) {
      if (newStatus === 'fechado') {
        const { count } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .eq('status', 'pago');
        
        if (!count || count === 0) {
          setPaymentLead(lead);
          setPaymentDialogOpen(true);
          toast.info('Registre o pagamento para concluir a venda.');
          setDraggedLeadId(null);
          setDropTargetStatus(null);
          return;
        }
      }

      if (newStatus === 'nao_cliente') {
        // Open lead detail so user can fill in the loss_reason
        setSelectedLead(lead);
        setDialogOpen(true);
        toast.info('Preencha o motivo de não fechamento na aba Status.');
        setDraggedLeadId(null);
        setDropTargetStatus(null);
        return;
      }

      if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        setPendingScheduleLead(lead);
        setScheduleDialogOpen(true);
      } else if (newStatus === 'compareceu') {
        updateStatus.mutate({ leadId: lead.id, newStatus }, {
          onSuccess: () => {
            setTriageLead(lead);
            setTriageDialogOpen(true);
            setPaymentLead(lead);
            setPaymentDialogOpen(true);
          },
        });
      } else {
        updateStatus.mutate({ leadId: lead.id, newStatus });
      }
    }
    
    setDraggedLeadId(null);
    setDropTargetStatus(null);
  }, [leads, updateStatus]);

  const handleScheduleConfirm = useCallback((scheduledAt: string) => {
    if (!pendingScheduleLead) return;
    updateStatus.mutate({
      leadId: pendingScheduleLead.id,
      newStatus: 'agendou',
      additionalData: { scheduled_appointment_at: scheduledAt },
    }, {
      onSuccess: () => {
        setScheduleDialogOpen(false);
        setPendingScheduleLead(null);
      },
    });
  }, [pendingScheduleLead, updateStatus]);

  const handleDragEnd = useCallback(() => {
    setDraggedLeadId(null);
    setDropTargetStatus(null);
  }, []);

  const handleOpenDetail = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  }, []);

  const getLeadsByStatus = useCallback((status: LeadStatus) => {
    return filteredLeads.filter(lead => lead.status === status);
  }, [filteredLeads]);

  const getTotalBudgetByStatus = useCallback((status: LeadStatus) => {
    return getLeadsByStatus(status).reduce((sum, lead) => 
      sum + (lead.treatment_value || 0), 0
    );
  }, [getLeadsByStatus]);

  if (isLoading) {
    return (
      <AppLayout title="Comercial 1 – Aquisição">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Comercial 1 – Aquisição">
      {/* The entire funnel page */}
      <div className="flex flex-col min-h-0">
        {/* Operational command center — above search, below page title */}
        <div className="shrink-0 space-y-4 mb-4">
          <TodayTasksWidget />
          <SmartAlertsWidget />
        </div>

        {/* Fixed header area — never scrolls */}
        <div className="shrink-0 flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredLeads.length} contatos no funil
              {searchQuery || treatmentFilter !== 'all' ? ` (de ${leads?.length || 0})` : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => setAddLeadOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Lead
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar (ignora acentos: jose = josé)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {searchQuery.trim().length >= 1 && (() => {
                const q = searchQuery.trim();
                const suggestions = (leads || [])
                  .filter(l => fuzzyMatch(l.name, q))
                  .slice(0, 8);
                if (suggestions.length === 0) return null;
                // Don't show if exactly one match equals current query
                if (suggestions.length === 1 && normalize(suggestions[0].name) === normalize(q)) return null;
                return (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-lg max-h-72 overflow-y-auto">
                    {suggestions.map(s => {
                      const stage = FUNNEL_STAGES.find(st => st.key === s.status);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleOpenDetail(s);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-2 text-sm border-b last:border-0"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{s.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{s.phone}</span>
                          </div>
                          {stage && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">{stage.label}</Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="Tratamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tratamentos</SelectItem>
                <SelectItem value="implante">Implante</SelectItem>
                <SelectItem value="protese_flexivel">Prótese Flexível</SelectItem>
                <SelectItem value="protese_total">Prótese Total</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter — padrão Dashboard: Hoje / Semana / Mês */}
            <Tabs value={dateFilter} onValueChange={setDateFilter}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="h-7 text-xs px-3">Todos</TabsTrigger>
                <TabsTrigger value="hoje" className="h-7 text-xs px-3">Hoje</TabsTrigger>
                <TabsTrigger value="semana" className="h-7 text-xs px-3">Semana</TabsTrigger>
                <TabsTrigger value="mes" className="h-7 text-xs px-3">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Smart visual category chips — apenas Hoje / Ontem / Esta Semana */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'all', label: 'Todos', cls: 'bg-muted text-foreground' },
              { key: 'hoje', label: '🟢 Hoje', cls: 'bg-success/10 text-success' },
              { key: 'ontem', label: '🟡 Ontem', cls: 'bg-warning/10 text-warning' },
              { key: 'semana', label: '📅 Esta Semana', cls: 'bg-primary/10 text-primary' },
            ].map(c => {
              const active = smartCategory === c.key;
              const count = smartCounts[c.key] ?? 0;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSmartCategory(c.key)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all",
                    active ? "border-primary ring-1 ring-primary shadow-sm" : "border-border hover:border-primary/50",
                    c.cls
                  )}
                >
                  {c.label}
                  <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-background/70 px-1.5 text-[10px] font-bold min-w-[18px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Kanban board with synced top scrollbar */}
        <KanbanBoard
          stages={(() => {
            const anyFilterActive = !!searchQuery.trim() || treatmentFilter !== 'all' || dateFilter !== 'all' || smartCategory !== 'all';
            if (!anyFilterActive) return FUNNEL_STAGES;
            return FUNNEL_STAGES.filter(s => getLeadsByStatus(s.key).length > 0);
          })()}
          getLeadsByStatus={getLeadsByStatus}
          getTotalBudgetByStatus={getTotalBudgetByStatus}
          dropTargetStatus={dropTargetStatus}
          draggedLeadId={draggedLeadId}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleOpenDetail={handleOpenDetail}
        />

        {/* Loss Analysis Panel */}
        <div className="mt-6">
          <LossAnalysisPanel />
        </div>
      </div>

      <LeadDetailDialog
        lead={selectedLead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
      />
      <ScheduleAppointmentDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setPendingScheduleLead(null);
        }}
        leadName={pendingScheduleLead?.name || ''}
        onConfirm={handleScheduleConfirm}
        isPending={updateStatus.isPending}
      />
      <TriageFormDialog
        lead={triageLead}
        open={triageDialogOpen}
        onOpenChange={(open) => {
          setTriageDialogOpen(open);
          if (!open) setTriageLead(null);
        }}
      />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) setPaymentLead(null);
        }}
        leadId={paymentLead?.id || ''}
        leadName={paymentLead?.name || ''}
        budgetValue={paymentLead?.treatment_value || 0}
      />
    </AppLayout>
  );
};

export default Funil;
