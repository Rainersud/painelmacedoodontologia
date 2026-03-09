import { Phone, MessageSquare, Calendar, User, Clock, DollarSign, Edit, StickyNote, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import { ReferralTags } from './ReferralTags';
import { useUpdateLeadRating } from '@/hooks/useCRMLeads';
import { useLeadReferralTags } from '@/hooks/useReferrals';
import { SOURCE_CONFIG, getDaysInStage, getStageAlertLevel, type Lead } from '@/types/crm';
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
  const { data: refTags } = useLeadReferralTags(lead.id);
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
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: false, 
        locale: ptBR 
      });
    } catch {
      return '';
    }
  };

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
      {/* Task indicator */}
      {hasTask && (
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning flex items-center justify-center shadow-sm">
          <CheckSquare className="h-3 w-3 text-white" />
        </div>
      )}

      <CardContent className={cn("p-3", compact && "p-2")}>
        {/* Header: Avatar + Name + Source */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={cn(
              "rounded-full bg-primary/10 flex items-center justify-center shrink-0",
              compact ? "h-8 w-8" : "h-10 w-10"
            )}>
              <span className={cn(
                "font-semibold text-primary",
                compact ? "text-xs" : "text-sm"
              )}>
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(
                "font-semibold truncate",
                compact ? "text-xs" : "text-sm"
              )}>
                {lead.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] font-medium border-0 shrink-0",
              SOURCE_CONFIG[lead.source]?.color || 'bg-muted text-muted-foreground'
            )}
          >
            {SOURCE_CONFIG[lead.source]?.label || lead.source}
          </Badge>
        </div>

        {/* Referral Tags */}
        {refTags && (refTags.isReferred || refTags.isReferrer) && (
          <div className="mb-1.5">
            <ReferralTags
              isReferred={refTags.isReferred}
              isReferrer={refTags.isReferrer}
              hasDiscount={refTags.hasDiscount}
              attendanceDiscountApplied={refTags.attendanceDiscountApplied}
              leadStatus={lead.status}
              referrerName={refTags.referrerName}
            />
          </div>
        )}

        {/* Treatment Interest Tag */}
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

        {/* Scheduled date if exists */}
        {lead.scheduled_appointment_at && (
          <div className="flex items-center gap-1 text-xs text-primary mb-2">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(lead.scheduled_appointment_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-5/10 hover:text-chart-5"
              onClick={(e) => {
                e.stopPropagation();
                onAddNote?.(lead);
              }}
            >
              <StickyNote className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-2/10 hover:text-chart-2"
              onClick={(e) => {
                e.stopPropagation();
                onCall?.(lead);
                window.open(`tel:${lead.phone}`, '_blank');
              }}
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 hover:bg-success/10 hover:text-success"
              onClick={(e) => {
                e.stopPropagation();
                const phone = lead.whatsapp || lead.phone;
                window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
