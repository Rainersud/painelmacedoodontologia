import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, ClipboardList, Loader2, Undo2, Phone, MessageSquare, Calendar, CheckSquare, Clock, User, RefreshCw, AlertCircle, CalendarClock } from 'lucide-react';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TASK_TYPE_CONFIG, PRIORITY_CONFIG } from '@/types/crm';
import { RescheduleDialog } from '@/components/tasks/RescheduleDialog';
import type { Task } from '@/types/crm';

export function TodayTasksWidget() {
  const today = new Date();
  const { data: allTasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const [responseMap, setResponseMap] = useState<Record<string, string>>({});
  const [showResponseFor, setShowResponseFor] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);

  const tasks = allTasks || [];
  const todayStart = startOfDay(today);

  const overdue = tasks.filter(t => t.status === 'pendente' && new Date(t.scheduled_at) < todayStart);
  const todayPending = tasks.filter(t => t.status === 'pendente' && isSameDay(new Date(t.scheduled_at), today));
  const upcoming = tasks.filter(t => t.status === 'pendente' && new Date(t.scheduled_at) > todayStart && !isSameDay(new Date(t.scheduled_at), today));
  const completed = tasks.filter(t => t.status === 'concluido' && isSameDay(new Date(t.scheduled_at), today));

  const pending = [...overdue, ...todayPending];
  const total = pending.length + completed.length;

  const handleComplete = (taskId: string) => {
    if (showResponseFor !== taskId) {
      setShowResponseFor(taskId);
      setResponseError(null);
      return;
    }
    const response = responseMap[taskId]?.trim();
    if (!response) {
      setResponseError('Preencha a resposta antes de concluir a tarefa');
      return;
    }
    updateTask.mutate({ id: taskId, updates: { status: 'concluido', response } });
    setShowResponseFor(null);
    setResponseMap(prev => { const n = { ...prev }; delete n[taskId]; return n; });
  };

  const handleReopen = (taskId: string) => {
    updateTask.mutate({ id: taskId, updates: { status: 'pendente' } });
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'ligacao': return Phone;
      case 'followup': return MessageSquare;
      case 'compromisso': return Calendar;
      default: return CheckSquare;
    }
  };

  const renderTask = (task: Task, variant: 'pending' | 'upcoming') => {
    const TaskIcon = getTaskIcon(task.task_type);
    const isPast = new Date(task.scheduled_at) < new Date();
    const typeConfig = TASK_TYPE_CONFIG[task.task_type];
    const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;
    const isOverdue = variant === 'pending' && isPast;

    return (
      <div key={task.id} className={cn(
        "p-2.5 rounded-lg border transition-colors",
        variant === 'upcoming'
          ? "bg-primary/5 border-primary/20"
          : isOverdue ? "bg-destructive/5 border-destructive/30" : "bg-warning/5 border-warning/20"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {task.lead && (
                <span className="text-primary font-medium flex items-center gap-0.5">
                  <User className="h-3 w-3" />{task.lead.name}
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {variant === 'upcoming'
                  ? format(new Date(task.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })
                  : format(new Date(task.scheduled_at), 'HH:mm')}
              </span>
              {isOverdue && <Badge variant="destructive" className="text-[9px] h-4">Atrasada</Badge>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={cn("text-[10px]", typeConfig.color)}>
              <TaskIcon className="h-3 w-3 mr-0.5" />{typeConfig.label}
            </Badge>
            {priorityConfig && task.priority !== 'normal' && (
              <Badge variant="outline" className={cn("text-[9px]", priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            )}
          </div>
        </div>
        {showResponseFor === task.id && (
          <div className="mt-2 space-y-1.5">
            <Textarea
              placeholder="Descreva o resultado da tarefa..."
              value={responseMap[task.id] || ''}
              onChange={(e) => { setResponseMap(prev => ({ ...prev, [task.id]: e.target.value })); setResponseError(null); }}
              rows={2}
              maxLength={1000}
              className="text-xs"
            />
            {responseError && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{responseError}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 text-success border-success/30 hover:bg-success/10"
            onClick={() => handleComplete(task.id)}
            disabled={updateTask.isPending}
          >
            <CheckCircle2 className="h-3 w-3" />
            {showResponseFor === task.id ? 'Confirmar' : 'Concluir'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => setRescheduleTask(task)}
            disabled={updateTask.isPending}
          >
            <RefreshCw className="h-3 w-3" />
            Reagendar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
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
              {upcoming.length > 0 && (
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  {upcoming.length} agendada{upcoming.length > 1 ? 's' : ''}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {completed.length}/{total} concluídas
              </Badge>
            </div>
          </div>
          {total > 0 && (
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div className="bg-success h-1.5 rounded-full transition-all duration-500" style={{ width: `${(completed.length / total) * 100}%` }} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : total === 0 && upcoming.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma tarefa agendada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-1.5">
                    <Circle className="h-2.5 w-2.5 fill-warning text-warning" />
                    Pendentes ({pending.length})
                  </p>
                  <div className="space-y-1.5">
                    {pending.map(task => renderTask(task, 'pending'))}
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarClock className="h-3 w-3" />
                    Próximas agendadas ({upcoming.length})
                  </p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {upcoming.map(task => renderTask(task, 'upcoming'))}
                  </div>
                </div>
              )}

              {completed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-success uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-success" />
                    Concluídas ({completed.length})
                  </p>
                  <div className="space-y-1.5">
                    {completed.map(task => (
                      <div key={task.id} className="p-2.5 rounded-lg bg-success/5 border border-success/10">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate line-through text-muted-foreground">{task.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {task.lead && <span>{task.lead.name}</span>}
                            </div>
                            {task.response && (
                              <div className="mt-1 p-1.5 rounded bg-success/5 border border-success/10">
                                <p className="text-[10px] text-muted-foreground">{task.response}</p>
                              </div>
                            )}
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {rescheduleTask && (
        <RescheduleDialog
          open={!!rescheduleTask}
          onOpenChange={(open) => !open && setRescheduleTask(null)}
          taskId={rescheduleTask.id}
          taskTitle={rescheduleTask.title}
        />
      )}


    </>
  );
}
