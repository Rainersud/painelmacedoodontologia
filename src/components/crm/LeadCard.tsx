import { memo } from 'react';
import { LeadTemperatureBadge } from './LeadTemperature';
import { CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ReferralPopover } from './ReferralPopover';
import { IndicacaoBadge } from './IndicacaoBadge';
import { useLeadReferralTagsEnhanced } from '@/hooks/useReferralTagsEnhanced';
import { getDaysInStage, type Lead } from '@/types/crm';
import { useLeadAlerts } from '@/hooks/useLeadAlerts';
import { useFriendlyPatientStatusBulk } from '@/hooks/useFriendlyPatient';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onDragStart?: (e: React.DragEvent, lead: Lead) => void;
  onClick?: (lead: Lead) => void;
  onAddNote?: (lead: Lead) => void;
  onCall?: (lead: Lead) => void;
  compact?: boolean;
  /** Modo ultra enxuto: apenas nome, valor e sinal de alerta (reduz a rolagem do funil) */
  dense?: boolean;
  index?: number;
}

function LeadCardComponent({ 
  lead, 
  onDragStart,
  onClick,
  onAddNote,
  onCall,
  compact = false,
  dense = false,
  index = 0,
}: LeadCardProps) {
  const { data: refTags } = useLeadReferralTagsEnhanced(lead.id);
  const { data: friendlyData } = useFriendlyPatientStatusBulk(lead.status === 'fechado' ? lead.id : undefined);
  const leadAlerts = useLeadAlerts(lead);
  const hasTask = lead.tasks && lead.tasks.length > 0;
  const hasReferralData = refTags && (refTags.isReferred || refTags.isReferrer || refTags.pendingBonuses.length > 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

  const days = getDaysInStage(lead.stage_entered_at);
  const isFollowUpStage = lead.status?.startsWith('followup_') || lead.status === 'nao_respondeu';

  // Excess attempts warning (>2 same day approximation based on contact_attempts and days)
  const showExcessWarning = isFollowUpStage && (lead.contact_attempts ?? 0) > 0 && days === 0 && (lead.contact_attempts ?? 0) >= 2;
  // Get the highest priority alert for the card border
  const topAlert = leadAlerts[0];
  const alertBorderClass = topAlert?.level === 'critical' ? 'border-l-4 border-l-destructive' :
    topAlert?.level === 'opportunity' ? 'border-l-4 border-l-success' :
    topAlert?.level === 'attention' ? 'border-l-4 border-l-warning' : '';
  const isEven = index % 2 === 0;

  if (dense) {
    const dotClass =
      topAlert?.level === 'critical' ? 'bg-destructive' :
      topAlert?.level === 'opportunity' ? 'bg-success' :
      topAlert?.level === 'attention' ? 'bg-warning' : 'bg-muted-foreground/30';

    return (
      <Card
        draggable={!!onDragStart}
        onDragStart={(e) => onDragStart?.(e, lead)}
        onClick={() => onClick?.(lead)}
        title={`${lead.name}${topAlert ? ` — ${topAlert.title}` : ''}`}
        className={cn(
          "cursor-pointer hover:shadow-md transition-all duration-150 border shadow-none relative",
          isEven ? "bg-card" : "bg-accent/50",
          onDragStart && "active:cursor-grabbing",
          alertBorderClass
        )}
      >
        <CardContent className="px-1.5 py-1 flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
          <p className="font-medium truncate text-[11px] flex-1 min-w-0">{lead.name}</p>
          {hasTask && <CheckSquare className="h-2.5 w-2.5 text-warning-strong shrink-0" />}
          {(lead.budget_value || lead.treatment_value || 0) > 0 && (
            <span className="font-semibold text-[10px] text-muted-foreground shrink-0">
              {formatCurrency(lead.budget_value || lead.treatment_value || 0)}
            </span>
          )}
        </CardContent>
      </Card>
    );
  }

  // Mesmo formato dos cartões do CRC: nome, o que está acontecendo, telefone e valor.
  const product = lead.interest_product === 'implante' ? 'Implante'
    : lead.interest_product === 'protese_flexivel' ? 'Prótese flexível'
    : lead.interest_product === 'protese_total' ? 'Prótese total'
    : lead.interest_product || '';
  const appt = lead.scheduled_appointment_at ? new Date(lead.scheduled_appointment_at) : null;
  const reason = topAlert?.title
    ?? (appt && ['agendou', 'consulta_agendada', 'confirmado', 'faltou'].includes(lead.status)
      ? `Consulta ${appt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })} às ${appt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`
      : null)
    ?? (isFollowUpStage && (lead.contact_attempts ?? 0) > 0 ? `${lead.contact_attempts} de 9 tentativas` : null)
    ?? [product, days > 0 ? `${days} ${days === 1 ? 'dia' : 'dias'} nesta etapa` : 'Entrou hoje nesta etapa'].filter(Boolean).join(' · ');
  const value = lead.budget_value || lead.treatment_value || 0;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(lead); } }}
      className={cn(
        'w-full text-left rounded-lg border bg-background px-2.5 py-2 shadow-sm transition cursor-pointer',
        'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        topAlert?.level === 'critical' && 'border-l-2 border-l-destructive',
        topAlert?.level === 'opportunity' && 'border-l-2 border-l-success',
        onDragStart && 'active:cursor-grabbing',
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium truncate flex-1 min-w-0">{lead.name}</p>
        <IndicacaoBadge source={lead.source} size="xs" />
        {hasReferralData && refTags && (
          <span onClick={(e) => e.stopPropagation()}><ReferralPopover lead={lead} refTags={refTags} /></span>
        )}
        <LeadTemperatureBadge rating={lead.interest_rating} />
      </div>
      <p className={cn('text-xs mt-0.5 line-clamp-2',
        topAlert?.level === 'critical' ? 'text-destructive' : 'text-muted-foreground')}>
        {reason}
      </p>
      {(showExcessWarning || lead.no_show_count > 0 || (lead.status === 'fechado' && friendlyData?.friendly_patient)) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {lead.no_show_count > 0 && (
            <span className="rounded px-1 text-[10px] bg-destructive/10 text-destructive">{lead.no_show_count}x falta</span>
          )}
          {showExcessWarning && (
            <span className="rounded px-1 text-[10px] bg-destructive/10 text-destructive">Muitas tentativas hoje</span>
          )}
          {lead.status === 'fechado' && friendlyData?.friendly_patient && (
            <span className="rounded px-1 text-[10px] bg-primary/10 text-primary">Paciente amigo</span>
          )}
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate tabular-nums">{lead.phone}</span>
        {value > 0 && <span className="shrink-0 font-semibold text-foreground tabular-nums">{formatCurrency(value)}</span>}
      </div>
    </div>
  );
}

export const LeadCard = memo(LeadCardComponent);

