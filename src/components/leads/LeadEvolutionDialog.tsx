import { useState, useEffect } from 'react';
import { PaymentDialog } from '@/components/crm/PaymentDialog';
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
    treatment_value?: number | null;
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
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [friendlyPatient, setFriendlyPatient] = useState<boolean | null>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: LeadStatus; notes: string }) => {
      if (!lead) throw new Error('Lead não encontrado');

      const updates: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'resgatado') {
        updates.rescued_at = new Date().toISOString();
      } else if (newStatus === 'fechado') {
        // Validate payment exists
        const { count } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .eq('status', 'pago');
        
        if (!count || count === 0) {
          throw new Error('Registre um pagamento antes de marcar como Venda Realizada.');
        }
        updates.closed_at = new Date().toISOString();

        // Save friendly_patient on upsell opportunities
        if (friendlyPatient !== null) {
          const { data: upsellOpps } = await supabase
            .from('upsell_opportunities')
            .select('id')
            .eq('lead_id', lead.id);
          
          if (upsellOpps && upsellOpps.length > 0) {
            await supabase
              .from('upsell_opportunities')
              .update({ friendly_patient: friendlyPatient })
              .eq('lead_id', lead.id);
          }
          // If no upsell exists yet (trigger will create), we store in notes for the trigger
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
    setActiveTab('status');
    setFriendlyPatient(null);
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
              <Label htmlFor="new-status">Novo Status</Label>
              <Select 
                value={selectedStatus || undefined} 
                onValueChange={(v) => setSelectedStatus(v as LeadStatus)}
              >
                <SelectTrigger id="new-status">
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
              <Label htmlFor="status-notes">Observações (opcional)</Label>
              <Textarea
                id="status-notes"
                name="status-notes"
                placeholder="Motivo da mudança de status..."
                value={interactionData.notes}
                onChange={(e) => setInteractionData(prev => ({ ...prev, notes: e.target.value }))}
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
                    onClick={() => setInteractionData(prev => ({ ...prev, type: type.key as 'ligacao' | 'whatsapp' | 'email' | 'presencial' }))}
                  >
                    <type.icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interaction-notes">Notas da Interação</Label>
              <Textarea
                id="interaction-notes"
                name="interaction-notes"
                placeholder="Descreva o que foi conversado..."
                value={interactionData.notes}
                onChange={(e) => setInteractionData(prev => ({ ...prev, notes: e.target.value }))}
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

          {/* Close Deal Tab - now opens PaymentDialog */}
          <TabsContent value="close" className="space-y-4">
            {/* Paciente Amigo Section */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <h4 className="font-medium text-primary flex items-center gap-2">
                🤝 Paciente Amigo
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                "Você se sentindo realizado com o tratamento no final, você aceita participar do programa <strong>'Paciente Amigo'</strong>, onde podemos gravar um pequeno vídeo de depoimento ou uma breve entrevista relatando sua experiência com seu tratamento? Isso te dá um <strong>cashback de R$ 200,00</strong> no seu tratamento. Lembrando que é opcional, apenas se realmente se sentir feliz com o tratamento e tiver o desejo de participar!"
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="friendly_patient"
                    checked={friendlyPatient === true}
                    onChange={() => setFriendlyPatient(true)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">✅ Sim</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="friendly_patient"
                    checked={friendlyPatient === false}
                    onChange={() => setFriendlyPatient(false)}
                    className="h-4 w-4 accent-destructive"
                  />
                  <span className="text-sm font-medium">❌ Não</span>
                </label>
              </div>
              {friendlyPatient === null && (
                <p className="text-[10px] text-destructive">* Campo obrigatório antes de confirmar a venda</p>
              )}
            </div>

            <div className="p-4 bg-success/5 rounded-lg border border-success/20 space-y-3">
              <h4 className="font-medium text-success flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Venda Realizada
              </h4>
              <p className="text-sm text-muted-foreground">
                Para fechar a venda, primeiro registre o pagamento. Após a confirmação, o lead será movido automaticamente para "Venda Realizada".
              </p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setPaymentOpen(true)}
              >
                💰 Registrar Pagamento
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  if (friendlyPatient === null) {
                    toast.error('Responda a pergunta "Paciente Amigo" antes de confirmar a venda.');
                    return;
                  }
                  updateStatus.mutate({ newStatus: 'fechado', notes: `Paciente Amigo: ${friendlyPatient ? 'Sim' : 'Não'}` });
                }}
                disabled={updateStatus.isPending || friendlyPatient === null}
              >
                {updateStatus.isPending ? 'Fechando...' : 'Confirmar Venda Realizada'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {lead && (
          <PaymentDialog
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            leadId={lead.id}
            leadName={lead.name}
            budgetValue={lead.treatment_value || 0}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}