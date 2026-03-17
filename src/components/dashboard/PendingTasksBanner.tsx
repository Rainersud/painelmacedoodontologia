import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Circle, Clock, Phone, MessageSquare, Calendar, CheckSquare, Undo2 } from 'lucide-react';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TASK_TYPE_CONFIG } from '@/types/crm';

export function PendingTasksBanner() {
  const today = new Date();
  const { data: tasks, isLoading } = useTasks({ date: today });
  const updateTask = useUpdateTask();

  const pending = tasks?.filter(t => t.status === 'pendente') || [];
  const overdue = pending.filter(t => new Date(t.scheduled_at) < new Date());

  if (isLoading || pending.length === 0) return null;

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ id: taskId, updates: { status: 'concluido' as any } });
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'ligacao': return Phone;
      case 'followup': return MessageSquare;
      case 'compromisso': return Calendar;
      default: return CheckSquare;
    }
  };

  return (
    <Card className={cn(
      "border-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300",
      overdue.length > 0 
        ? "border-destructive/40 bg-destructive/5" 
        : "border-warning/40 bg-warning/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
            overdue.length > 0 ? "bg-destructive/15" : "bg-warning/15"
          )}>
            <AlertTriangle className={cn(
              "h-5 w-5",
              overdue.length > 0 ? "text-destructive" : "text-warning"
            )} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">
              ⚡ {pending.length} tarefa{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''} hoje
            </h3>
            {overdue.length > 0 && (
              <p className="text-xs text-destructive font-medium">
                {overdue.length} atrasada{overdue.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-bold",
              overdue.length > 0 
                ? "border-destructive/30 text-destructive bg-destructive/10" 
                : "border-warning/30 text-warning bg-warning/10"
            )}
          >
            {pending.length}
          </Badge>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {pending.map(task => {
            const TaskIcon = getTaskIcon(task.task_type);
            const isPast = new Date(task.scheduled_at) < new Date();
            const typeConfig = TASK_TYPE_CONFIG[task.task_type];
            
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg border transition-all group",
                  isPast 
                    ? "bg-destructive/5 border-destructive/20" 
                    : "bg-background/80 border-border/50"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-success hover:bg-success/10"
                  onClick={() => handleComplete(task.id)}
                  disabled={updateTask.isPending}
                  title="Concluir tarefa"
                >
                  <Circle className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {task.lead && (
                      <span className="text-primary font-medium">{task.lead.name}</span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(task.scheduled_at), 'HH:mm')}
                    </span>
                    {isPast && (
                      <span className="text-destructive font-semibold">Atrasada!</span>
                    )}
                  </div>
                </div>
                <Badge className={cn("text-[9px] h-5 shrink-0", typeConfig.color)}>
                  <TaskIcon className="h-2.5 w-2.5 mr-0.5" />
                  {typeConfig.label}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] gap-1 text-success opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleComplete(task.id)}
                  disabled={updateTask.isPending}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Concluir
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
