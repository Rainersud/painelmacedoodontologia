import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLeadTimeline, TimelineEvent } from '@/hooks/useLeadTimeline';
import { 
  MessageCircle, 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing,
  Calendar,
  StickyNote,
  ArrowDownLeft,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const eventTypeConfig: Record<TimelineEvent['type'], { icon: React.ElementType; color: string; label: string }> = {
  whatsapp_inbound: { icon: ArrowDownLeft, color: 'bg-success/10 text-success border-success/20', label: 'WhatsApp Recebido' },
  whatsapp_outbound: { icon: ArrowUpRight, color: 'bg-primary/10 text-primary border-primary/20', label: 'WhatsApp Enviado' },
  call_inbound: { icon: PhoneIncoming, color: 'bg-chart-2/10 text-chart-2 border-chart-2/20', label: 'Ligação Recebida' },
  call_outbound: { icon: PhoneOutgoing, color: 'bg-warning/10 text-warning border-warning/20', label: 'Ligação Realizada' },
  status_change: { icon: Clock, color: 'bg-muted text-muted-foreground border-muted', label: 'Mudança de Status' },
  note: { icon: StickyNote, color: 'bg-accent text-accent-foreground border-accent', label: 'Nota' },
  appointment: { icon: Calendar, color: 'bg-primary/10 text-primary border-primary/20', label: 'Agendamento' },
};

function TimelineItem({ event }: { event: TimelineEvent }) {
  const config = eventTypeConfig[event.type];
  const Icon = config.icon;

  return (
    <div className="flex gap-4 relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
      
      {/* Icon */}
      <div className={cn(
        "relative z-10 h-10 w-10 rounded-full border-2 flex items-center justify-center shrink-0",
        config.color
      )}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{config.label}</span>
          {event.agentName && (
            <span className="text-xs text-muted-foreground">por {event.agentName}</span>
          )}
        </div>
        
        {event.content && (
          <p className="text-sm text-muted-foreground mb-2">{event.content}</p>
        )}

        {event.metadata?.duration && (
          <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {Math.floor(event.metadata.duration / 60)}:{(event.metadata.duration % 60).toString().padStart(2, '0')}
          </span>
        )}

        {event.metadata?.status && event.type === 'appointment' && (
          <span className={cn(
            "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full",
            event.metadata.status === 'compareceu' ? 'bg-success/10 text-success' :
            event.metadata.status === 'cancelado' ? 'bg-destructive/10 text-destructive' :
            event.metadata.status === 'confirmado' ? 'bg-primary/10 text-primary' :
            'bg-muted text-muted-foreground'
          )}>
            {event.metadata.status === 'compareceu' ? 'Compareceu' :
             event.metadata.status === 'cancelado' ? 'Cancelado' :
             event.metadata.status === 'confirmado' ? 'Confirmado' : 'Agendado'}
          </span>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(event.createdAt, { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

interface LeadTimelineProps {
  leadId: string;
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const { data: events, isLoading } = useLeadTimeline(leadId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-48 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhuma interação registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </div>
  );
}
