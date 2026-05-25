import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Zap,
  Phone,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { useSmartAlerts, SmartAlert, SmartAlertLevel } from '@/hooks/useSmartAlerts';

type Period = 'hoje' | 'semana' | 'mes';

const columnConfig: Record<SmartAlertLevel, {
  title: string;
  icon: React.ElementType;
  headerBg: string;
  border: string;
  accent: string;
  cardBorder: string;
}> = {
  attention: {
    title: 'Atenção',
    icon: Clock,
    headerBg: 'bg-gradient-to-br from-warning/15 to-warning/5',
    border: 'border-warning/30',
    accent: 'text-warning',
    cardBorder: 'border-l-warning',
  },
  critical: {
    title: 'Crítico',
    icon: AlertTriangle,
    headerBg: 'bg-gradient-to-br from-destructive/15 to-destructive/5',
    border: 'border-destructive/30',
    accent: 'text-destructive',
    cardBorder: 'border-l-destructive',
  },
  opportunity: {
    title: 'Oportunidades',
    icon: Sparkles,
    headerBg: 'bg-gradient-to-br from-success/15 to-success/5',
    border: 'border-success/30',
    accent: 'text-success',
    cardBorder: 'border-l-success',
  },
};

function AlertCard({ alert, onViewLead }: { alert: SmartAlert; onViewLead: (id: string) => void }) {
  const col = columnConfig[alert.level];

  return (
    <div
      onClick={() => onViewLead(alert.leadId)}
      className={cn(
        'group bg-card rounded-lg border border-l-4 p-3 cursor-pointer',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        col.cardBorder,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold truncate flex-1">{alert.leadName}</p>
        {alert.potentialValue > 0 && (
          <span className="text-xs font-semibold text-foreground shrink-0">
            R$ {alert.potentialValue.toLocaleString('pt-BR')}
          </span>
        )}
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
            <h3 className={cn('text-sm font-bold leading-tight', cfg.accent)}>{cfg.title}</h3>
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
            <p className="text-xs">Nenhum lead nesta categoria</p>
          </div>
        ) : (
          alerts.map((a) => <AlertCard key={a.id} alert={a} onViewLead={onViewLead} />)
        )}
      </div>
    </div>
  );
}

export function SmartAlertsWidget() {
  const { alerts, counts } = useSmartAlerts();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('mes');

  const filtered = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (period === 'hoje') start = startOfDay(now);
    else if (period === 'semana') start = startOfWeek(now, { weekStartsOn: 1 });
    else start = startOfMonth(now);

    return alerts.filter((a) => {
      // mantém alertas cujo "início do estágio" está dentro do período visualizado
      if (!a.stageEnteredAt) return true;
      return a.stageEnteredAt >= start;
    });
  }, [alerts, period]);

  const byLevel = useMemo(
    () => ({
      attention: filtered.filter((a) => a.level === 'attention'),
      critical: filtered.filter((a) => a.level === 'critical'),
      opportunity: filtered.filter((a) => a.level === 'opportunity'),
    }),
    [filtered],
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
              <p className="text-[11px] text-muted-foreground">
                Painel informativo — não altera o funil
              </p>
            </div>
          </div>

          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="hoje" className="h-6 text-xs px-3">Hoje</TabsTrigger>
              <TabsTrigger value="semana" className="h-6 text-xs px-3">Semana</TabsTrigger>
              <TabsTrigger value="mes" className="h-6 text-xs px-3">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Column level="attention" alerts={byLevel.attention} onViewLead={handleViewLead} />
          <Column level="critical" alerts={byLevel.critical} onViewLead={handleViewLead} />
          <Column level="opportunity" alerts={byLevel.opportunity} onViewLead={handleViewLead} />
        </div>
      </CardContent>
    </Card>
  );
}
