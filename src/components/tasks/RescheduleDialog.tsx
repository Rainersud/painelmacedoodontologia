import { useState } from 'react';
import { toLocalInputValue } from '@/lib/datetime';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Loader2, Ban } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRescheduleTask } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { endContactCycle } from '@/lib/contactCycle';
import { refreshBusinessData } from '@/lib/refresh';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export function RescheduleDialog({ open, onOpenChange, taskId, taskTitle }: RescheduleDialogProps) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [observation, setObservation] = useState('');
  const reschedule = useRescheduleTask();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ending, setEnding] = useState(false);

  /** Fim de ciclo: a pessoa não quer mais receber contato. */
  const handleEndCycle = async () => {
    setEnding(true);
    try {
      const { data: task, error } = await supabase.from('tasks').select('lead_id').eq('id', taskId).maybeSingle();
      if (error) throw error;
      if (!task?.lead_id) throw new Error('Esta tarefa não está ligada a um lead.');
      const res = await endContactCycle(task.lead_id, `Retorno · ${observation.trim() || 'não quer mais contato'}`, user?.id ?? null);
      if (res.error) throw new Error(res.error);
      toast.success('Fim de ciclo registrado: não receberá mais contatos');
      await refreshBusinessData(queryClient);
      onOpenChange(false);
      setNewDate(''); setReason(''); setObservation('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar o fim de ciclo.');
    } finally {
      setEnding(false);
    }
  };

  const handleSubmit = () => {
    if (!newDate || !reason.trim()) return;
    reschedule.mutate(
      { taskId, newDate: new Date(newDate).toISOString(), reason: reason.trim(), observation: observation.trim() || undefined },
      { onSuccess: () => { onOpenChange(false); setNewDate(''); setReason(''); setObservation(''); } }
    );
  };

  const isValid = newDate && reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Reagendar Tarefa
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tarefa: <span className="font-medium text-foreground">{taskTitle}</span>
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-date">Nova data e hora *</Label>
            <Input
              id="new-date"
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={toLocalInputValue(new Date())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do reagendamento *</Label>
            <Input
              id="reason"
              placeholder="Ex: Paciente não atendeu"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observation">O que foi falado neste contato (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Resumo da conversa deste contato..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive sm:mr-auto" disabled={ending}>
                {ending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                Fim de ciclo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar o contato com este lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  Use quando a pessoa não quer mais receber contato. Os retornos em aberto são cancelados,
                  ela sai do remarketing e dos quadros do CRC e, se ainda não for paciente, vai para "Sem interesse".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleEndCycle}>Registrar fim de ciclo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || reschedule.isPending}>
            {reschedule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Reagendamento
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
