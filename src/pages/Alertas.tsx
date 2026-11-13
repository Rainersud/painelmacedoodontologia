import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allPages } from '@/lib/paging';
import { SmartAlertsWidget } from '@/components/dashboard/SmartAlertsWidget';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  AlertTriangle, 
  Target, 
  Clock, 
  TrendingDown,
  CheckCircle2,
  Eye,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AlertType = Database['public']['Enums']['alert_type'];

const alertTypeConfig: Record<AlertType, { label: string; icon: React.ElementType; color: string }> = {
  lead_nao_respondido: { 
    label: 'Lead Não Respondido', 
    icon: Clock, 
    color: 'bg-warning/10 text-warning-strong border-warning/20' 
  },
  meta_nao_atingida: { 
    label: 'Meta Não Atingida', 
    icon: Target, 
    color: 'bg-destructive/10 text-destructive border-destructive/20' 
  },
  lembrete_followup: { 
    label: 'Lembrete de Follow-up', 
    icon: Bell, 
    color: 'bg-primary/10 text-primary border-primary/20' 
  },
  kpi_baixo: { 
    label: 'KPI Baixo', 
    icon: TrendingDown, 
    color: 'bg-destructive/10 text-destructive border-destructive/20' 
  },
  indicacao_compareceu: {
    label: 'Indicação Compareceu',
    icon: Bell,
    color: 'bg-chart-4/10 text-chart-4 border-chart-4/20'
  },
  indicacao_converteu: {
    label: 'Indicação Converteu',
    icon: TrendingDown,
    color: 'bg-chart-5/10 text-chart-5 border-chart-5/20'
  },
};

export default function Alertas() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          leads:lead_id (name, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // os 1.000 alertas mais recentes; os antigos ficam no banco
      
      if (error) throw error;
      return data;
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Todos os alertas marcados como lidos');
    },
  });

  const unreadAlerts = alerts?.filter(a => !a.is_read) || [];
  const readAlerts = alerts?.filter(a => a.is_read) || [];

  const AlertCard = ({ alert }: { alert: any }) => {
    const config = alertTypeConfig[alert.type as AlertType];
    const Icon = config.icon;

    return (
      <div
        className={cn(
          "p-4 rounded-xl border transition-all duration-200",
          alert.is_read ? "bg-muted/30 border-border" : "bg-card border-l-4",
          !alert.is_read && (
            alert.type === 'lead_nao_respondido' ? 'border-l-warning' :
            alert.type === 'lembrete_followup' ? 'border-l-primary' :
            'border-l-destructive'
          )
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", config.color.split(' ')[0])}>
              <Icon className={cn("h-5 w-5", config.color.split(' ')[1])} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{alert.title}</h4>
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
                {!alert.is_read && (
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
              {alert.leads && (
                <p className="text-sm">
                  Lead: <span className="font-medium">{alert.leads.name}</span> - {alert.leads.phone}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          {!alert.is_read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAsRead.mutate(alert.id)}
              className="shrink-0"
            >
              <Eye className="h-4 w-4 mr-1" />
              Marcar como lido
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Alertas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">Central de Alertas</h2>
              <p className="text-sm text-muted-foreground">
                {unreadAlerts.length} alertas não lidos
              </p>
            </div>
          </div>
          {unreadAlerts.length > 0 && (
            <Button variant="outline" onClick={() => markAllAsRead.mutate()}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar todos como lidos
            </Button>
          )}
        </div>

        {/* Alertas calculados do funil (os mesmos do Comercial 1) */}
        <SmartAlertsWidget />

        {/* Alertas registrados */}
        <h3 className="text-sm font-semibold text-muted-foreground">Alertas registrados</h3>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(alertTypeConfig).map(([type, config]) => {
            const count = alerts?.filter(a => a.type === type && !a.is_read).length || 0;
            const Icon = config.icon;
            return (
              <Card key={type} className={cn("border-0 shadow-sm", count > 0 && config.color.split(' ')[0])}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", config.color.split(' ')[0])}>
                    <Icon className={cn("h-5 w-5", config.color.split(' ')[1])} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alerts List */}
        <Tabs defaultValue="unread" className="space-y-4">
          <TabsList>
            <TabsTrigger value="unread" className="gap-2">
              Não Lidos
              {unreadAlerts.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {unreadAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : unreadAlerts.length === 0 ? (
              <Card className="monday-card border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success/50" />
                  <p className="text-muted-foreground">Nenhum alerta pendente!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você está em dia com todas as notificações
                  </p>
                </CardContent>
              </Card>
            ) : (
              unreadAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : alerts?.length === 0 ? (
              <Card className="monday-card border-dashed">
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhum alerta registrado</p>
                </CardContent>
              </Card>
            ) : (
              alerts?.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
