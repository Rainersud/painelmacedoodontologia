import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar as CalendarIcon,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { appointmentSchema, revenueSchema, validateForm } from '@/lib/validations';

type AppointmentStatus = 'agendado' | 'confirmado' | 'compareceu' | 'nao_compareceu' | 'cancelado';

const statusConfig: Record<AppointmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  agendado: { label: 'Agendado', color: 'bg-chart-2/10 text-chart-2 border-chart-2/20', icon: CalendarIcon },
  confirmado: { label: 'Confirmado', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2 },
  compareceu: { label: 'Compareceu', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  nao_compareceu: { label: 'Não Compareceu', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  cancelado: { label: 'Cancelado', color: 'bg-muted text-muted-foreground border-muted', icon: AlertCircle },
};

const getAppointmentStatus = (app: any): AppointmentStatus => {
  if (app.cancelled_at) return 'cancelado';
  if (app.attended_at) return 'compareceu';
  if (app.confirmed_at && !app.attended_at && new Date(app.scheduled_at) < new Date()) return 'nao_compareceu';
  if (app.confirmed_at) return 'confirmado';
  return 'agendado';
};

export default function Agendamentos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    lead_id: '',
    scheduled_at: '',
    treatment_type: '',
    notes: '',
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          leads:lead_id (name, phone, email, source)
        `)
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;

      // Fetch referral info for all leads in appointments
      const leadIds = (data || []).map(a => a.lead_id).filter(Boolean);
      let referralMap: Record<string, string> = {};
      
      if (leadIds.length > 0) {
        const { data: referrals } = await supabase
          .from('referrals')
          .select('referred_lead_id, referrer_lead_id')
          .in('referred_lead_id', leadIds);

        if (referrals?.length) {
          const referrerIds = referrals.map(r => r.referrer_lead_id);
          const { data: referrerLeads } = await supabase
            .from('leads')
            .select('id, name')
            .in('id', referrerIds);

          const referrerNameMap = Object.fromEntries((referrerLeads || []).map(l => [l.id, l.name]));
          referrals.forEach(r => {
            referralMap[r.referred_lead_id] = referrerNameMap[r.referrer_lead_id] || '';
          });
        }
      }

      return (data || []).map(app => ({
        ...app,
        _referrerName: referralMap[app.lead_id] || null,
        _isReferral: app.leads?.source === 'indicacao' || !!referralMap[app.lead_id],
      }));
    },
  });

  const { data: leads } = useQuery({
    queryKey: ['leads-for-appointment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone')
        .in('status', ['em_atendimento', 'consulta_agendada'])
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (data: typeof newAppointment) => {
      // Validate input before database operation
      const validation = validateForm(appointmentSchema, data);
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        throw new Error(firstError || 'Dados inválidos');
      }

      const { error } = await supabase.from('appointments').insert({
        lead_id: validation.data!.lead_id,
        scheduled_at: validation.data!.scheduled_at,
        treatment_type: validation.data!.treatment_type || null,
        notes: validation.data!.notes || null,
        agent_id: user?.id,
      });
      if (error) throw error;

      // Update lead status
      await supabase
        .from('leads')
        .update({ status: 'consulta_agendada' })
        .eq('id', data.lead_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setIsDialogOpen(false);
      setNewAppointment({ lead_id: '', scheduled_at: '', treatment_type: '', notes: '' });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar agendamento');
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, action, revenue }: { id: string; action: 'confirm' | 'attend' | 'no_show' | 'cancel'; revenue?: number }) => {
      const updates: any = {};
      
      switch (action) {
        case 'confirm':
          updates.confirmed_at = new Date().toISOString();
          break;
        case 'attend':
          updates.attended_at = new Date().toISOString();
          updates.revenue = revenue || 0;
          break;
        case 'no_show':
          updates.attended_at = null;
          break;
        case 'cancel':
          updates.cancelled_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;

      // Update lead status based on action
      const { data: appointment } = await supabase
        .from('appointments')
        .select('lead_id')
        .eq('id', id)
        .single();

      if (appointment) {
        const statusMap: Record<string, 'confirmado' | 'compareceu' | 'nao_compareceu' | 'em_atendimento'> = {
          confirm: 'confirmado',
          attend: 'compareceu',
          no_show: 'nao_compareceu',
          cancel: 'em_atendimento',
        };
        await supabase
          .from('leads')
          .update({ status: statusMap[action] })
          .eq('id', appointment.lead_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['referral-ranking'] });
      toast.success('Status atualizado!');
    },
  });

  const selectedDayAppointments = appointments?.filter(app => 
    isSameDay(parseISO(app.scheduled_at), selectedDate)
  ) || [];

  const appointmentDates = appointments?.map(app => parseISO(app.scheduled_at)) || [];

  return (
    <AppLayout title="Agendamentos">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              Calendário
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Agendamento</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Paciente</Label>
                      <Select
                        value={newAppointment.lead_id}
                        onValueChange={(v) => setNewAppointment({ ...newAppointment, lead_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {leads?.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.name} - {lead.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data e Hora</Label>
                      <Input
                        type="datetime-local"
                        value={newAppointment.scheduled_at}
                        onChange={(e) => setNewAppointment({ ...newAppointment, scheduled_at: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Tratamento</Label>
                      <Select
                        value={newAppointment.treatment_type}
                        onValueChange={(v) => setNewAppointment({ ...newAppointment, treatment_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tratamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avaliacao">Avaliação</SelectItem>
                          <SelectItem value="limpeza">Limpeza</SelectItem>
                          <SelectItem value="clareamento">Clareamento</SelectItem>
                          <SelectItem value="implante">Implante</SelectItem>
                          <SelectItem value="ortodontia">Ortodontia</SelectItem>
                          <SelectItem value="protese">Prótese</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={newAppointment.notes}
                        onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                        placeholder="Observações sobre o agendamento..."
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => createAppointment.mutate(newAppointment)}
                      disabled={!newAppointment.lead_id || !newAppointment.scheduled_at}
                    >
                      Criar Agendamento
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              modifiers={{
                hasAppointment: appointmentDates,
              }}
              modifiersStyles={{
                hasAppointment: {
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  fontWeight: 'bold',
                },
              }}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        {/* Day View */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="text-muted-foreground font-normal ml-2">
                ({selectedDayAppointments.length} consultas)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : selectedDayAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum agendamento para este dia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayAppointments.map((app) => {
                  const status = getAppointmentStatus(app);
                  const config = statusConfig[status];
                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {format(parseISO(app.scheduled_at), 'HH:mm')}
                              </span>
                              <Badge variant="outline" className={config.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {app.leads?.name || 'Paciente'}
                                <IndicacaoBadge source={app.leads?.source} size="xs" className="ml-1" />
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {app.leads?.phone}
                              </span>
                            </div>
                            {app.treatment_type && (
                              <p className="text-sm mt-1 capitalize">
                                Tratamento: {app.treatment_type}
                              </p>
                            )}
                            {(app as any)._isReferral && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] bg-chart-5/10 text-chart-5 border-0">
                                  🏷️ Indicação
                                </Badge>
                                {(app as any)._referrerName && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Indicado por: <strong>{(app as any)._referrerName}</strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {status === 'agendado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentStatus.mutate({ id: app.id, action: 'confirm' })}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Confirmar
                            </Button>
                          )}
                          {status === 'confirmado' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  const revenue = prompt('Valor da consulta (R$):');
                                  if (revenue) {
                                    const validation = revenueSchema.safeParse(revenue);
                                    if (!validation.success) {
                                      toast.error('Valor inválido. Use um número positivo.');
                                      return;
                                    }
                                    updateAppointmentStatus.mutate({ 
                                      id: app.id, 
                                      action: 'attend',
                                      revenue: parseFloat(revenue)
                                    });
                                  }
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Compareceu
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateAppointmentStatus.mutate({ id: app.id, action: 'no_show' })}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Faltou
                              </Button>
                            </>
                          )}
                          {(status === 'agendado' || status === 'confirmado') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => updateAppointmentStatus.mutate({ id: app.id, action: 'cancel' })}
                            >
                              Cancelar
                            </Button>
                          )}
                          {status === 'compareceu' && app.revenue && (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              <DollarSign className="h-3 w-3 mr-1" />
                              R$ {app.revenue.toLocaleString('pt-BR')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
