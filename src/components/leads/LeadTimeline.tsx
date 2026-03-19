import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLeadTimeline, TimelineEvent } from '@/hooks/useLeadTimeline';
import { 
  MessageCircle, 
  PhoneIncoming, 
  PhoneOutgoing,
  Calendar,
  StickyNote,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  UserPlus,
  ArrowRight,
  CheckCircle,
  ListTodo,
  DollarSign,
  Gift,
  Edit,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  lead_created: { icon: UserPlus, color: 'bg-success/10 text-success border-success/20', label: 'Lead Criado' },
  status_changed: { icon: ArrowRight, color: 'bg-primary/10 text-primary border-primary/20', label: 'Mudança de Etapa' },
  task_created: { icon: ListTodo, color: 'bg-warning/10 text-warning border-warning/20', label: 'Tarefa Criada' },
  task_completed: { icon: CheckCircle, color: 'bg-success/10 text-success border-success/20', label: 'Tarefa Concluída' },
  task_rescheduled: { icon: RefreshCw, color: 'bg-warning/10 text-warning border-warning/20', label: 'Tarefa Reagendada' },
  note_added: { icon: StickyNote, color: 'bg-accent text-accent-foreground border-accent', label: 'Nota' },
  call_logged: { icon: PhoneOutgoing, color: 'bg-chart-2/10 text-chart-2 border-chart-2/20', label: 'Ligação Registrada' },
  appointment_scheduled: { icon: Calendar, color: 'bg-primary/10 text-primary border-primary/20', label: 'Consulta Agendada' },
  value_updated: { icon: TrendingUp, color: 'bg-success/10 text-success border-success/20', label: 'Valor Atualizado' },
  lead_edited: { icon: Edit, color: 'bg-muted text-muted-foreground border-muted', label: 'Dados Editados' },
  payment_registered: { icon: DollarSign, color: 'bg-success/10 text-success border-success/20', label: 'Pagamento' },
  referral_added: { icon: Gift, color: 'bg-chart-5/10 text-chart-5 border-chart-5/20', label: 'Indicação' },
  whatsapp_inbound: { icon: ArrowDownLeft, color: 'bg-success/10 text-success border-success/20', label: 'WhatsApp Recebido' },
  whatsapp_outbound: { icon: ArrowUpRight, color: 'bg-primary/10 text-primary border-primary/20', label: 'WhatsApp Enviado' },
  call_inbound: { icon: PhoneIncoming, color: 'bg-chart-2/10 text-chart-2 border-chart-2/20', label: 'Ligação Recebida' },
  call_outbound: { icon: PhoneOutgoing, color: 'bg-warning/10 text-warning border-warning/20', label: 'Ligação Realizada' },
  appointment: { icon: Calendar, color: 'bg-primary/10 text-primary border-primary/20', label: 'Consulta' },
  interaction: { icon: MessageCircle, color: 'bg-muted text-muted-foreground border-muted', label: 'Interação' },
  note: { icon: StickyNote, color: 'bg-accent text-accent-foreground border-accent', label: 'Nota' },
};

function getConfig(type: string) {
  return typeConfig[type] || { icon: Clock, color: 'bg-muted text-muted-foreground border-muted', label: type };
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = getConfig(event.type);
  const Icon = config.icon;

  return (
    <div className="flex gap-3 relative">
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
      )}
      
      <div className={cn(
        "relative z-10 h-10 w-10 rounded-full border-2 flex items-center justify-center shrink-0",
        config.color
      )}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-medium">{config.label}</span>
            {event.agentName && (
              <span className="text-xs text-muted-foreground ml-2">por {event.agentName}</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
            {format(event.createdAt, "dd/MM/yy HH:mm", { locale: ptBR })}
          </span>
        </div>
        
        {event.content && (
          <p className="text-sm text-muted-foreground mt-0.5">{event.content}</p>
        )}

        {event.oldValue && event.newValue && (
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{event.oldValue}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="px-1.5 py-0.5 rounded bg-success/10 text-success">{event.newValue}</span>
          </div>
        )}

        {event.metadata?.duration && typeof event.metadata.duration === 'number' && (
          <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full mt-1">
            <Clock className="h-3 w-3" />
            {Math.floor(event.metadata.duration / 60)}:{(event.metadata.duration % 60).toString().padStart(2, '0')}
          </span>
        )}

        <p className="text-[11px] text-muted-foreground/60 mt-1">
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
          <div key={i} className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
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
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhum histórico registrado</p>
        <p className="text-xs mt-1">As ações realizadas neste lead aparecerão aqui automaticamente</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Histórico do Lead ({events.length} {events.length === 1 ? 'registro' : 'registros'})
      </h4>
      {events.map((event, i) => (
        <TimelineItem key={event.id} event={event} isLast={i === events.length - 1} />
      ))}
    </div>
  );
}
