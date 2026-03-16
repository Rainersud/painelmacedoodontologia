import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useCRMLeads, useUpdateLeadStatus } from '@/hooks/useCRMLeads';
import { LeadCard } from '@/components/crm/LeadCard';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { AddLeadDialog } from '@/components/crm/AddLeadDialog';
import { ScheduleAppointmentDialog } from '@/components/crm/ScheduleAppointmentDialog';
import { TriageFormDialog } from '@/components/crm/TriageFormDialog';
import { FUNNEL_STAGES, type Lead, type LeadStatus } from '@/types/crm';
import { cn } from '@/lib/utils';

const Funil = () => {
  const { data: leads, isLoading } = useCRMLeads();
  const updateStatus = useUpdateLeadStatus();
  
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<LeadStatus | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  
  // Scheduling dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pendingScheduleLead, setPendingScheduleLead] = useState<Lead | null>(null);

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

  const handleDrop = useCallback((e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    e.stopPropagation();
    
    const leadId = e.dataTransfer.getData('text/plain');
    const lead = leads?.find(l => l.id === leadId);
    
    if (lead && lead.status !== newStatus) {
      // If dropping to "agendou", open schedule dialog
      if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        setPendingScheduleLead(lead);
        setScheduleDialogOpen(true);
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
    return leads?.filter(lead => lead.status === status) || [];
  }, [leads]);

  const getTotalValueByStatus = useCallback((status: LeadStatus) => {
    return getLeadsByStatus(status).reduce((sum, lead) => 
      sum + (lead.treatment_value || lead.estimated_value || 0), 0
    );
  }, [getLeadsByStatus]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <AppLayout title="Funil de Vendas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Funil de Vendas">
      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {leads?.length || 0} contatos no funil
        </p>
        <Button onClick={() => setAddLeadOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Lead
        </Button>
      </div>

      <div className="h-[calc(100vh-10rem)] overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {FUNNEL_STAGES.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.key);
            const totalValue = getTotalValueByStatus(stage.key);
            const isDropTarget = dropTargetStatus === stage.key && draggedLeadId !== null;
            
            return (
              <div 
                key={stage.key}
                className="w-72 flex-shrink-0"
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <Card className={cn(
                  "border-0 shadow-sm h-full transition-all duration-200",
                  isDropTarget && 'ring-2 ring-primary ring-offset-2'
                )}>
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                      <CardTitle className="text-xs font-semibold flex-1 truncate">
                        {stage.label}
                      </CardTitle>
                      <Badge variant="secondary" className="font-semibold bg-muted text-xs h-5 min-w-5 flex items-center justify-center">
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {formatCurrency(totalValue)}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 px-2 pb-2">
                    <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
                      {stageLeads.map((lead) => (
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
                          />
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div 
                          className={cn(
                            "text-center py-8 rounded-lg",
                            stage.bgColor,
                            isDropTarget && 'border-2 border-dashed border-primary'
                          )}
                        >
                          <p className="text-xs text-muted-foreground">
                            {isDropTarget ? 'Solte aqui' : 'Nenhum contato'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
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
    </AppLayout>
  );
};

export default Funil;
