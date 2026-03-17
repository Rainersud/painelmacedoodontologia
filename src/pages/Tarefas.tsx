import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Phone, 
  Calendar as CalendarIcon, 
  MessageSquare,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
} from 'lucide-react';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { format, startOfDay, addDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TASK_TYPE_CONFIG, PRIORITY_CONFIG, type Task } from '@/types/crm';

function TaskItem({ 
  task, 
  onComplete, 
  onReopen,
  onViewLead,
}: { 
  task: Task; 
  onComplete: () => void;
  onReopen: () => void;
  onViewLead?: () => void;
}) {
  const typeConfig = TASK_TYPE_CONFIG[task.task_type];
  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const isCompleted = task.status === 'concluido';
  const isPast = new Date(task.scheduled_at) < new Date() && !isCompleted;

  const getIcon = () => {
    switch (task.task_type) {
      case 'ligacao': return Phone;
      case 'tarefa': return CheckSquare;
      case 'compromisso': return CalendarIcon;
      case 'followup': return MessageSquare;
      default: return CheckSquare;
    }
  };
  const Icon = getIcon();

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all",
      isCompleted && "bg-muted/50 opacity-75",
      isPast && !isCompleted && "border-destructive/50 bg-destructive/5"
    )}>
        <div className="flex items-start gap-3">
        {!isCompleted ? (
          <button
            onClick={onComplete}
            className="mt-0.5 shrink-0"
            title="Concluir tarefa"
          >
            <Circle className={cn(
              "h-5 w-5",
              isPast ? "text-destructive" : "text-muted-foreground"
            )} />
          </button>
        ) : (
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={cn(
                "font-medium",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {task.title}
              </p>
              {task.lead && (
                <button 
                  onClick={onViewLead}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                >
                  <User className="h-3 w-3" />
                  {task.lead.name}
                </button>
              )}
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={cn("text-[10px]", typeConfig.color)}>
                <Icon className="h-3 w-3 mr-1" />
                {typeConfig.label}
              </Badge>
              {priorityConfig && (
                <Badge variant="outline" className={cn("text-[10px]", priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {format(new Date(task.scheduled_at), "HH:mm", { locale: ptBR })}
            </span>
            {isPast && !isCompleted && (
              <Badge variant="destructive" className="text-[10px]">
                Atrasada
              </Badge>
            )}
          </div>
          {/* Action buttons */}
          <div className="mt-2">
            {isCompleted ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 text-warning border-warning/30 hover:bg-warning/10"
                onClick={onReopen}
              >
                <Circle className="h-3.5 w-3.5" />
                Reverter para Pendente
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 text-success border-success/30 hover:bg-success/10"
                onClick={onComplete}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluir
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Tarefas = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  const { data: allTasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();

  // Filter tasks based on view mode
  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    
    if (viewMode === 'day') {
      return allTasks.filter(t => 
        isSameDay(new Date(t.scheduled_at), selectedDate)
      );
    }
    
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return allTasks.filter(t => {
        const date = new Date(t.scheduled_at);
        return date >= start && date <= end;
      });
    }
    
    // Month view
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    return allTasks.filter(t => {
      const date = new Date(t.scheduled_at);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [allTasks, selectedDate, viewMode]);

  // Group tasks by status
  const pendingTasks = filteredTasks.filter(t => t.status === 'pendente');
  const completedTasks = filteredTasks.filter(t => t.status === 'concluido');

  // Get days with tasks for calendar highlighting
  const daysWithTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.map(t => startOfDay(new Date(t.scheduled_at)));
  }, [allTasks]);

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ id: taskId, updates: { status: 'concluido' } });
  };

  const handleReopen = (taskId: string) => {
    updateTask.mutate({ id: taskId, updates: { status: 'pendente' } });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;
    setSelectedDate(prev => addDays(prev, direction === 'next' ? days : -days));
  };

  // Week days for week view
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate, viewMode]);

  return (
    <AppLayout title="Tarefas a Realizar">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar + Controls */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                modifiers={{
                  hasTask: daysWithTasks,
                }}
                modifiersStyles={{
                  hasTask: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))',
                  },
                }}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendentes</span>
                <Badge variant="secondary">{pendingTasks.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Concluídas</span>
                <Badge variant="secondary" className="bg-success/10 text-success">
                  {completedTasks.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Atrasadas</span>
                <Badge variant="destructive">
                  {pendingTasks.filter(t => new Date(t.scheduled_at) < new Date()).length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => navigateDate('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">
                    {viewMode === 'day' && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                    {viewMode === 'week' && `Semana de ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: ptBR })}`}
                    {viewMode === 'month' && format(selectedDate, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => navigateDate('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="day" className="text-xs h-6 px-2">Dia</TabsTrigger>
                    <TabsTrigger value="week" className="text-xs h-6 px-2">Semana</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs h-6 px-2">Mês</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : viewMode === 'week' ? (
                // Week View
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayTasks = filteredTasks.filter(t => 
                      isSameDay(new Date(t.scheduled_at), day)
                    );
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div 
                        key={day.toISOString()}
                        className={cn(
                          "p-2 rounded-lg min-h-32",
                          isToday ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                        )}
                      >
                        <p className={cn(
                          "text-xs font-medium mb-2 text-center",
                          isToday && "text-primary"
                        )}>
                          {format(day, "EEE d", { locale: ptBR })}
                        </p>
                        <div className="space-y-1">
                          {dayTasks.slice(0, 3).map((task) => (
                            <div 
                              key={task.id}
                              className={cn(
                                "text-[10px] p-1 rounded truncate",
                                task.status === 'concluido' 
                                  ? "bg-success/10 text-success line-through" 
                                  : "bg-background border"
                              )}
                            >
                              {task.title}
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <p className="text-[10px] text-muted-foreground text-center">
                              +{dayTasks.length - 3} mais
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Day/Month View - List
                <ScrollArea className="h-[calc(100vh-18rem)]">
                  <Tabs defaultValue="pending">
                    <TabsList className="mb-4">
                      <TabsTrigger value="pending">
                        Pendentes ({pendingTasks.length})
                      </TabsTrigger>
                      <TabsTrigger value="completed">
                        Concluídas ({completedTasks.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="space-y-2 m-0">
                      {pendingTasks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Nenhuma tarefa pendente</p>
                        </div>
                      ) : (
                        pendingTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onComplete={() => handleComplete(task.id)}
                            onReopen={() => handleReopen(task.id)}
                          />
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-2 m-0">
                      {completedTasks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Nenhuma tarefa concluída</p>
                        </div>
                      ) : (
                        completedTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onComplete={() => handleComplete(task.id)}
                            onReopen={() => handleReopen(task.id)}
                          />
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Tarefas;
