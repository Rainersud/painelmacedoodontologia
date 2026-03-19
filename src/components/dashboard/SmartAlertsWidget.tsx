import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Zap, 
  Phone, 
  DollarSign, 
  Calendar, 
  ArrowRight, 
  Eye,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  UserX,
  Clock,
  ListTodo,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmartAlerts, SmartAlert, SmartAlertLevel, SmartAlertType } from '@/hooks/useSmartAlerts';

const levelConfig: Record<SmartAlertLevel, { label: string; color: string; borderColor: string; icon: string }> = {
  critical: { label: 'Crítico', color: 'bg-destructive/10 text-destructive', borderColor: 'border-l-destructive', icon: '🔴' },
  attention: { label: 'Atenção', color: 'bg-warning/10 text-warning', borderColor: 'border-l-warning', icon: '🟠' },
  opportunity: { label: 'Oportunidade', color: 'bg-success/10 text-success', borderColor: 'border-l-success', icon: '🟢' },
};

const typeConfig: Record<SmartAlertType, { icon: React.ElementType }> = {
  lead_stagnant: { icon: Clock },
  no_payment_after_attendance: { icon: DollarSign },
  no_show_not_rescued: { icon: UserX },
  followup_stalled: { icon: MessageSquare },
  task_overdue: { icon: ListTodo },
  ready_to_close: { icon: TrendingUp },
};

function AlertItem({ alert, onViewLead }: { alert: SmartAlert; onViewLead: (id: string) => void }) {
  const level = levelConfig[alert.level];
  const type = typeConfig[alert.type];
  const Icon = type.icon;

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border border-l-4 transition-all hover:shadow-md cursor-pointer",
        level.borderColor,
        "bg-card"
      )}
      onClick={() => onViewLead(alert.leadId)}
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", level.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate">{alert.leadName}</span>
            <Badge variant="outline" className={cn("text-[10px] h-5 shrink-0 border-0", level.color)}>
              {level.icon} {level.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{alert.title}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            title="Entrar em contato"
            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${alert.leadPhone.replace(/\D/g, '')}`, '_blank'); }}
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            title="Ver lead no funil"
            onClick={(e) => { e.stopPropagation(); onViewLead(alert.leadId); }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SmartAlertsWidget() {
  const { alerts, counts } = useSmartAlerts();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const displayAlerts = expanded ? alerts : alerts.slice(0, 5);

  const handleViewLead = (leadId: string) => {
    navigate('/funil');
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 text-center">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
            <Zap className="h-5 w-5 text-success" />
          </div>
          <p className="text-sm font-medium">Tudo em dia! ✅</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum alerta inteligente no momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-warning" />
            </div>
            Alertas Inteligentes
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {counts.critical > 0 && (
              <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
                🔴 {counts.critical}
              </Badge>
            )}
            {counts.attention > 0 && (
              <Badge className="bg-warning/10 text-warning border-0 text-xs">
                🟠 {counts.attention}
              </Badge>
            )}
            {counts.opportunity > 0 && (
              <Badge className="bg-success/10 text-success border-0 text-xs">
                🟢 {counts.opportunity}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {displayAlerts.map(alert => (
          <AlertItem key={alert.id} alert={alert} onViewLead={handleViewLead} />
        ))}

        {alerts.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Ver todos ({alerts.length - 5} mais)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
