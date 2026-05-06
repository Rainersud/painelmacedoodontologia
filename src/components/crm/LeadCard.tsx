import { Phone, MessageSquare, Calendar, DollarSign, StickyNote, CheckSquare, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReferralPopover } from './ReferralPopover';
import { useLeadReferralTagsEnhanced } from '@/hooks/useReferralTagsEnhanced';
import { getDaysInStage, getStageAlertLevel, type Lead } from '@/types/crm';
import { useLeadAlerts } from '@/hooks/useLeadAlerts';
import { useFriendlyPatientStatus } from '@/hooks/useFriendlyPatient';
import { getScoreColor } from '@/hooks/useLeadScoring';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onDragStart?: (e: React.DragEvent, lead: Lead) => void;
  onClick?: (lead: Lead) => void;
  onAddNote?: (lead: Lead) => void;
  onCall?: (lead: Lead) => void;
  compact?: boolean;
  index?: number;
}

export function LeadCard({ 
  lead, 
  onDragStart,
  onClick,
  onAddNote,
  onCall,
  compact = false,
  index = 0,
}: LeadCardProps) {
  const { data: refTags } = useLeadReferralTagsEnhanced(lead.id);
  const { data: friendlyData } = useFriendlyPatientStatus(lead.status === 'fechado' ? lead.id : undefined);
  const leadAlerts = useLeadAlerts(lead);
  const scoreColors = getScoreColor(lead.score_category || 'morno');
  const hasTask = lead.tasks && lead.tasks.length > 0;
  const hasReferralData = refTags && (refTags.isReferred || refTags.isReferrer || refTags.pendingBonuses.length > 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

  const days = getDaysInStage(lead.stage_entered_at);
  const alertLevel = getStageAlertLevel(days);
  const isFollowUpStage = lead.status?.startsWith('followup_') || lead.status === 'nao_respondeu';

  // Time-based grouping category badge (visual only)
  const createdDays = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
  const lastActivity = (lead as any).last_interaction_at || lead.updated_at || lead.created_at;
  const inactivityDays = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
  let timeCategory: { label: string; cls: string } | null = null;
  if (inactivityDays >= 7) timeCategory = { label: '⚠️ Sem acomp.', cls: 'bg-destructive/10 text-destructive' };
  else if (createdDays === 0) timeCategory = { label: '🟢 Hoje', cls: 'bg-success/10 text-success' };
  else if (createdDays === 1) timeCategory = { label: '🟡 Ontem', cls: 'bg-warning/10 text-warning' };
  else if (createdDays <= 7) timeCategory = { label: '📅 Semana', cls: 'bg-primary/10 text-primary' };
  else timeCategory = { label: '📦 Antigo', cls: 'bg-muted text-muted-foreground' };

  // Calculate total days in follow-up (from first follow-up entry)
  const totalFollowUpDays = isFollowUpStage && lead.stage_entered_at
    ? Math.max(days, Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Excess attempts warning (>2 same day approximation based on contact_attempts and days)
  const showExcessWarning = isFollowUpStage && (lead.contact_attempts ?? 0) > 0 && days === 0 && (lead.contact_attempts ?? 0) >= 2;
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

  const isEven = index % 2 === 0;

  return (
    <Card 
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-sm group relative",
        isEven ? "bg-card" : "bg-accent/70",
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

      <CardContent className="p-1.5">
        {/* Row 1: Avatar + Name + Value */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className="rounded-full bg-primary/10 flex items-center justify-center shrink-0 h-6 w-6">
            <span className="font-semibold text-primary text-[9px]">
              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <p className="font-semibold truncate text-xs flex-1 min-w-0">{lead.name}</p>
          {hasReferralData && refTags && (
            <ReferralPopover lead={lead} refTags={refTags} />
          )}
        </div>

        {/* Row 2: Compact badges row */}
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {/* Score indicator */}
          <Badge variant="outline" className={cn("text-[9px] border-0 font-medium px-1 py-0 h-4", scoreColors.bg, scoreColors.text)}>
            {scoreColors.dot} {lead.lead_score ?? 50}
          </Badge>
          {topAlert && (
            <Badge variant="outline" className={cn(
              "text-[9px] border-0 font-medium px-1 py-0 h-4",
              topAlert.level === 'critical' ? 'bg-destructive/10 text-destructive' :
              topAlert.level === 'opportunity' ? 'bg-success/10 text-success' :
              'bg-warning/10 text-warning'
            )}>
              <Zap className="h-2 w-2 mr-0.5" />
              {topAlert.shortLabel}
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[9px] border-0 font-medium px-1 py-0 h-4", alertColors[alertLevel])}>
            ⏳ {days}d
          </Badge>
          {timeCategory && (
            <Badge variant="outline" className={cn("text-[9px] border-0 font-medium px-1 py-0 h-4", timeCategory.cls)}>
              {timeCategory.label}
            </Badge>
          )}
          {lead.interest_product && (
            <Badge variant="outline" className="text-[9px] bg-chart-3/10 text-chart-3 border-chart-3/20 px-1 py-0 h-4">
              🦷 {lead.interest_product === 'implante' ? 'Impl.' : 
                   lead.interest_product === 'protese_flexivel' ? 'P.Flex' :
                   lead.interest_product === 'protese_total' ? 'P.Total' : lead.interest_product}
            </Badge>
          )}
          {lead.scheduled_appointment_at && (
            <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20 px-1 py-0 h-4">
              📅 {new Date(lead.scheduled_appointment_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </Badge>
          )}
          {lead.no_show_count > 0 && (
            <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-0 px-1 py-0 h-4">
              ❌ {lead.no_show_count}x falta
            </Badge>
          )}
          {isFollowUpStage && (lead.contact_attempts ?? 0) > 0 && (
            <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-0 px-1 py-0 h-4">
              📞 {lead.contact_attempts}/9
            </Badge>
          )}
          {isFollowUpStage && totalFollowUpDays > 0 && (
            <Badge variant="outline" className="text-[9px] bg-chart-5/10 text-chart-5 border-0 px-1 py-0 h-4">
              🔄 {totalFollowUpDays}d total
            </Badge>
          )}
        </div>

        {/* Excess attempts warning */}
        {showExcessWarning && (
          <div className="bg-destructive/10 rounded px-1.5 py-0.5 mb-1">
            <p className="text-[8px] text-destructive font-medium">
              ⚠️ Excesso de tentativas neste período – pode reduzir conversão
            </p>
          </div>
        )}

        {/* Paciente Amigo Badge - only for fechado */}
        {lead.status === 'fechado' && friendlyData && (
          <div className="mb-1">
            <Badge variant="outline" className={cn(
              "text-[9px] border-0 font-medium px-1 py-0 h-4",
              friendlyData.friendly_patient ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              🤝 {friendlyData.friendly_patient ? 'Amigo ✓' : 'Amigo ✗'}
            </Badge>
          </div>
        )}

        {/* Row 3: Value + quick actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-0.5">
            <DollarSign className="h-3 w-3 text-success" />
            <span className="font-bold text-[11px]">
              {formatCurrency(lead.treatment_value || 0)}
            </span>
          </div>
          <div className="flex gap-0">
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-5/10 hover:text-chart-5"
              onClick={(e) => { e.stopPropagation(); onAddNote?.(lead); }}>
              <StickyNote className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-chart-2/10 hover:text-chart-2"
              onClick={(e) => { e.stopPropagation(); onCall?.(lead); window.open(`tel:${lead.phone}`, '_blank'); }}>
              <Phone className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-success/10 hover:text-success"
              onClick={(e) => { e.stopPropagation(); const phone = lead.whatsapp || lead.phone; window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); }}>
              <MessageSquare className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
