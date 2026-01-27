import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';

interface FunnelStageCardProps {
  stage: string;
  value: number;
  rate: number;
  color: string;
  isAdmin: boolean;
  onSaveRate: (rate: number) => Promise<void>;
  isPending?: boolean;
}

export function FunnelStageCard({
  stage,
  value,
  rate,
  color,
  isAdmin,
  onSaveRate,
  isPending,
}: FunnelStageCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editRate, setEditRate] = useState(rate);

  const handleSave = async () => {
    await onSaveRate(editRate);
    setIsOpen(false);
  };

  return (
    <div 
      className="rounded-xl p-4 text-center text-white transition-all hover:scale-105 relative group"
      style={{ backgroundColor: color }}
    >
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium opacity-90">{stage}</p>
      <div className="mt-2 inline-block bg-white/20 rounded-full px-3 py-1">
        <span className="text-sm font-semibold">{rate}%</span>
      </div>
      
      {isAdmin && stage !== 'Leads' && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30 text-white"
              onClick={() => setEditRate(rate)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Taxa: {stage}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Taxa de Conversão Esperada (%)</Label>
                <Input
                  type="number"
                  value={editRate}
                  onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">
                  Defina a taxa de conversão ideal para esta etapa do funil
                </p>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? 'Salvando...' : 'Salvar Taxa'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
