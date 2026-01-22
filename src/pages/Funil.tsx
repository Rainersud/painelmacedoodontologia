import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Calendar, User, Clock, DollarSign } from 'lucide-react';

type LeadStatus = 
  | 'novo_lead'
  | 'em_atendimento'
  | 'consulta_agendada'
  | 'confirmado'
  | 'compareceu'
  | 'nao_compareceu'
  | 'nao_convertido';

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: LeadStatus;
  agent: string;
  createdAt: string;
  estimatedValue: number;
}

const funnelStages: { key: LeadStatus; label: string; color: string; bgColor: string }[] = [
  { key: 'novo_lead', label: 'Novo Lead', color: 'bg-chart-2', bgColor: 'bg-chart-2/10' },
  { key: 'em_atendimento', label: 'Em Atendimento', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'consulta_agendada', label: 'Consulta Agendada', color: 'bg-primary', bgColor: 'bg-primary/10' },
  { key: 'confirmado', label: 'Confirmado', color: 'bg-success', bgColor: 'bg-success/10' },
  { key: 'compareceu', label: 'Compareceu', color: 'bg-success', bgColor: 'bg-success/20' },
  { key: 'nao_compareceu', label: 'Não Compareceu', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  { key: 'nao_convertido', label: 'Não Convertido', color: 'bg-muted-foreground', bgColor: 'bg-muted' },
];

const mockLeads: Lead[] = [
  { id: '1', name: 'Maria Silva', phone: '(11) 99999-1234', source: 'WhatsApp', status: 'novo_lead', agent: 'João Santos', createdAt: '10 min', estimatedValue: 2500 },
  { id: '2', name: 'Carlos Lima', phone: '(11) 98888-5678', source: 'Telefone', status: 'novo_lead', agent: 'Ana Costa', createdAt: '25 min', estimatedValue: 1800 },
  { id: '3', name: 'Pedro Oliveira', phone: '(11) 97777-9012', source: 'Instagram', status: 'em_atendimento', agent: 'João Santos', createdAt: '1h', estimatedValue: 3200 },
  { id: '4', name: 'Juliana Alves', phone: '(11) 96666-3456', source: 'Google Ads', status: 'em_atendimento', agent: 'Maria Fernanda', createdAt: '2h', estimatedValue: 4500 },
  { id: '5', name: 'Ana Costa', phone: '(11) 95555-7890', source: 'Indicação', status: 'consulta_agendada', agent: 'Ana Costa', createdAt: '1 dia', estimatedValue: 2100 },
  { id: '6', name: 'Roberto Santos', phone: '(11) 94444-1234', source: 'WhatsApp', status: 'consulta_agendada', agent: 'João Santos', createdAt: '1 dia', estimatedValue: 3800 },
  { id: '7', name: 'Fernanda Lima', phone: '(11) 93333-5678', source: 'Site', status: 'confirmado', agent: 'Maria Fernanda', createdAt: '2 dias', estimatedValue: 5200 },
  { id: '8', name: 'Bruno Almeida', phone: '(11) 92222-9012', source: 'Telefone', status: 'compareceu', agent: 'Ana Costa', createdAt: '3 dias', estimatedValue: 4100 },
  { id: '9', name: 'Camila Rocha', phone: '(11) 91111-3456', source: 'Instagram', status: 'nao_compareceu', agent: 'João Santos', createdAt: '2 dias', estimatedValue: 2800 },
  { id: '10', name: 'Diego Martins', phone: '(11) 90000-7890', source: 'Google Ads', status: 'nao_convertido', agent: 'Maria Fernanda', createdAt: '5 dias', estimatedValue: 1500 },
];

const sourceColors: Record<string, string> = {
  'WhatsApp': 'bg-success/10 text-success',
  'Telefone': 'bg-chart-2/10 text-chart-2',
  'Instagram': 'bg-chart-5/10 text-chart-5',
  'Google Ads': 'bg-warning/10 text-warning',
  'Indicação': 'bg-primary/10 text-primary',
  'Site': 'bg-muted text-muted-foreground',
};

const LeadCard = ({ lead }: { lead: Lead }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="mb-3 cursor-grab hover:shadow-lg transition-all duration-200 active:cursor-grabbing border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm">{lead.name}</p>
              <p className="text-xs text-muted-foreground">{lead.phone}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] font-medium border-0 ${sourceColors[lead.source] || 'bg-muted text-muted-foreground'}`}>
            {lead.source}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>{lead.agent}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{lead.createdAt}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="font-bold text-sm text-foreground">
              {formatCurrency(lead.estimatedValue)}
            </span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-success/10 hover:text-success">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-chart-2/10 hover:text-chart-2">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Funil = () => {
  const getLeadsByStatus = (status: LeadStatus) => {
    return mockLeads.filter(lead => lead.status === status);
  };

  const getTotalValueByStatus = (status: LeadStatus) => {
    return getLeadsByStatus(status).reduce((sum, lead) => sum + lead.estimatedValue, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AppLayout title="Funil de Vendas">
      <div className="h-[calc(100vh-8rem)] overflow-x-auto">
        <div className="flex gap-5 min-w-max pb-4">
          {funnelStages.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.key);
            const totalValue = getTotalValueByStatus(stage.key);
            
            return (
              <div 
                key={stage.key}
                className="w-80 flex-shrink-0"
              >
                <Card className="border-0 shadow-sm h-full">
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
                        <LeadCard key={lead.id} lead={lead} />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className={`text-center py-10 rounded-xl ${stage.bgColor}`}>
                          <p className="text-sm text-muted-foreground">
                            Nenhum lead nesta etapa
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
    </AppLayout>
  );
};

export default Funil;
