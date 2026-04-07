import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isYesterday, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Search, X, CalendarIcon } from 'lucide-react';
import { useCRMLeads, useUpdateLeadStatus } from '@/hooks/useCRMLeads';
import { FunnelActivityFilter } from '@/components/crm/FunnelActivityFilter';
import { LeadCard } from '@/components/crm/LeadCard';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { AddLeadDialog } from '@/components/crm/AddLeadDialog';
import { LossAnalysisPanel } from '@/components/crm/LossAnalysisPanel';
import { ScheduleAppointmentDialog } from '@/components/crm/ScheduleAppointmentDialog';
import { TriageFormDialog } from '@/components/crm/TriageFormDialog';
import { PaymentDialog } from '@/components/crm/PaymentDialog';
import { FUNNEL_STAGES, type Lead, type LeadStatus } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

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
  const syncing = useRef(false);

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
          {stages.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.key);
            const totalValue = getTotalBudgetByStatus(stage.key);
            const isDropTarget = dropTargetStatus === stage.key && draggedLeadId !== null;

            return (
              <div
                key={stage.key}
                className="w-56 lg:w-64 flex-shrink-0 flex flex-col min-h-0 h-full"
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className={cn(
                  "flex flex-col min-h-0 h-full rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200",
                  isDropTarget && 'ring-2 ring-primary ring-offset-2'
                )}>
                  {/* Column header */}
                  <div className="shrink-0 px-2 pt-2 pb-1.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                      <span className="text-[11px] font-semibold flex-1 truncate">
                        {stage.label}
                      </span>
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
                      {stageLeads.map((lead, index) => (
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
                          <LeadCard
                            lead={lead}
                            onClick={handleOpenDetail}
                            compact
                            index={index}
                          />
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div
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
                      )}
                    </div>
                  </div>
                </div>
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
  
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pendingScheduleLead, setPendingScheduleLead] = useState<Lead | null>(null);
  const [triageDialogOpen, setTriageDialogOpen] = useState(false);
  const [triageLead, setTriageLead] = useState<Lead | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentLead, setPaymentLead] = useState<Lead | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [treatmentFilter, setTreatmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('none');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  // Stages affected by date filter
  const dateFilteredStages: LeadStatus[] = ['agendou', 'consulta_agendada', 'compareceu'];

  const getFilterDate = useCallback((): Date | null => {
    if (dateFilter === 'none') return null;
    if (dateFilter === 'today') return new Date();
    if (dateFilter === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); return d; }
    if (dateFilter === 'yesterday') { const d = new Date(); d.setDate(d.getDate() - 1); return d; }
    if (dateFilter === 'custom' && customDate) return customDate;
    return null;
  }, [dateFilter, customDate]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    const filterDate = getFilterDate();
    
    return leads.filter(lead => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.interest_product && lead.interest_product.toLowerCase().includes(query));
      const matchesTreatment = treatmentFilter === 'all' || lead.interest_product === treatmentFilter;
      
      // Date filter: only applies to agendou/consulta_agendada/compareceu
      let matchesDate = true;
      if (filterDate && dateFilteredStages.includes(lead.status)) {
        const refDate = lead.status === 'compareceu' 
          ? (lead.stage_entered_at || lead.updated_at)
          : (lead.scheduled_appointment_at || lead.stage_entered_at || lead.updated_at);
        if (refDate) {
          matchesDate = isSameDay(new Date(refDate), filterDate);
        } else {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesTreatment && matchesDate;
    });
  }, [leads, searchQuery, treatmentFilter, getFilterDate]);

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
        {/* Fixed header area — never scrolls */}
        <div className="shrink-0 flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredLeads.length} contatos no funil
              {searchQuery || treatmentFilter !== 'all' ? ` (de ${leads?.length || 0})` : ''}
            </p>
            <div className="flex items-center gap-2">
              <FunnelActivityFilter onLeadClick={(leadId) => {
                const lead = leads?.find(l => l.id === leadId);
                if (lead) handleOpenDetail(lead);
              }} />
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
                placeholder="Buscar por nome ou telefone..."
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

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => {
              setDateFilter(v);
              if (v !== 'custom') setCustomDate(undefined);
            }}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas as datas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="tomorrow">Amanhã</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="custom">Selecionar data...</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {customDate ? format(customDate, 'dd/MM/yyyy') : 'Escolher'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            )}
            {dateFilter !== 'none' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => { setDateFilter('none'); setCustomDate(undefined); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Kanban board with synced top scrollbar */}
        <KanbanBoard
          stages={FUNNEL_STAGES}
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
