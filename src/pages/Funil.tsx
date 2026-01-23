import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useCRMLeads, useUpdateLeadStatus } from '@/hooks/useCRMLeads';
import { LeadCard } from '@/components/crm/LeadCard';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { FUNNEL_STAGES, type Lead, type LeadStatus } from '@/types/crm';
import { cn } from '@/lib/utils';

const Funil = () => {
  const { data: leads, isLoading } = useCRMLeads();
  const updateStatus = useUpdateLeadStatus();
  
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    
    if (draggedLead && draggedLead.status !== newStatus) {
      updateStatus.mutate({ leadId: draggedLead.id, newStatus });
    }
    
    setDraggedLead(null);
  }, [draggedLead, updateStatus]);

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
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
      <div className="h-[calc(100vh-8rem)] overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {FUNNEL_STAGES.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.key);
            const totalValue = getTotalValueByStatus(stage.key);
            const isDropTarget = draggedLead && draggedLead.status !== stage.key;
            
            return (
              <div 
                key={stage.key}
                className="w-72 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
                onDragEnd={handleDragEnd}
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
                    <div className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
                      {stageLeads.map((lead) => (
                        <LeadCard 
                          key={lead.id} 
                          lead={lead} 
                          onDragStart={handleDragStart}
                          onClick={handleOpenDetail}
                          compact
                        />
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
                            {isDropTarget ? 'Solte aqui' : 'Nenhum lead'}
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
    </AppLayout>
  );
};

export default Funil;
