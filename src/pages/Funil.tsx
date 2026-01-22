import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Calendar, User, Clock } from 'lucide-react';

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

const funnelStages: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'novo_lead', label: 'Novo Lead', color: 'border-t-blue-500' },
  { key: 'em_atendimento', label: 'Em Atendimento', color: 'border-t-yellow-500' },
  { key: 'consulta_agendada', label: 'Consulta Agendada', color: 'border-t-purple-500' },
  { key: 'confirmado', label: 'Confirmado', color: 'border-t-green-500' },
  { key: 'compareceu', label: 'Compareceu', color: 'border-t-emerald-500' },
  { key: 'nao_compareceu', label: 'Não Compareceu', color: 'border-t-red-500' },
  { key: 'nao_convertido', label: 'Não Convertido', color: 'border-t-gray-500' },
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
  'WhatsApp': 'bg-green-100 text-green-700',
  'Telefone': 'bg-blue-100 text-blue-700',
  'Instagram': 'bg-pink-100 text-pink-700',
  'Google Ads': 'bg-yellow-100 text-yellow-700',
  'Indicação': 'bg-purple-100 text-purple-700',
  'Site': 'bg-gray-100 text-gray-700',
};

const LeadCard = ({ lead }: { lead: Lead }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="mb-3 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm">{lead.name}</p>
              <p className="text-xs text-muted-foreground">{lead.phone}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] ${sourceColors[lead.source] || 'bg-gray-100 text-gray-700'}`}>
            {lead.source}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{lead.agent}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{lead.createdAt}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-primary">
            {formatCurrency(lead.estimatedValue)}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Phone className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Calendar className="h-3 w-3" />
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
        <div className="flex gap-4 min-w-max pb-4">
          {funnelStages.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.key);
            const totalValue = getTotalValueByStatus(stage.key);
            
            return (
              <div 
                key={stage.key}
                className="w-80 flex-shrink-0"
              >
                <Card className={`border-t-4 ${stage.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">
                        {stage.label}
                      </CardTitle>
                      <Badge variant="secondary" className="font-normal">
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatCurrency(totalValue)}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-0 max-h-[calc(100vh-16rem)] overflow-y-auto">
                      {stageLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum lead nesta etapa
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
