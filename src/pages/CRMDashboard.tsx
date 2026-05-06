import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  UserPlus, 
  ArrowRightLeft, 
  Calendar, 
  StickyNote, 
  Phone, 
  DollarSign,
  Edit,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ACTIVITY_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  lead_created: { icon: UserPlus, color: 'bg-success/10 text-success', label: 'Lead Criado' },
  status_changed: { icon: ArrowRightLeft, color: 'bg-primary/10 text-primary', label: 'Status Alterado' },
  task_created: { icon: Calendar, color: 'bg-warning/10 text-warning', label: 'Tarefa Criada' },
  task_completed: { icon: CheckCircle, color: 'bg-success/10 text-success', label: 'Tarefa Concluída' },
  note_added: { icon: StickyNote, color: 'bg-chart-5/10 text-chart-5', label: 'Nota Adicionada' },
  call_logged: { icon: Phone, color: 'bg-chart-2/10 text-chart-2', label: 'Ligação Registrada' },
  appointment_scheduled: { icon: Calendar, color: 'bg-primary/10 text-primary', label: 'Agendamento' },
  value_updated: { icon: DollarSign, color: 'bg-success/10 text-success', label: 'Valor Atualizado' },
  lead_edited: { icon: Edit, color: 'bg-muted text-muted-foreground', label: 'Lead Editado' },
};

function ActivityItem({ activity }: { activity: any }) {
  const config = ACTIVITY_CONFIG[activity.activity_type] || { 
    icon: Activity, 
    color: 'bg-muted text-muted-foreground', 
    label: 'Atividade' 
  };
  const Icon = config.icon;

  return (
    <div className="flex gap-4 py-4 border-b border-border last:border-0">
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
        config.color
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{activity.title}</p>
            {activity.lead && (
              <p className="text-xs text-muted-foreground">
                Lead: {activity.lead.name}
              </p>
            )}
            {activity.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {activity.description}
              </p>
            )}
            {activity.old_value && activity.new_value && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">
                  {activity.old_value}
                </Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Badge variant="outline" className="text-[10px] bg-primary/10">
                  {activity.new_value}
                </Badge>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <Badge variant="secondary" className="text-[10px] mb-1">
              {config.label}
            </Badge>
            <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(activity.created_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </p>
            {activity.profiles && (
              <p className="text-[10px] text-muted-foreground">
                por {activity.profiles.full_name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CRMDashboard = () => {
  const { data: activities, isLoading } = useActivityLogs(100);

  // Group activities by date
  const groupedActivities = activities?.reduce((acc, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  return (
    <AppLayout title="CRM - Atividades Recentes">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Timeline */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Timeline de Atividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4 py-4">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities && activities.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-14rem)]">
                  {Object.entries(groupedActivities || {}).map(([date, dateActivities]) => (
                    <div key={date}>
                      <div className="sticky top-0 bg-background py-2 z-10">
                        <Badge variant="outline" className="text-xs">
                          {date}
                        </Badge>
                      </div>
                      {dateActivities?.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                      ))}
                    </div>
                  ))}
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma atividade registrada</p>
                  <p className="text-xs mt-1">
                    As atividades do CRM aparecerão aqui em tempo real
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atividades Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activities?.filter(a => {
                  const today = new Date().toDateString();
                  return new Date(a.created_at).toDateString() === today;
                }).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status Alterados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {activities?.filter(a => a.activity_type === 'status_changed').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tarefas Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {activities?.filter(a => a.activity_type === 'task_completed').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Notas e Interações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-5">
                {activities?.filter(a => 
                  a.activity_type === 'note_added' || 
                  a.activity_type === 'call_logged'
                ).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default CRMDashboard;
