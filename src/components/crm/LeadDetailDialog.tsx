import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StarRating } from './StarRating';
import { LeadTimeline } from '@/components/leads/LeadTimeline';
import { StageHistoryPanel } from './StageHistoryPanel';
import { useUpdateLead, useUpdateLeadStatus, useUpdateLeadRating, useDeleteLead } from '@/hooks/useCRMLeads';
import { useCreateTask } from '@/hooks/useTasks';
import { useAppointmentHistory } from '@/hooks/useAppointmentHistory';
import { useAuth } from '@/contexts/AuthContext';
import { FUNNEL_STAGES, type Lead, type LeadStatus } from '@/types/crm';
import { ReferralSection } from './ReferralSection';
import { TriageFormDialog } from './TriageFormDialog';
import { usePatientTriage } from '@/hooks/usePatientTriage';
import {
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  ArrowRight,
  StickyNote,
  Save,
  User,
  Trash2,
  Gift,
  Clock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  const { user } = useAuth();
  const updateLead = useUpdateLead();
  const updateStatus = useUpdateLeadStatus();
  const updateRating = useUpdateLeadRating();
  const deleteLead = useDeleteLead();
  const createTask = useCreateTask();
  const { data: appointmentHistory } = useAppointmentHistory(lead?.id || '');

  const [activeTab, setActiveTab] = useState('info');
  const [triageOpen, setTriageOpen] = useState(false);
  const [formData, setFormData] = useState({
    interest_product: '',
    estimated_value: '',
    email: '',
    whatsapp: '',
    notes: '',
    attendance_discount_status: 'elegivel' as 'elegivel' | 'liberado' | 'cancelado',
    discount_percentage: '5',
    scheduled_appointment_at: '',
  });
  const [newStatus, setNewStatus] = useState<LeadStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [closingData, setClosingData] = useState({
    treatment_value: '',
    payment_method: '' as 'avista' | 'parcelado' | '',
  });
  const [noteData, setNoteData] = useState({
    content: '',
  });
  const [taskData, setTaskData] = useState({
    title: '',
    task_type: 'ligacao' as 'ligacao' | 'tarefa' | 'compromisso' | 'followup',
    scheduled_at: '',
    description: '',
  });

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      setFormData({
        interest_product: lead.interest_product || '',
        estimated_value: String(lead.estimated_value || ''),
        email: lead.email || '',
        whatsapp: lead.whatsapp || '',
        notes: lead.notes || '',
        attendance_discount_status: (lead.attendance_discount_status || 'elegivel') as 'elegivel' | 'liberado' | 'cancelado',
        discount_percentage: String(lead.discount_percentage ?? 5),
        scheduled_appointment_at: lead.scheduled_appointment_at 
          ? new Date(lead.scheduled_appointment_at).toISOString().slice(0, 16) 
          : '',
      });
      setNewStatus('');
      setStatusNotes('');
      setScheduledAt('');
      setClosingData({ treatment_value: '', payment_method: '' });
      setNoteData({ content: '' });
      setTaskData({ title: '', task_type: 'ligacao', scheduled_at: '', description: '' });
      setActiveTab('info');
    }
  }, [lead]);

  if (!lead) return null;

  const currentStage = FUNNEL_STAGES.find(s => s.key === lead.status);

  const handleSaveInfo = () => {
    const updates: Partial<Lead> = {
      interest_product: formData.interest_product || null,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      email: formData.email || null,
      whatsapp: formData.whatsapp || null,
      notes: formData.notes || null,
      attendance_discount_status: formData.attendance_discount_status,
      discount_percentage: formData.attendance_discount_status === 'cancelado' ? 0 : parseFloat(formData.discount_percentage) || 5,
    };
    if (formData.scheduled_appointment_at) {
      updates.scheduled_appointment_at = new Date(formData.scheduled_appointment_at).toISOString();
    }
    updateLead.mutate({ leadId: lead.id, updates });
  };

  const handleChangeStatus = () => {
    if (!newStatus) return;
    
    const additionalData: Partial<Lead> = {};
    if (newStatus === 'fechado' && closingData.treatment_value) {
      additionalData.treatment_value = parseFloat(closingData.treatment_value);
      additionalData.payment_method = closingData.payment_method || null;
    }
    if ((newStatus === 'agendou' || newStatus === 'consulta_agendada') && scheduledAt) {
      additionalData.scheduled_appointment_at = new Date(scheduledAt).toISOString();
    }

    updateStatus.mutate({
      leadId: lead.id,
      newStatus,
      additionalData,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleCreateTask = () => {
    if (!taskData.title || !taskData.scheduled_at) return;
    
    createTask.mutate({
      lead_id: lead.id,
      title: taskData.title,
      task_type: taskData.task_type,
      scheduled_at: new Date(taskData.scheduled_at).toISOString(),
      description: taskData.description || undefined,
    }, {
      onSuccess: () => {
        setTaskData({ title: '', task_type: 'ligacao', scheduled_at: '', description: '' });
      },
    });
  };

  const handleDeleteLead = () => {
    deleteLead.mutate(lead.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-base font-semibold text-primary">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg">{lead.name}</p>
                <StarRating
                  rating={lead.interest_rating || 0}
                  onChange={(rating) => updateRating.mutate({ leadId: lead.id, rating })}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-normal">
                <span>{lead.phone}</span>
                <Badge className={`${currentStage?.color} text-white text-xs`}>
                  {currentStage?.label}
                </Badge>
              </div>
            </div>
            {/* Quick actions */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(`tel:${lead.phone}`, '_blank')}
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const phone = lead.whatsapp || lead.phone;
                  window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
                }}
              >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o lead <strong>{lead.name}</strong>? 
                    Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteLead}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteLead.isPending}
                  >
                    {deleteLead.isPending ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogTitle>
      </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          {(() => {
            const showTriage = lead.status === 'compareceu' || 
              ['orcamentos_abertos', 'followup_1', 'followup_2', 'followup_3', 'followup_4', 'fechado', 'tratamento_andamento', 'concluido', 'pos_venda'].includes(lead.status);
            const cols = showTriage ? 7 : 6;
            return (
              <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                <TabsTrigger value="info">
                  <User className="h-4 w-4 mr-1" />
                  Dados
                </TabsTrigger>
                <TabsTrigger value="status">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Status
                </TabsTrigger>
                {showTriage && (
                  <TabsTrigger value="triage" onClick={() => setTriageOpen(true)}>
                    <FileText className="h-4 w-4 mr-1" />
                    Triagem
                  </TabsTrigger>
                )}
                <TabsTrigger value="referral">
                  <Gift className="h-4 w-4 mr-1" />
                  Indicação
                </TabsTrigger>
                <TabsTrigger value="task">
                  <Calendar className="h-4 w-4 mr-1" />
                  Tarefa
                </TabsTrigger>
                <TabsTrigger value="funnel">
                  <Clock className="h-4 w-4 mr-1" />
                  Funil
                </TabsTrigger>
                <TabsTrigger value="history">
                  <StickyNote className="h-4 w-4 mr-1" />
                  Histórico
                </TabsTrigger>
              </TabsList>
            );
          })()}

          <ScrollArea className="flex-1 mt-4">
            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interest_product">Interesse de Tratamento</Label>
                  <Select
                    value={formData.interest_product || undefined}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, interest_product: v }))}
                  >
                    <SelectTrigger id="interest_product">
                      <SelectValue placeholder="Selecione o tratamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="implante">Implante</SelectItem>
                      <SelectItem value="protese_flexivel">Prótese Flexível</SelectItem>
                      <SelectItem value="protese_total">Prótese Total</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_value">Valor do Negócio (R$)</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Discount Status */}
              <div className="p-4 rounded-lg border space-y-4" style={{
                backgroundColor: formData.attendance_discount_status === 'liberado' ? 'hsl(var(--success) / 0.05)' :
                  formData.attendance_discount_status === 'cancelado' ? 'hsl(var(--destructive) / 0.05)' : 'hsl(var(--warning) / 0.05)',
                borderColor: formData.attendance_discount_status === 'liberado' ? 'hsl(var(--success) / 0.2)' :
                  formData.attendance_discount_status === 'cancelado' ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--warning) / 0.2)',
              }}>
                <h4 className="font-medium text-sm flex items-center gap-2">
                  🎁 Status do Desconto de Comparecimento
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status do desconto</Label>
                    <Select
                      value={formData.attendance_discount_status}
                      onValueChange={(v) => {
                        const newStatus = v as 'elegivel' | 'liberado' | 'cancelado';
                        setFormData(prev => ({
                          ...prev,
                          attendance_discount_status: newStatus,
                          discount_percentage: newStatus === 'cancelado' ? '0' : prev.discount_percentage === '0' ? '5' : prev.discount_percentage,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elegivel">🟡 Elegível para desconto</SelectItem>
                        <SelectItem value="liberado">🟢 Desconto disponível</SelectItem>
                        <SelectItem value="cancelado">🔴 Cancelado por falta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Porcentagem do desconto (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                      disabled={formData.attendance_discount_status === 'cancelado'}
                      placeholder="5"
                    />
                  </div>
                </div>
                {formData.attendance_discount_status === 'cancelado' && (
                  <p className="text-xs text-destructive">
                    ❌ Desconto removido automaticamente. O paciente perdeu o benefício por falta no comparecimento.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Anotações sobre o lead..."
                  rows={3}
                />
              </div>
              <Button 
                className="w-full"
                onClick={handleSaveInfo}
                disabled={updateLead.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateLead.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 m-0">
              {/* Change Status - kept at top */}
              <div className="space-y-2">
                <Label>Alterar Status</Label>
                <Select
                  value={newStatus || undefined}
                  onValueChange={(v) => setNewStatus(v as LeadStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o novo status" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNNEL_STAGES.map((stage) => (
                      <SelectItem 
                        key={stage.key} 
                        value={stage.key}
                        disabled={stage.key === lead.status}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                          {stage.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <hr className="border-border" />

              {/* Universal Scheduled Appointment - editable from any stage */}
              <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  📅 Consulta Agendada
                </h4>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_appointment_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_appointment_at: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!formData.scheduled_appointment_at || updateLead.isPending}
                  onClick={() => {
                    const updates: Partial<Lead> = {};
                    if (formData.scheduled_appointment_at) {
                      updates.scheduled_appointment_at = new Date(formData.scheduled_appointment_at).toISOString();
                    }
                    updateLead.mutate({ leadId: lead.id, updates });
                  }}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Salvar Agendamento
                </Button>
              </div>

              {/* No-show count */}
              <div className="p-3 rounded-lg border space-y-1">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  ❌ Faltas Registradas
                </h4>
                <p className="text-2xl font-bold text-destructive">
                  {lead.no_show_count || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Faltas são registradas automaticamente ao mover o lead para "Faltou"
                </p>
              </div>

              {/* Appointment History */}
              {appointmentHistory && appointmentHistory.length > 0 && (
                <div className="p-3 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    📋 Histórico de Agendamentos
                  </h4>
                  <div className="space-y-1">
                    {appointmentHistory.map((apt, idx) => {
                      const status = apt.cancelled_at ? 'Cancelado' : apt.attended_at ? 'Compareceu' : apt.confirmed_at ? 'Confirmado' : 'Agendado';
                      const statusColor = apt.cancelled_at ? 'text-destructive' : apt.attended_at ? 'text-success' : 'text-primary';
                      return (
                        <div key={apt.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                          <span className="text-muted-foreground">{idx + 1}º agendamento</span>
                          <span>
                            {new Date(apt.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            {' '}
                            {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={cn("font-medium", statusColor)}>{status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}




              {/* Schedule fields when status is agendou */}
              {(newStatus === 'agendou' || newStatus === 'consulta_agendada') && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data da Consulta
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Data e Horário</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Closing fields when status is fechado */}
              {newStatus === 'fechado' && (
                <div className="p-4 bg-success/5 rounded-lg border border-success/20 space-y-4">
                  <h4 className="font-medium text-success flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fechamento de Venda
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="treatment_value">Valor do Tratamento (R$)</Label>
                      <Input
                        id="treatment_value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={closingData.treatment_value}
                        onChange={(e) => setClosingData(prev => ({ ...prev, treatment_value: e.target.value }))}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Forma de Pagamento</Label>
                      <Select
                        value={closingData.payment_method || undefined}
                        onValueChange={(v) => setClosingData(prev => ({ ...prev, payment_method: v as 'avista' | 'parcelado' }))}
                      >
                        <SelectTrigger id="payment_method">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avista">À Vista</SelectItem>
                          <SelectItem value="parcelado">Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status_notes">Observações (opcional)</Label>
                <Textarea
                  id="status_notes"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Motivo da mudança..."
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleChangeStatus}
                disabled={!newStatus || updateStatus.isPending}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {updateStatus.isPending ? 'Atualizando...' : 'Atualizar Status'}
              </Button>
            </TabsContent>

            {/* Task Tab */}
            <TabsContent value="task" className="space-y-4 m-0">
              <div className="space-y-2">
                <Label htmlFor="task_title">Título da Tarefa</Label>
                <Input
                  id="task_title"
                  value={taskData.title}
                  onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Ligar para confirmar agendamento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task_type">Tipo</Label>
                  <Select
                    value={taskData.task_type}
                    onValueChange={(v) => setTaskData(prev => ({ ...prev, task_type: v as typeof taskData.task_type }))}
                  >
                    <SelectTrigger id="task_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ligacao">Ligação</SelectItem>
                      <SelectItem value="tarefa">Tarefa</SelectItem>
                      <SelectItem value="compromisso">Compromisso</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at_task">Data/Hora</Label>
                  <Input
                    id="scheduled_at_task"
                    type="datetime-local"
                    value={taskData.scheduled_at}
                    onChange={(e) => setTaskData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task_description">Descrição (opcional)</Label>
                <Textarea
                  id="task_description"
                  value={taskData.description}
                  onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes da tarefa..."
                  rows={2}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateTask}
                disabled={!taskData.title || !taskData.scheduled_at || createTask.isPending}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {createTask.isPending ? 'Criando...' : 'Criar Tarefa'}
              </Button>
            </TabsContent>

            {/* Referral Tab */}
            <TabsContent value="referral" className="m-0">
              <ReferralSection leadId={lead.id} leadName={lead.name} />
            </TabsContent>

            {/* Funnel History Tab */}
            <TabsContent value="funnel" className="m-0">
              <StageHistoryPanel leadId={lead.id} />
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="m-0">
              <LeadTimeline leadId={lead.id} />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <TriageFormDialog
          lead={lead}
          open={triageOpen}
          onOpenChange={setTriageOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
