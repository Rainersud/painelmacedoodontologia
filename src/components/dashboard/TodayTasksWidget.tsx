import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ClipboardList, Loader2, Undo2, Phone, MessageSquare, Calendar, CheckSquare, Clock, User } from 'lucide-react';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TASK_TYPE_CONFIG, PRIORITY_CONFIG } from '@/types/crm';

export function TodayTasksWidget() {
  const today = new Date();
  const { data: tasks, isLoading } = useTasks({ date: today });
  const updateTask = useUpdateTask();

  const pending = tasks?.filter(t => t.status === 'pendente') || [];
  const completed = tasks?.filter(t => t.status === 'concluido') || [];
  const total = tasks?.length || 0;
  const overdue = pending.filter(t => new Date(t.scheduled_at) < new Date());

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ id: taskId, updates: { status: 'concluido' as any } });
  };

  const handleReopen = (taskId: string) => {
    updateTask.mutate({ id: taskId, updates: { status: 'pendente' as any } });
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
    <Card className="monday-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Tarefas do Dia
          </CardTitle>
          <div className="flex items-center gap-2">
            {overdue.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {overdue.length} atrasada{overdue.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {completed.length}/{total} concluídas
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        {total > 0 && (
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div 
              className="bg-success h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${(completed.length / total) * 100}%` }} 
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma tarefa para hoje</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Tasks */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-1.5">
                  <Circle className="h-2.5 w-2.5 fill-warning text-warning" />
                  Pendentes ({pending.length})
                </p>
                <div className="space-y-1.5">
                  {pending.map(task => {
                    const TaskIcon = getTaskIcon(task.task_type);
                    const isPast = new Date(task.scheduled_at) < new Date();
                    const typeConfig = TASK_TYPE_CONFIG[task.task_type];
                    const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;
                    
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border transition-colors group",
                          isPast 
                            ? "bg-destructive/5 border-destructive/30 hover:bg-destructive/10" 
                            : "bg-warning/5 border-warning/20 hover:bg-warning/10"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-success"
                          onClick={() => handleComplete(task.id)}
                          disabled={updateTask.isPending}
                          title="Marcar como concluída"
                        >
                          <Circle className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {task.lead && (
                              <span className="text-primary font-medium flex items-center gap-0.5">
                                <User className="h-3 w-3" />
                                {task.lead.name}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.scheduled_at), 'HH:mm')}
                            </span>
                            {isPast && (
                              <Badge variant="destructive" className="text-[9px] h-4">Atrasada</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge className={cn("text-[10px]", typeConfig.color)}>
                            <TaskIcon className="h-3 w-3 mr-0.5" />
                            {typeConfig.label}
                          </Badge>
                          {priorityConfig && task.priority !== 'normal' && (
                            <Badge variant="outline" className={cn("text-[9px]", priorityConfig.color)}>
                              {priorityConfig.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completed.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-success uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-success" />
                  Concluídas ({completed.length})
                </p>
                <div className="space-y-1.5">
                  {completed.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-success/5 border border-success/10"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate line-through text-muted-foreground">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.lead && (
                            <span>{task.lead.name}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1 text-warning border-warning/30 hover:bg-warning/10"
                        onClick={() => handleReopen(task.id)}
                        disabled={updateTask.isPending}
                      >
                        <Undo2 className="h-3 w-3" />
                        Reverter para Pendente
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
