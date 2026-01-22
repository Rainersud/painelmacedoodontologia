import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Phone, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { callLogSchema, closingDealSchema, validateForm } from '@/lib/validations';

interface RegisterInteractionDialogProps {
  leadId: string;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterInteractionDialog({ 
  leadId, 
  leadName, 
  open, 
  onOpenChange 
}: RegisterInteractionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('call');
  
  const [callData, setCallData] = useState({
    call_type: 'outbound' as 'inbound' | 'outbound',
    duration_minutes: '',
    duration_seconds: '',
    result: '',
    notes: '',
  });

  const [closingData, setClosingData] = useState({
    treatment_value: '',
    payment_method: '' as 'avista' | 'parcelado' | '',
    notes: '',
  });

  const registerCall = useMutation({
    mutationFn: async () => {
      // Validate input before database operation
      const validation = validateForm(callLogSchema, callData);
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        throw new Error(firstError || 'Dados inválidos');
      }

      const durationSeconds = 
        (parseInt(callData.duration_minutes) || 0) * 60 + 
        (parseInt(callData.duration_seconds) || 0);

      const { error } = await supabase.from('call_logs').insert({
        lead_id: leadId,
        agent_id: user?.id,
        call_type: callData.call_type,
        duration_seconds: durationSeconds,
        result: callData.result,
        notes: callData.notes?.slice(0, 5000) || null, // Enforce max length
      });

      if (error) throw error;

      // Also add to interactions
      await supabase.from('lead_interactions').insert({
        lead_id: leadId,
        user_id: user?.id,
        type: callData.call_type === 'inbound' ? 'ligacao_recebida' : 'ligacao_realizada',
        content: callData.notes?.slice(0, 5000) || null,
        duration_seconds: durationSeconds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', leadId] });
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
      onOpenChange(false);
      resetForm();
      toast.success('Ligação registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar ligação');
    },
  });

  const closeDeal = useMutation({
    mutationFn: async () => {
      // Validate input before database operation
      const validation = validateForm(closingDealSchema, closingData);
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        throw new Error(firstError || 'Dados inválidos');
      }

      const treatmentValue = parseFloat(closingData.treatment_value);
      
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'fechado',
          treatment_value: treatmentValue,
          payment_method: closingData.payment_method,
          closed_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Add interaction with sanitized content
      const interactionContent = `Tratamento fechado: R$ ${treatmentValue.toLocaleString('pt-BR')} (${closingData.payment_method === 'avista' ? 'À vista' : 'Parcelado'}). ${(closingData.notes || '').slice(0, 5000)}`;
      
      await supabase.from('lead_interactions').insert({
        lead_id: leadId,
        user_id: user?.id,
        type: 'nota',
        content: interactionContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', leadId] });
      onOpenChange(false);
      resetForm();
      toast.success('Tratamento fechado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao fechar tratamento');
    },
  });

  const resetForm = () => {
    setCallData({
      call_type: 'outbound',
      duration_minutes: '',
      duration_seconds: '',
      result: '',
      notes: '',
    });
    setClosingData({
      treatment_value: '',
      payment_method: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Interação - {leadName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="call" className="gap-2">
              <Phone className="h-4 w-4" />
              Ligação
            </TabsTrigger>
            <TabsTrigger value="close" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Fechar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="call" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={callData.call_type}
                onValueChange={(v) => setCallData({ ...callData, call_type: v as 'inbound' | 'outbound' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Ligação Realizada</SelectItem>
                  <SelectItem value="inbound">Ligação Recebida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={callData.duration_minutes}
                  onChange={(e) => setCallData({ ...callData, duration_minutes: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Segundos</Label>
                <Input
                  type="number"
                  value={callData.duration_seconds}
                  onChange={(e) => setCallData({ ...callData, duration_seconds: e.target.value })}
                  placeholder="0"
                  max={59}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select
                value={callData.result}
                onValueChange={(v) => setCallData({ ...callData, result: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendida">Atendida</SelectItem>
                  <SelectItem value="nao_atendida">Não Atendida</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="caixa_postal">Caixa Postal</SelectItem>
                  <SelectItem value="agendamento">Agendamento Marcado</SelectItem>
                  <SelectItem value="follow_up">Agendar Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={callData.notes}
                onChange={(e) => setCallData({ ...callData, notes: e.target.value })}
                placeholder="Detalhes da ligação..."
              />
            </div>

            <Button 
              className="w-full" 
              onClick={() => registerCall.mutate()}
              disabled={!callData.result}
            >
              Registrar Ligação
            </Button>
          </TabsContent>

          <TabsContent value="close" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Valor do Tratamento (R$)</Label>
              <Input
                type="number"
                value={closingData.treatment_value}
                onChange={(e) => setClosingData({ ...closingData, treatment_value: e.target.value })}
                placeholder="0,00"
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

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={closingData.notes}
                onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
                placeholder="Detalhes do fechamento..."
              />
            </div>

            <Button 
              className="w-full" 
              onClick={() => closeDeal.mutate()}
              disabled={!closingData.treatment_value || !closingData.payment_method}
            >
              Fechar Tratamento
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
