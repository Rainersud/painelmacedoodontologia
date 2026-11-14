import { Button } from '@/components/ui/button';
import { useOpenLead } from '@/contexts/LeadDetailContext';
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
  const openLead = useOpenLead();
  const totalLTV = useMemo(() => leads.reduce((sum, l) => sum + l.ltv, 0), [leads]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Leads – {stageLabel}
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
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLead(lead.leadId)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLead(lead.leadId); } }}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                          <Badge className="text-[8px] bg-warning/10 text-warning-strong border-warning/30">
                            Upsell aberto
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 shrink-0 ml-2"
                      onClick={e => { e.stopPropagation(); onLeadClick(lead.id); onOpenChange(false); }}
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> Oportunidade
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export type { LeadEntry };
