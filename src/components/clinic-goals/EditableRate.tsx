import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableRateProps {
  label: string;
  value: number;
  rate?: number | null;
  color: string;
  isAdmin: boolean;
  onSave: (value: number, rate?: number) => Promise<void>;
  isPending?: boolean;
  showRate?: boolean;
  isCurrency?: boolean;
  isMultiplier?: boolean;
}

export function EditableRate({
  label,
  value,
  rate,
  color,
  isAdmin,
  onSave,
  isPending,
  showRate = true,
  isCurrency = false,
  isMultiplier = false,
}: EditableRateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [editRate, setEditRate] = useState(rate || 0);

  const handleSave = async () => {
    await onSave(editValue, showRate && rate !== null ? editRate : undefined);
    setIsOpen(false);
  };

  const formatValue = () => {
    if (isCurrency) return `R$ ${(value / 1000).toFixed(1)}k`;
    if (isMultiplier) return `${value}x`;
    return value.toString();
  };

  return (
    <div className="text-center relative group">
      <div 
        className="h-2 w-12 mx-auto rounded-full mb-2"
        style={{ backgroundColor: color }}
      />
      <p className="text-2xl font-bold">{formatValue()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {showRate && rate !== null && (
        <span 
          className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {rate}%
        </span>
      )}
      
      {isAdmin && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                "bg-background/80 hover:bg-background shadow-sm"
              )}
              onClick={() => {
                setEditValue(value);
                setEditRate(rate || 0);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar: {label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>
                  {isCurrency ? 'Valor (R$)' : isMultiplier ? 'Multiplicador' : 'Quantidade'}
                </Label>
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={isCurrency ? 1000 : isMultiplier ? 0.1 : 1}
                />
              </div>
              
              {showRate && rate !== null && (
                <div className="space-y-2">
                  <Label>Taxa de Conversão (%)</Label>
                  <Input
                    type="number"
                    value={editRate}
                    onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Taxa esperada de conversão para esta etapa
                  </p>
                </div>
              )}
              
              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
