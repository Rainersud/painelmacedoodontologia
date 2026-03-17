import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useRescheduleTask } from '@/hooks/useTasks';

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
              min={new Date().toISOString().slice(0, 16)}
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
            <Label htmlFor="observation">Observação adicional (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Alguma informação extra..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || reschedule.isPending}>
            {reschedule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Reagendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
