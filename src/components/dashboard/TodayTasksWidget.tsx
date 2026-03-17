import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ClipboardList, Loader2 } from 'lucide-react';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function TodayTasksWidget() {
  const today = new Date();
  const { data: tasks, isLoading } = useTasks({ date: today });
  const updateTask = useUpdateTask();

  const pending = tasks?.filter(t => t.status === 'pendente') || [];
  const completed = tasks?.filter(t => t.status === 'concluido') || [];
  const total = tasks?.length || 0;

  const handleToggle = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'concluido' ? 'pendente' : 'concluido';
    updateTask.mutate({ id: taskId, updates: { status: newStatus as any } });
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
            <Badge variant="outline" className="text-xs">
              {completed.length}/{total} concluídas
            </Badge>
          </div>
        </div>
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
                  {pending.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors group"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-success"
                        onClick={() => handleToggle(task.id, task.status)}
                        disabled={updateTask.isPending}
                      >
                        <Circle className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.lead && (
                            <span className="text-primary font-medium">{task.lead.name}</span>
                          )}
                          <span>{format(new Date(task.scheduled_at), 'HH:mm')}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {task.task_type === 'ligacao' ? '📞' : task.task_type === 'followup' ? '💬' : '📋'} 
                      </Badge>
                    </div>
                  ))}
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
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-success/5 border border-success/10 opacity-70 hover:opacity-100 transition-opacity group"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-success"
                        onClick={() => handleToggle(task.id, task.status)}
                        disabled={updateTask.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate line-through text-muted-foreground">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.lead && (
                            <span>{task.lead.name}</span>
                          )}
                        </div>
                      </div>
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
