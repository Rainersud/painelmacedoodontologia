import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock } from 'lucide-react';

interface ScheduleAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConfirm: (scheduledAt: string) => void;
  isPending?: boolean;
}

export function ScheduleAppointmentDialog({
  open,
  onOpenChange,
  leadName,
  onConfirm,
  isPending,
}: ScheduleAppointmentDialogProps) {
  const [dateTime, setDateTime] = useState('');

  const handleConfirm = () => {
    if (!dateTime) return;
    onConfirm(new Date(dateTime).toISOString());
    setDateTime('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agendar Consulta
          </DialogTitle>
          <DialogDescription>
            Registre a data e horário da consulta de <strong>{leadName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="appointment-datetime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Data e Horário da Consulta
            </Label>
            <Input
              id="appointment-datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!dateTime || isPending}
            >
              {isPending ? 'Agendando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
