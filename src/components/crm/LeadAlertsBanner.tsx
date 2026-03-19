import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Clock, 
  DollarSign, 
  UserX, 
  MessageSquare, 
  ListTodo, 
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadAlerts, type LeadAlert } from '@/hooks/useLeadAlerts';
import type { Lead } from '@/types/crm';

const alertTypeIcons: Record<string, React.ElementType> = {
  lead_stagnant: Clock,
  no_payment_after_attendance: DollarSign,
  no_show_not_rescued: UserX,
  followup_stalled: MessageSquare,
  task_overdue: ListTodo,
  ready_to_close: TrendingUp,
};

const levelStyles: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  attention: 'bg-warning/10 text-warning border-warning/20',
  opportunity: 'bg-success/10 text-success border-success/20',
};

interface LeadAlertsBannerProps {
  lead: Lead;
}

export function LeadAlertsBanner({ lead }: LeadAlertsBannerProps) {
  const alerts = useLeadAlerts(lead);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-4">
      <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
        <Zap className="h-3.5 w-3.5" />
        Alertas Inteligentes ({alerts.length})
      </h4>
      <div className="space-y-1">
        {alerts.map((alert, i) => {
          const Icon = alertTypeIcons[alert.type] || Zap;
          return (
            <div 
              key={i} 
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border text-xs",
                levelStyles[alert.level]
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">{alert.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
