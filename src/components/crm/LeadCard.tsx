import { Phone, MessageSquare, Calendar, DollarSign, StickyNote, CheckSquare, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReferralPopover } from './ReferralPopover';
import { useLeadReferralTagsEnhanced } from '@/hooks/useReferralTagsEnhanced';
import { getDaysInStage, getStageAlertLevel, type Lead } from '@/types/crm';
import { useLeadAlerts } from '@/hooks/useLeadAlerts';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onDragStart?: (e: React.DragEvent, lead: Lead) => void;
  onClick?: (lead: Lead) => void;
  onAddNote?: (lead: Lead) => void;
  onCall?: (lead: Lead) => void;
  compact?: boolean;
}

export function LeadCard({ 
  lead, 
  onDragStart,
  onClick,
  onAddNote,
  onCall,
  compact = false,
}: LeadCardProps) {
  const { data: refTags } = useLeadReferralTagsEnhanced(lead.id);
  const leadAlerts = useLeadAlerts(lead);
  const hasTask = lead.tasks && lead.tasks.length > 0;
  const hasReferralData = refTags && (refTags.isReferred || refTags.isReferrer || refTags.pendingBonuses.length > 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

  const days = getDaysInStage(lead.stage_entered_at);
  const alertLevel = getStageAlertLevel(days);
  const alertColors = {
    normal: 'bg-success/10 text-success',
    attention: 'bg-warning/10 text-warning',
    critical: 'bg-destructive/10 text-destructive',
  };

  // Get the highest priority alert for the card border
  const topAlert = leadAlerts[0];
  const borderClass = topAlert?.level === 'critical' ? 'border-l-4 border-l-destructive' : 
                      topAlert?.level === 'opportunity' ? 'border-l-4 border-l-success' :
                      topAlert?.level === 'attention' ? 'border-l-4 border-l-warning' : '';

  return (
    <Card 
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-sm group relative",
        onDragStart && "active:cursor-grabbing",
        borderClass
      )}
    >
      {/* Task indicator */}
      {hasTask && (
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning flex items-center justify-center shadow-sm">
          <CheckSquare className="h-3 w-3 text-white" />
        </div>
      )}

      <CardContent className={cn("p-3", compact && "p-2")}>
        {/* Header: Name + Referral icons */}
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={cn(
              "rounded-full bg-primary/10 flex items-center justify-center shrink-0",
              compact ? "h-7 w-7" : "h-8 w-8"
            )}>
              <span className={cn("font-semibold text-primary", compact ? "text-[10px]" : "text-xs")}>
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <p className={cn("font-semibold truncate", compact ? "text-xs" : "text-sm")}>{lead.name}</p>
          </div>
          {/* Discrete referral icons */}
          {hasReferralData && refTags && (
            <ReferralPopover lead={lead} refTags={refTags} />
          )}
        </div>

        {/* Smart Alert Badge */}
        {topAlert && (
          <div className="mb-1.5">
            <Badge variant="outline" className={cn(
              "text-[10px] border-0 font-medium",
              topAlert.level === 'critical' ? 'bg-destructive/10 text-destructive' :
              topAlert.level === 'opportunity' ? 'bg-success/10 text-success' :
              'bg-warning/10 text-warning'
            )}>
              <Zap className="h-2.5 w-2.5 mr-0.5" />
              {topAlert.shortLabel}
            </Badge>
          </div>
        )}

        {/* Treatment Interest */}
        {lead.interest_product && (
          <div className="mb-1.5">
            <Badge variant="outline" className="text-[10px] bg-chart-3/10 text-chart-3 border-chart-3/20">
              🦷 {lead.interest_product === 'implante' ? 'Implante' : 
                   lead.interest_product === 'protese_flexivel' ? 'Prótese Flexível' :
                   lead.interest_product === 'protese_total' ? 'Prótese Total' : lead.interest_product}
            </Badge>
          </div>
        )}

        {/* Days in stage */}
        <div className="mb-1.5">
          <Badge variant="outline" className={cn("text-[10px] border-0 font-medium", alertColors[alertLevel])}>
            ⏳ {days} {days === 1 ? 'dia' : 'dias'} nesta etapa
          </Badge>
        </div>

        {/* Scheduled date */}
        {lead.scheduled_appointment_at && (
          <div className="flex items-center gap-1.5 text-xs text-primary mb-1.5 p-1.5 rounded bg-primary/5">
            <Calendar className="h-3 w-3" />
            <span className="font-medium">
              📅 {new Date(lead.scheduled_appointment_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
            <span>
              ⏰ {new Date(lead.scheduled_appointment_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Value + Actions */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-success" />
            <span className="font-bold text-xs">
              {formatCurrency(lead.treatment_value || 0)}
            </span>
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-5/10 hover:text-chart-5"
              onClick={(e) => { e.stopPropagation(); onAddNote?.(lead); }}>
              <StickyNote className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-2/10 hover:text-chart-2"
              onClick={(e) => { e.stopPropagation(); onCall?.(lead); window.open(`tel:${lead.phone}`, '_blank'); }}>
              <Phone className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-success/10 hover:text-success"
              onClick={(e) => { e.stopPropagation(); const phone = lead.whatsapp || lead.phone; window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); }}>
              <MessageSquare className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
