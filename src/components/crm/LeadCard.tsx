import { Phone, MessageSquare, Calendar, User, Clock, DollarSign, StickyNote, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import { ReferralPopover } from './ReferralPopover';
import { useUpdateLeadRating } from '@/hooks/useCRMLeads';
import { useLeadReferralTagsEnhanced } from '@/hooks/useReferralTagsEnhanced';
import { SOURCE_CONFIG, getDaysInStage, getStageAlertLevel, getStagnationLabel, type Lead } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const updateRating = useUpdateLeadRating();
  const { data: refTags } = useLeadReferralTagsEnhanced(lead.id);
  const hasTask = lead.tasks && lead.tasks.length > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: ptBR });
    } catch {
      return '';
    }
  };

  const hasReferralData = refTags && (refTags.isReferred || refTags.isReferrer || refTags.pendingBonuses.length > 0);

  return (
    <Card 
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-sm group relative",
        onDragStart && "active:cursor-grabbing"
      )}
    >
      {hasTask && (
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning flex items-center justify-center shadow-sm">
          <CheckSquare className="h-3 w-3 text-white" />
        </div>
      )}

      <CardContent className={cn("p-3", compact && "p-2")}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={cn(
              "rounded-full bg-primary/10 flex items-center justify-center shrink-0",
              compact ? "h-8 w-8" : "h-10 w-10"
            )}>
              <span className={cn("font-semibold text-primary", compact ? "text-xs" : "text-sm")}>
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold truncate", compact ? "text-xs" : "text-sm")}>{lead.name}</p>
              <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Discrete referral icons + popover */}
            {hasReferralData && refTags && (
              <ReferralPopover lead={lead} refTags={refTags} />
            )}
            <Badge 
              variant="outline" 
              className={cn("text-[10px] font-medium border-0", SOURCE_CONFIG[lead.source]?.color || 'bg-muted text-muted-foreground')}
            >
              {SOURCE_CONFIG[lead.source]?.label || lead.source}
            </Badge>
          </div>
        </div>

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

        {/* Star Rating */}
        <div className="mb-2">
          <StarRating
            rating={lead.interest_rating || 0}
            onChange={(rating) => updateRating.mutate({ leadId: lead.id, rating })}
            size="sm"
          />
        </div>

        {/* Days in stage + Stagnation alert */}
        {(() => {
          const days = getDaysInStage(lead.stage_entered_at);
          const alertLevel = getStageAlertLevel(days);
          const stagnationLabel = getStagnationLabel(days);
          const alertColors = {
            normal: 'bg-success/10 text-success',
            attention: 'bg-warning/10 text-warning',
            critical: 'bg-destructive/10 text-destructive',
          };
          return (
            <div className="mb-2 flex flex-wrap gap-1">
              <Badge variant="outline" className={cn("text-[10px] border-0 font-medium", alertColors[alertLevel])}>
                ⏳ {days} {days === 1 ? 'dia' : 'dias'} nesta etapa
              </Badge>
              {stagnationLabel && (
                <Badge variant="outline" className={cn("text-[10px] border-0 font-medium", alertColors[alertLevel])}>
                  {stagnationLabel}
                </Badge>
              )}
            </div>
          );
        })()}

        {/* No-show count */}
        {(lead.no_show_count || 0) > 0 && (
          <div className="mb-2">
            <Badge variant="outline" className="text-[10px] border-0 font-medium bg-destructive/10 text-destructive">
              ❌ Faltas: {lead.no_show_count}
            </Badge>
          </div>
        )}

        {/* Agent + Time */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.profiles?.full_name || 'Sem agente'}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(lead.created_at)}</span>
          </div>
        </div>

        {/* Scheduled date */}
        {lead.scheduled_appointment_at && (
          <div className="flex items-center gap-2 text-xs text-primary mb-2 p-1.5 rounded bg-primary/5">
            <Calendar className="h-3.5 w-3.5" />
            <div>
              <span className="font-medium">
                📅 {new Date(lead.scheduled_appointment_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
              <span className="ml-1.5">
                ⏰ {new Date(lead.scheduled_appointment_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {/* Value + Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="font-bold text-sm">
              {formatCurrency(lead.treatment_value || lead.estimated_value || 0)}
            </span>
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-5/10 hover:text-chart-5"
              onClick={(e) => { e.stopPropagation(); onAddNote?.(lead); }}>
              <StickyNote className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-2/10 hover:text-chart-2"
              onClick={(e) => { e.stopPropagation(); onCall?.(lead); window.open(`tel:${lead.phone}`, '_blank'); }}>
              <Phone className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-success/10 hover:text-success"
              onClick={(e) => { e.stopPropagation(); const phone = lead.whatsapp || lead.phone; window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); }}>
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
