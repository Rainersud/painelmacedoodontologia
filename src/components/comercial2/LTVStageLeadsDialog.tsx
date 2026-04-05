import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface LeadEntry {
  id: string;
  leadId: string;
  name: string;
  ltv: number;
  purchaseCount: number;
  hasOpenUpsell: boolean;
  status: string;
}

interface LTVStageLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageLabel: string;
  leads: LeadEntry[];
  onLeadClick: (leadId: string) => void;
}

export function LTVStageLeadsDialog({ open, onOpenChange, stageLabel, leads, onLeadClick }: LTVStageLeadsDialogProps) {
  const totalLTV = useMemo(() => leads.reduce((sum, l) => sum + l.ltv, 0), [leads]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            📊 Leads – {stageLabel}
          </DialogTitle>
          <DialogDescription>
            {leads.length} paciente{leads.length !== 1 ? 's' : ''} • LTV Total: {formatCurrency(totalLTV)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px]">
          {leads.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum paciente nesta etapa
            </div>
          ) : (
            <div className="space-y-2 pr-3">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => {
                    onLeadClick(lead.id);
                    onOpenChange(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                        {lead.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          LTV: {formatCurrency(lead.ltv)}
                        </span>
                        {lead.hasOpenUpsell && (
                          <Badge className="text-[8px] bg-warning/10 text-warning border-warning/30">
                            ⚠️ Upsell aberto
                          </Badge>
                        )}
                      </div>
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export type { LeadEntry };
