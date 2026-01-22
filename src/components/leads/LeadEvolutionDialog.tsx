import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  ArrowRight,
  User,
  Clock,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type LeadStatus = Database['public']['Enums']['lead_status'];

interface LeadEvolutionDialogProps {
  lead: {
    id: string;
    name: string;
    phone: string;
    status: LeadStatus;
    estimated_value: number | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusFlow: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'novo_lead', label: 'Novo Lead', color: 'bg-chart-2' },
  { key: 'em_atendimento', label: 'Em Atendimento', color: 'bg-warning' },
  { key: 'consulta_agendada', label: 'Agendado', color: 'bg-primary' },
  { key: 'confirmado', label: 'Confirmado', color: 'bg-success' },
  { key: 'compareceu', label: 'Compareceu', color: 'bg-success' },
  { key: 'resgatado', label: 'Resgatado', color: 'bg-chart-5' },
  { key: 'fechado', label: 'Fechado', color: 'bg-success' },
  { key: 'nao_compareceu', label: 'Não Compareceu', color: 'bg-destructive' },
  { key: 'nao_convertido', label: 'Não Convertido', color: 'bg-muted-foreground' },
];

export function LeadEvolutionDialog({ lead, open, onOpenChange }: LeadEvolutionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('status');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [interactionData, setInteractionData] = useState({
    type: '' as 'ligacao' | 'whatsapp' | 'email' | 'presencial' | '',
    notes: '',
  });
  const [closingData, setClosingData] = useState({
    treatment_value: '',
    payment_method: '' as 'avista' | 'parcelado' | '',
    notes: '',
  });

  const updateStatus = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: LeadStatus; notes: string }) => {
      if (!lead) throw new Error('Lead não encontrado');

      const updates: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'resgatado') {
        updates.rescued_at = new Date().toISOString();
      } else if (newStatus === 'fechado') {
        updates.closed_at = new Date().toISOString();
        if (closingData.treatment_value) {
          updates.treatment_value = parseFloat(closingData.treatment_value);
        }
        if (closingData.payment_method) {
          updates.payment_method = closingData.payment_method;
        }
      }

      const { error: leadError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', lead.id);

      if (leadError) throw leadError;

      // Register the status change as an interaction
      if (notes.trim()) {
        await supabase.from('lead_interactions').insert({
          lead_id: lead.id,
          user_id: user?.id,
          type: 'nota' as const,
          content: `Status alterado para ${statusFlow.find(s => s.key === newStatus)?.label}: ${notes}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', lead?.id] });
      toast.success('Status atualizado com sucesso!');
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status');
      console.error(error);
    },
  });

  const registerInteraction = useMutation({
    mutationFn: async () => {
      if (!lead || !interactionData.type) throw new Error('Dados incompletos');

      const typeMap: Record<string, 'ligacao_realizada' | 'whatsapp_enviado' | 'nota'> = {
        ligacao: 'ligacao_realizada',
        whatsapp: 'whatsapp_enviado',
        presencial: 'nota',
        email: 'nota',
      };

      await supabase.from('lead_interactions').insert({
        lead_id: lead.id,
        user_id: user?.id,
        type: typeMap[interactionData.type] || 'nota',
        content: interactionData.notes,
      });

      // Update lead to em_atendimento if it's still novo_lead
      if (lead.status === 'novo_lead') {
        await supabase
          .from('leads')
          .update({ status: 'em_atendimento' })
          .eq('id', lead.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', lead?.id] });
      toast.success('Interação registrada!');
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao registrar interação');
    },
  });

  const resetForm = () => {
    setSelectedStatus('');
    setInteractionData({ type: '', notes: '' });
    setClosingData({ treatment_value: '', payment_method: '', notes: '' });
    setActiveTab('status');
  };

  if (!lead) return null;

  const currentStatusIndex = statusFlow.findIndex(s => s.key === lead.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold">{lead.name}</p>
              <p className="text-sm text-muted-foreground font-normal">{lead.phone}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Current Status */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Status atual:</span>
          <Badge className={`${statusFlow.find(s => s.key === lead.status)?.color} text-white`}>
            {statusFlow.find(s => s.key === lead.status)?.label}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">
              <ArrowRight className="h-4 w-4 mr-2" />
              Evoluir Status
            </TabsTrigger>
            <TabsTrigger value="interaction">
              <MessageSquare className="h-4 w-4 mr-2" />
              Interação
            </TabsTrigger>
            <TabsTrigger value="close">
              <DollarSign className="h-4 w-4 mr-2" />
              Fechar Venda
            </TabsTrigger>
          </TabsList>

          {/* Status Evolution Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as LeadStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFlow.map((status, index) => (
                    <SelectItem 
                      key={status.key} 
                      value={status.key}
                      disabled={status.key === lead.status}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${status.color}`} />
                        {status.label}
                        {index > currentStatusIndex && index <= currentStatusIndex + 1 && (
                          <Badge variant="outline" className="ml-2 text-xs">Próximo</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Motivo da mudança de status..."
                value={interactionData.notes}
                onChange={(e) => setInteractionData({ ...interactionData, notes: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => selectedStatus && updateStatus.mutate({ 
                newStatus: selectedStatus, 
                notes: interactionData.notes 
              })}
              disabled={!selectedStatus || updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
          </TabsContent>

          {/* Interaction Tab */}
          <TabsContent value="interaction" className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Interação</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'ligacao', icon: Phone, label: 'Ligação' },
                  { key: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
                  { key: 'presencial', icon: User, label: 'Presencial' },
                  { key: 'email', icon: Clock, label: 'E-mail' },
                ].map((type) => (
                  <Button
                    key={type.key}
                    type="button"
                    variant={interactionData.type === type.key ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => setInteractionData({ ...interactionData, type: type.key as any })}
                  >
                    <type.icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas da Interação</Label>
              <Textarea
                placeholder="Descreva o que foi conversado..."
                value={interactionData.notes}
                onChange={(e) => setInteractionData({ ...interactionData, notes: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => registerInteraction.mutate()}
              disabled={!interactionData.type || registerInteraction.isPending}
            >
              {registerInteraction.isPending ? 'Registrando...' : 'Registrar Interação'}
            </Button>
          </TabsContent>

          {/* Close Deal Tab */}
          <TabsContent value="close" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor do Tratamento (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={closingData.treatment_value}
                  onChange={(e) => setClosingData({ ...closingData, treatment_value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select 
                  value={closingData.payment_method} 
                  onValueChange={(v) => setClosingData({ ...closingData, payment_method: v as 'avista' | 'parcelado' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">À Vista</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Detalhes do fechamento..."
                value={closingData.notes}
                onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => updateStatus.mutate({ newStatus: 'fechado', notes: closingData.notes })}
              disabled={!closingData.treatment_value || !closingData.payment_method || updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Fechando...' : 'Fechar Venda'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}