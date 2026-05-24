import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  Zap,
  Phone,
  DollarSign,
  ArrowRight,
  TrendingUp,
  UserX,
  Clock,
  ListTodo,
  MessageSquare,
  Sparkles,
  Search,
  Flame,
  CreditCard,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmartAlerts, SmartAlert, SmartAlertLevel, SmartAlertType, AlertPriority } from '@/hooks/useSmartAlerts';

const typeIcon: Record<SmartAlertType, React.ElementType> = {
  lead_stagnant: Clock,
  no_payment_after_attendance: DollarSign,
  no_show_not_rescued: UserX,
  followup_stalled: MessageSquare,
  task_overdue: ListTodo,
  ready_to_close: TrendingUp,
  credit_liberado: CreditCard,
  no_response: HelpCircle,
  lost_interest: XCircle,
  budget_stalled: DollarSign,
};

const priorityConfig: Record<AlertPriority, { label: string; className: string; pulse?: boolean }> = {
  urgent: { label: 'Urgente', className: 'bg-destructive text-destructive-foreground', pulse: true },
  high: { label: 'Alta', className: 'bg-warning text-warning-foreground' },
  medium: { label: 'Média', className: 'bg-chart-2/20 text-chart-2' },
  low: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
};

const columnConfig: Record<SmartAlertLevel, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  headerBg: string;
  border: string;
  ring: string;
  accent: string;
  cardBorder: string;
}> = {
  critical: {
    title: 'Críticos',
    subtitle: 'Ação imediata',
    icon: AlertTriangle,
    headerBg: 'bg-gradient-to-br from-destructive/15 to-destructive/5',
    border: 'border-destructive/30',
    ring: 'ring-destructive/20',
    accent: 'text-destructive',
    cardBorder: 'border-l-destructive',
  },
  attention: {
    title: 'Atenção',
    subtitle: 'Monitorar de perto',
    icon: Clock,
    headerBg: 'bg-gradient-to-br from-warning/15 to-warning/5',
    border: 'border-warning/30',
    ring: 'ring-warning/20',
    accent: 'text-warning',
    cardBorder: 'border-l-warning',
  },
  opportunity: {
    title: 'Oportunidades',
    subtitle: 'Pronto para fechar',
    icon: Sparkles,
    headerBg: 'bg-gradient-to-br from-success/15 to-success/5',
    border: 'border-success/30',
    ring: 'ring-success/20',
    accent: 'text-success',
    cardBorder: 'border-l-success',
  },
};

type QuickFilter = 'all' | 'today' | '7d' | '30d' | 'no_response' | 'top_value';

function formatRelative(date: Date | null): string {
  if (!date) return 'Sem interação';
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`;
  return `${Math.floor(days / 30)}m atrás`;
}

function AlertCard({ alert, onViewLead }: { alert: SmartAlert; onViewLead: (id: string) => void }) {
  const Icon = typeIcon[alert.type];
  const col = columnConfig[alert.level];
  const prio = priorityConfig[alert.priority];
  const isHot = alert.priority === 'urgent' || (alert.level === 'opportunity' && alert.potentialValue >= 5000);

  return (
    <div
      onClick={() => onViewLead(alert.leadId)}
      className={cn(
        'group relative bg-card rounded-lg border border-l-4 p-3 cursor-pointer',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-foreground/20',
        col.cardBorder,
        isHot && 'ring-1',
        isHot && col.ring
      )}
    >
      {isHot && (
        <div className="absolute -top-1.5 -right-1.5">
          <div className={cn('h-3 w-3 rounded-full animate-pulse', col.accent.replace('text-', 'bg-'))} />
        </div>
      )}

      <div className="flex items-start gap-2.5 mb-2">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/60', col.accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-semibold truncate">{alert.leadName}</p>
            {isHot && <Flame className="h-3 w-3 text-destructive shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{alert.title}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-2">
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
          {alert.leadStatusLabel}
        </Badge>
        <Badge className={cn('text-[10px] h-5 px-1.5 border-0', prio.className, prio.pulse && 'animate-pulse')}>
          {prio.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          <span>{alert.daysInStage}d parado</span>
        </div>
        {alert.potentialValue > 0 && (
          <div className="flex items-center gap-1 justify-end font-semibold text-foreground">
            R$ {alert.potentialValue.toLocaleString('pt-BR')}
          </div>
        )}
        <div className="col-span-2 truncate">Última: {formatRelative(alert.lastInteractionAt)}</div>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 flex-1 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://wa.me/55${alert.leadPhone.replace(/\D/g, '')}`, '_blank');
          }}
        >
          <Phone className="h-3 w-3 mr-1" /> Contato
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 flex-1 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            onViewLead(alert.leadId);
          }}
        >
          Abrir <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function Column({
  level,
  alerts,
  onViewLead,
}: {
  level: SmartAlertLevel;
  alerts: SmartAlert[];
  onViewLead: (id: string) => void;
}) {
  const cfg = columnConfig[level];
  const Icon = cfg.icon;

  return (
    <div className={cn('flex flex-col rounded-xl border bg-muted/20 overflow-hidden', cfg.border)}>
      <div className={cn('px-4 py-3 border-b', cfg.headerBg, cfg.border)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('h-8 w-8 rounded-lg bg-card flex items-center justify-center shrink-0', cfg.accent)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className={cn('text-sm font-bold leading-tight', cfg.accent)}>{cfg.title}</h3>
              <p className="text-[10px] text-muted-foreground truncate">{cfg.subtitle}</p>
            </div>
          </div>
          <Badge className={cn('h-6 min-w-[28px] justify-center font-bold', cfg.accent, 'bg-card border')}>
            {alerts.length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[480px] min-h-[200px]">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
            <Icon className="h-8 w-8 opacity-20 mb-2" />
            <p className="text-xs">Nenhum paciente nesta categoria</p>
          </div>
        ) : (
          alerts.map((a) => <AlertCard key={a.id} alert={a} onViewLead={onViewLead} />)
        )}
      </div>
    </div>
  );
}

const FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'no_response', label: 'Sem resposta' },
  { key: 'top_value', label: 'Maior valor' },
];

export function SmartAlertsWidget() {
  const { alerts, counts } = useSmartAlerts();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<QuickFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = alerts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.leadName.toLowerCase().includes(q));
    }
    switch (filter) {
      case 'today':
        list = list.filter((a) => a.daysInStage <= 1);
        break;
      case '7d':
        list = list.filter((a) => a.daysInStage <= 7);
        break;
      case '30d':
        list = list.filter((a) => a.daysInStage <= 30);
        break;
      case 'no_response':
        list = list.filter((a) => a.type === 'no_response' || !a.lastInteractionAt);
        break;
      case 'top_value':
        list = [...list].sort((a, b) => b.potentialValue - a.potentialValue);
        break;
    }
    return list;
  }, [alerts, filter, search]);

  const byLevel = useMemo(
    () => ({
      critical: filtered.filter((a) => a.level === 'critical'),
      attention: filtered.filter((a) => a.level === 'attention'),
      opportunity: filtered.filter((a) => a.level === 'opportunity'),
    }),
    [filtered]
  );

  const handleViewLead = (leadId: string) => {
    navigate(`/funil?leadId=${leadId}`);
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Zap className="h-6 w-6 text-success" />
          </div>
          <p className="text-base font-semibold">Tudo em dia!</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum alerta inteligente no momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b bg-gradient-to-r from-card to-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-warning/20 to-destructive/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Alertas Inteligentes
                <Badge variant="secondary" className="text-[10px] h-5">
                  {counts.total}
                </Badge>
              </h2>
              <p className="text-[11px] text-muted-foreground">Pacientes que precisam da sua atenção agora</p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Column level="critical" alerts={byLevel.critical} onViewLead={handleViewLead} />
          <Column level="attention" alerts={byLevel.attention} onViewLead={handleViewLead} />
          <Column level="opportunity" alerts={byLevel.opportunity} onViewLead={handleViewLead} />
        </div>
      </CardContent>
    </Card>
  );
}
