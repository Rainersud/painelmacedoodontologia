import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Calendar, User, Clock, DollarSign, Loader2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeadEvolutionDialog } from '@/components/leads/LeadEvolutionDialog';
import type { Database } from '@/integrations/supabase/types';

type LeadStatus = Database['public']['Enums']['lead_status'];
type LeadSource = Database['public']['Enums']['lead_source'];

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_agent_id: string | null;
  created_at: string;
  estimated_value: number | null;
  profiles?: { full_name: string } | null;
}

const funnelStages: { key: LeadStatus; label: string; color: string; bgColor: string }[] = [
  { key: 'novo_lead', label: 'Novo Lead', color: 'bg-chart-2', bgColor: 'bg-chart-2/10' },
  { key: 'em_atendimento', label: 'Em Atendimento', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'consulta_agendada', label: 'Consulta Agendada', color: 'bg-primary', bgColor: 'bg-primary/10' },
  { key: 'confirmado', label: 'Confirmado', color: 'bg-success', bgColor: 'bg-success/10' },
  { key: 'compareceu', label: 'Compareceu', color: 'bg-success', bgColor: 'bg-success/20' },
  { key: 'nao_compareceu', label: 'Não Compareceu', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  { key: 'resgatado', label: 'Resgatado', color: 'bg-chart-5', bgColor: 'bg-chart-5/10' },
  { key: 'fechado', label: 'Fechado', color: 'bg-success', bgColor: 'bg-success/30' },
  { key: 'nao_convertido', label: 'Não Convertido', color: 'bg-muted-foreground', bgColor: 'bg-muted' },
];

const sourceColors: Record<string, string> = {
  'whatsapp': 'bg-success/10 text-success',
  'telefone': 'bg-chart-2/10 text-chart-2',
  'instagram': 'bg-chart-5/10 text-chart-5',
  'facebook': 'bg-primary/10 text-primary',
  'google_ads': 'bg-warning/10 text-warning',
  'indicacao': 'bg-primary/10 text-primary',
  'site': 'bg-muted text-muted-foreground',
  'outro': 'bg-muted text-muted-foreground',
};

const sourceLabels: Record<string, string> = {
  'whatsapp': 'WhatsApp',
  'telefone': 'Telefone',
  'instagram': 'Instagram',
  'facebook': 'Facebook',
  'google_ads': 'Google Ads',
  'indicacao': 'Indicação',
  'site': 'Site',
  'outro': 'Outro',
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
};

const LeadCard = ({ 
  lead, 
  onDragStart,
  onOpenEvolution,
}: { 
  lead: Lead; 
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onOpenEvolution: (lead: Lead) => void;
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card 
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => onOpenEvolution(lead)}
      className="mb-3 cursor-pointer hover:shadow-lg transition-all duration-200 active:cursor-grabbing border-0 shadow-sm group"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm">{lead.name}</p>
              <p className="text-xs text-muted-foreground">{lead.phone}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`text-[10px] font-medium border-0 ${sourceColors[lead.source] || 'bg-muted text-muted-foreground'}`}
          >
            {sourceLabels[lead.source] || lead.source}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>{lead.profiles?.full_name || 'Sem agente'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimeAgo(lead.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="font-bold text-sm text-foreground">
              {formatCurrency(lead.estimated_value || 0)}
            </span>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEvolution(lead);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${lead.phone}`, '_blank');
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-success/10 hover:text-success"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-chart-2/10 hover:text-chart-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Funil = () => {
  const queryClient = useQueryClient();
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [evolutionDialogOpen, setEvolutionDialogOpen] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['funnel-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch agent names separately
      const agentIds = [...new Set(data?.map(l => l.assigned_agent_id).filter(Boolean))];
      
      let agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds);
        
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      return data?.map(lead => ({
        ...lead,
        profiles: lead.assigned_agent_id ? { full_name: agentMap[lead.assigned_agent_id] || 'Sem agente' } : null,
      })) as Lead[];
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: string; newStatus: LeadStatus }) => {
      const updates: Record<string, unknown> = { status: newStatus };
      
      // Add timestamp fields based on status
      if (newStatus === 'resgatado') {
        updates.rescued_at = new Date().toISOString();
      } else if (newStatus === 'fechado') {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead movido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao mover lead');
    },
  });

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    
    if (draggedLead && draggedLead.status !== newStatus) {
      updateLeadStatus.mutate({ leadId: draggedLead.id, newStatus });
    }
    
    setDraggedLead(null);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
  };

  const handleOpenEvolution = (lead: Lead) => {
    setSelectedLead(lead);
    setEvolutionDialogOpen(true);
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads?.filter(lead => lead.status === status) || [];
  };

  const getTotalValueByStatus = (status: LeadStatus) => {
    return getLeadsByStatus(status).reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
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
        <div className="flex gap-5 min-w-max pb-4">
          {funnelStages.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.key);
            const totalValue = getTotalValueByStatus(stage.key);
            const isDropTarget = draggedLead && draggedLead.status !== stage.key;
            
            return (
              <div 
                key={stage.key}
                className="w-80 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <Card className={`border-0 shadow-sm h-full transition-all duration-200 ${
                  isDropTarget ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                      <CardTitle className="text-sm font-semibold flex-1">
                        {stage.label}
                      </CardTitle>
                      <Badge variant="secondary" className="font-semibold bg-muted">
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Total: {formatCurrency(totalValue)}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-0 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
                      {stageLeads.map((lead) => (
                        <LeadCard 
                          key={lead.id} 
                          lead={lead} 
                          onDragStart={handleDragStart}
                          onOpenEvolution={handleOpenEvolution}
                        />
                      ))}
                      {stageLeads.length === 0 && (
                        <div 
                          className={`text-center py-10 rounded-xl ${stage.bgColor} ${
                            isDropTarget ? 'border-2 border-dashed border-primary' : ''
                          }`}
                          onDragEnd={handleDragEnd}
                        >
                          <p className="text-sm text-muted-foreground">
                            {isDropTarget ? 'Solte aqui' : 'Nenhum lead nesta etapa'}
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

      <LeadEvolutionDialog
        lead={selectedLead}
        open={evolutionDialogOpen}
        onOpenChange={setEvolutionDialogOpen}
      />
    </AppLayout>
  );
};

export default Funil;