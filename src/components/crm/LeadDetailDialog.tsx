import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

import { StarRating } from './StarRating';
import { LeadTimeline } from '@/components/leads/LeadTimeline';
import { StageHistoryPanel } from './StageHistoryPanel';
import { LeadAlertsBanner } from './LeadAlertsBanner';
import { useUpdateLead, useUpdateLeadStatus, useUpdateLeadRating, useDeleteLead } from '@/hooks/useCRMLeads';
import { useCreateTask } from '@/hooks/useTasks';
import { useAppointmentHistory } from '@/hooks/useAppointmentHistory';
import { useAuth } from '@/contexts/AuthContext';
import { FUNNEL_STAGES, FOLLOWUP_COPY_TEMPLATES, type Lead, type LeadStatus } from '@/types/crm';
import { EditableFollowUpCopy } from './EditableFollowUpCopy';
import { ReferralSection } from './ReferralSection';
import { TriageFormDialog } from './TriageFormDialog';
import { PaymentDialog } from './PaymentDialog';
import { CurrencyInput } from './CurrencyInput';
import { usePatientTriage } from '@/hooks/usePatientTriage';
import { useFriendlyPatientStatus } from '@/hooks/useFriendlyPatient';
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
  const { user, isAdmin } = useAuth();
  const updateLead = useUpdateLead();
  const updateStatus = useUpdateLeadStatus();
  const updateRating = useUpdateLeadRating();
  const deleteLead = useDeleteLead();
  const createTask = useCreateTask();
  const { data: appointmentHistory } = useAppointmentHistory(lead?.id || '');
  const { data: friendlyData } = useFriendlyPatientStatus(lead?.id);

  const [activeTab, setActiveTab] = useState('info');
  const [triageOpen, setTriageOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    interest_product: '',
    email: '',
    whatsapp: '',
    notes: '',
    attendance_discount_status: 'elegivel' as 'elegivel' | 'liberado' | 'cancelado',
    discount_percentage: '5',
    scheduled_appointment_at: '',
    sale_type: '' as '' | '1_etapa' | '2_etapas',
    loss_reason: '',
  });
  const [budgetValue, setBudgetValue] = useState(0);
  const [newStatus, setNewStatus] = useState<LeadStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [friendlyPatient, setFriendlyPatient] = useState<boolean | null>(null);
  const [contactAttempts, setContactAttempts] = useState(0);
  const [scheduledAt, setScheduledAt] = useState('');
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
        name: lead.name || '',
        phone: lead.phone || '',
        interest_product: lead.interest_product || '',
        email: lead.email || '',
        whatsapp: lead.whatsapp || '',
        notes: lead.notes || '',
        attendance_discount_status: (lead.attendance_discount_status || 'elegivel') as 'elegivel' | 'liberado' | 'cancelado',
        discount_percentage: String(lead.discount_percentage ?? 5),
        scheduled_appointment_at: lead.scheduled_appointment_at 
          ? new Date(lead.scheduled_appointment_at).toISOString().slice(0, 16) 
          : '',
        sale_type: (lead.sale_type || '') as '' | '1_etapa' | '2_etapas',
        loss_reason: (lead as any).loss_reason || '',
      });
      setBudgetValue(lead.budget_value || 0);
      setNewStatus('');
      setStatusNotes('');
      // Load existing friendly_patient from upsell data if lead is already fechado
      if (lead.status === 'fechado' && friendlyData) {
        setFriendlyPatient(friendlyData.friendly_patient);
      } else {
        setFriendlyPatient(null);
      }
      setScheduledAt('');
      setContactAttempts(lead.contact_attempts ?? 0);
      setNoteData({ content: '' });
      setTaskData({ title: '', task_type: 'ligacao', scheduled_at: '', description: '' });
      setActiveTab('info');
    }
  }, [lead, friendlyData]);

  // Auto-switch to triage tab when lead reaches 'compareceu'
  useEffect(() => {
    if ((newStatus || lead?.status) === 'compareceu' && open) {
      setActiveTab('triage');
    }
  }, [lead?.status, newStatus, open]);

  if (!lead) return null;

  const statusForView = (newStatus || lead.status) as LeadStatus;
  const currentStage = FUNNEL_STAGES.find(s => s.key === statusForView);
  const displayedNoShowCount = statusForView === 'faltou' && lead.status !== 'faltou'
    ? (lead.no_show_count || 0) + 1
    : (lead.no_show_count || 0);

  const handleSaveInfo = async () => {
    const updates: Partial<Lead> = {
      name: formData.name,
      phone: formData.phone,
      interest_product: formData.interest_product || null,
      email: formData.email || null,
      whatsapp: formData.whatsapp || null,
      notes: formData.notes || null,
      attendance_discount_status: formData.attendance_discount_status,
      discount_percentage: formData.attendance_discount_status === 'cancelado' ? 0 : parseFloat(formData.discount_percentage) || 5,
      sale_type: formData.sale_type || null,
    };
    if (formData.scheduled_appointment_at) {
      updates.scheduled_appointment_at = new Date(formData.scheduled_appointment_at).toISOString();
    }
    try {
      await updateLead.mutateAsync({ leadId: lead.id, updates });
      return true;
    } catch {
      return false;
    }
  };

  const handleChangeStatus = async (
    statusOverride?: LeadStatus,
    closeAfterSave = false,
    friendlyOverride: boolean | null = friendlyPatient
  ) => {
    const targetStatus = statusOverride || newStatus;
    if (!targetStatus || !lead || targetStatus === lead.status) return true;

    const resetDailyStages = ['nao_respondeu', 'followup_1','followup_2','followup_3','followup_4','followup_5','followup_6','followup_7','followup_8','followup_9','followup_10','followup_11','followup_12','followup_13','followup_14'];
    if (resetDailyStages.includes(targetStatus)) {
      const todayKey = `attempts_${lead.id}_${new Date().toISOString().slice(0,10)}`;
      localStorage.removeItem(todayKey);
    }

    if (targetStatus === 'nao_cliente' && !formData.loss_reason.trim()) {
      toast.error('Preencha o campo "Não fechou porque:" antes de salvar.');
      return false;
    }

    // VALIDATION: Block move to fechado without payment
    if (targetStatus === 'fechado') {
      if (friendlyOverride === null) {
        toast.error('Responda a pergunta "Paciente Amigo" antes de confirmar a venda.');
        return false;
      }

      const { count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('lead_id', lead.id)
        .eq('status', 'pago');
      
      if (!count || count === 0) {
        toast.error('Não é possível marcar como Venda Realizada sem pagamento confirmado. Registre um pagamento primeiro.');
        return false;
      }
    }

    const additionalData: Partial<Lead> = {};
    if (targetStatus === 'agendou' || targetStatus === 'consulta_agendada') {
      const scheduledValue = scheduledAt
        ? new Date(scheduledAt).toISOString()
        : new Date().toISOString();
      additionalData.scheduled_appointment_at = scheduledValue;
      setScheduledAt(scheduledValue.slice(0, 16));
      setFormData(prev => ({ ...prev, scheduled_appointment_at: scheduledValue.slice(0, 16) }));
    }
    if (targetStatus === 'nao_cliente' && formData.loss_reason.trim()) {
      (additionalData as any).loss_reason = formData.loss_reason.trim();
    }
    if (targetStatus === 'faltou' && scheduledAt) {
      additionalData.scheduled_appointment_at = new Date(scheduledAt).toISOString();
    }

    try {
      await updateStatus.mutateAsync({
        leadId: lead.id,
        newStatus: targetStatus,
        additionalData,
      });

      if (targetStatus === 'fechado' && friendlyOverride !== null) {
        await new Promise(r => setTimeout(r, 500));
        await supabase
          .from('upsell_opportunities')
          .update({ friendly_patient: friendlyOverride })
          .eq('lead_id', lead.id);
      }

      if (closeAfterSave) onOpenChange(false);
      return true;
    } catch {
      return false;
    }
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
      <DialogContent className="w-[95vw] sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <DialogTitle className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm sm:text-base font-semibold text-primary">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base sm:text-lg truncate">{lead.name}</p>
                <StarRating
                  rating={lead.interest_rating || 0}
                  onChange={(rating) => updateRating.mutate({ leadId: lead.id, rating })}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-normal">
                <Badge className={`${currentStage?.color} text-white text-xs`}>
                  {currentStage?.label}
                </Badge>
              </div>
            </div>
            {/* Quick actions */}
            <div className="flex gap-1">
            {isAdmin && (
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
            )}
          </div>
        </DialogTitle>
      </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-4 sm:px-6">
          {(() => {
            const showTriage = true;
            return (
              <div className="shrink-0 overflow-x-auto -mx-1 px-1 border-b border-border">
                <TabsList className="inline-flex w-auto min-w-full">
                  <TabsTrigger value="info" className="text-xs sm:text-sm gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Dados</span>
                  </TabsTrigger>
                  <TabsTrigger value="status" className="text-xs sm:text-sm gap-1">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Status</span>
                  </TabsTrigger>
                  {showTriage && (
                    <TabsTrigger
                      value="triage"
                      className="text-xs sm:text-sm gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Triagem</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="referral" className="text-xs sm:text-sm gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Indicação</span>
                  </TabsTrigger>
                  <TabsTrigger value="task" className="text-xs sm:text-sm gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Tarefa</span>
                  </TabsTrigger>
                  <TabsTrigger value="funnel" className="text-xs sm:text-sm gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Funil</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs sm:text-sm gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Histórico</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            );
          })()}

          <div className="flex-1 min-h-0 mt-4 pb-4 overflow-y-auto scroll-container-y px-1">
            {/* Smart Alerts Banner */}
            <LeadAlertsBanner lead={lead} />
            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4 m-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_name">Nome</Label>
                  <Input
                    id="lead_name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do lead"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead_phone">Telefone</Label>
                  <Input
                    id="lead_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interest_product">Interesse de Tratamento</Label>
                  <Select
                    value={formData.interest_product || undefined}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, interest_product: v }))}
                    key={formData.interest_product || 'empty-interest'}
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
                  <Label htmlFor="sale_type">Tipo de Venda</Label>
                  <Select
                    value={formData.sale_type || undefined}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, sale_type: v as '1_etapa' | '2_etapas' }))}
                    key={formData.sale_type || 'empty-sale-type'}
                  >
                    <SelectTrigger id="sale_type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_etapa">Venda em 1 Etapa</SelectItem>
                      <SelectItem value="2_etapas">Venda em 2 Etapas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 m-0">
              {/* Change Status - kept at top */}
              <div className="space-y-2">
                <Label>Alterar Status</Label>
                <Select
                  value={statusForView}
                  onValueChange={(v) => {
                    const target = v as LeadStatus;
                    setNewStatus(target);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o novo status" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNNEL_STAGES.map((stage) => (
                      <SelectItem
                        key={stage.key}
                        value={stage.key}
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

              {/* Data da Consulta — visible right after status when status is agendou/consulta_agendada */}
              {(['agendou','consulta_agendada'].includes(statusForView)) && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data da Consulta
                  </h4>
                  <Input
                    type="datetime-local"
                    value={scheduledAt || formData.scheduled_appointment_at}
                    onChange={(e) => {
                      setScheduledAt(e.target.value);
                      setFormData(prev => ({ ...prev, scheduled_appointment_at: e.target.value }));
                    }}
                  />
                </div>
              )}

              {/* Reagendamento quando faltou */}
              {statusForView === 'faltou' && (
                <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20 space-y-3">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    🔁 Reagendar para
                  </h4>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Defina uma nova data para reagendar antes de salvar a evolução.</p>
                </div>
              )}

              <hr className="border-border" />

              {/* Discount status — visible from 'agendou' onwards */}
              {(['agendou','consulta_agendada','confirmado','compareceu','faltou','quase_cliente','potencial','nao_cliente','fechado'].includes(statusForView)) && (() => {
                const hasNoShow = displayedNoShowCount > 0;
                const pct = parseFloat(formData.discount_percentage) || 0;
                return (
                  <div className="p-4 rounded-lg border space-y-3" style={{
                    backgroundColor: hasNoShow ? 'hsl(var(--destructive) / 0.05)' : 'hsl(var(--success) / 0.05)',
                    borderColor: hasNoShow ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--success) / 0.2)',
                  }}>
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      🎁 Status do Desconto de Comparecimento
                    </h4>
                    {hasNoShow ? (
                      <p className="text-sm font-semibold text-destructive">❌ Não disponível por falta</p>
                    ) : statusForView === 'compareceu' ? (
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-success">{pct}%</p>
                        <p className="text-xs text-muted-foreground">Desconto ativo por comparecimento sem faltas.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs">Porcentagem do desconto (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="1"
                          value={formData.discount_percentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                        />
                        <p className="text-xs text-success">🟢 Disponível — sem faltas registradas.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* No-show count — editable */}
              <div className="p-3 rounded-lg border space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  ❌ Faltas Registradas
                </h4>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    className="w-24 text-2xl font-bold text-destructive h-12"
                    value={displayedNoShowCount}
                    onChange={(e) => {
                      const newCount = Math.max(0, parseInt(e.target.value) || 0);
                      const newStatus = newCount > 0 ? 'cancelado' : 'liberado';
                      const newPct = newCount > 0 ? 0 : (parseFloat(formData.discount_percentage) || 5);
                      setFormData(prev => ({ ...prev, attendance_discount_status: newStatus, discount_percentage: String(newPct) }));
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Edite para corrigir manualmente. Recalcula o desconto automaticamente.</span>
                </div>
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

              {/* Budget Field - separate from payments */}
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2 text-warning">
                  📋 Valor do Orçamento
                </h4>
                <p className="text-xs text-muted-foreground">
                  O orçamento é apenas informativo e <strong>não conta como faturamento</strong>. O valor só entra no financeiro ao registrar um pagamento.
                </p>
                <CurrencyInput
                  value={budgetValue}
                  onChange={(value) => setBudgetValue(value)}
                  onBlur={() => {
                    if (budgetValue !== (lead.budget_value || 0)) {
                      updateLead.mutate({ leadId: lead.id, updates: { budget_value: budgetValue } });
                    }
                  }}
                />
                {budgetValue > 0 && (
                  <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                    Orçamento Pendente: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budgetValue)}
                  </Badge>
                )}
              </div>

              {/* Payment Button - available on ALL stages */}
              <div className="p-3 rounded-lg border-2 border-success/30 bg-success/5 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2 text-success">
                  💰 Pagamento (Faturamento Real)
                </h4>
                <Button
                  variant="outline"
                  className="w-full border-success/30 text-success hover:bg-success/10"
                  onClick={() => setPaymentOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Registrar Pagamento
                </Button>
              </div>


              {/* (Data da Consulta now rendered right after the status select) */}

              {/* Loss reason field when moving to nao_cliente */}
              {newStatus === 'nao_cliente' && (
                <div className="p-4 bg-chart-5/5 rounded-lg border border-chart-5/20 space-y-3">
                  <h4 className="font-medium text-chart-5 flex items-center gap-2">
                    ❓ Não fechou porque:
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Campo obrigatório — descreva o motivo pelo qual o paciente não fechou o tratamento.
                  </p>
                  <Textarea
                    value={formData.loss_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, loss_reason: e.target.value }))}
                    placeholder="Ex: Achou caro, quer pensar mais, medo do procedimento..."
                    rows={3}
                    className="border-chart-5/30"
                  />
                  {!formData.loss_reason.trim() && (
                    <p className="text-[10px] text-destructive">* Campo obrigatório</p>
                  )}
                </div>
              )}

              {/* Show existing loss_reason for leads already in nao_cliente */}
              {statusForView === 'nao_cliente' && (lead as any).loss_reason && newStatus !== 'nao_cliente' && (
                <div className="p-3 rounded-lg border border-chart-5/30 bg-chart-5/5 space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2 text-chart-5">
                    ❓ Motivo de não fechamento
                  </h4>
                  <p className="text-sm">{(lead as any).loss_reason}</p>
                </div>
              )}

              {/* Contact attempts counter - per stage period (manhã/tarde) */}
              {(statusForView === 'nao_respondeu' || statusForView?.startsWith('followup_')) && (() => {
                const stageKey = `stage_attempts_${lead.id}_${statusForView}`;
                const stageAttempts = parseInt(typeof window !== 'undefined' ? (localStorage.getItem(stageKey) || '0') : '0');
                const followupNum = statusForView?.startsWith('followup_') ? parseInt(statusForView.replace('followup_','')) : 0;
                const isLastFollowup = statusForView === 'followup_14';
                const stageLabel = FOLLOWUP_COPY_TEMPLATES[statusForView]?.label || statusForView;

                const advanceToNext = () => {
                  if (followupNum >= 1 && followupNum < 14) {
                    const nextStatus = `followup_${followupNum + 1}` as LeadStatus;
                    updateStatus.mutate({
                      leadId: lead.id,
                      newStatus: nextStatus,
                      additionalData: { contact_attempts: 0 } as any,
                    });
                  }
                };

                const sendToRmkt = async () => {
                  try {
                    await supabase.from('remarketing_entries').insert({
                      lead_id: lead.id,
                      current_stage: 'dia_1',
                      phase: 'aquecimento',
                      origin_status: statusForView,
                      is_active: true,
                    });
                    await supabase.from('leads').update({
                      rmkt_status: 'ativo',
                      rmkt_entered_at: new Date().toISOString(),
                      rmkt_origin_status: statusForView,
                      rmkt_last_stage: 'dia_1',
                      status: 'nutricao' as any,
                      stage_entered_at: new Date().toISOString(),
                    }).eq('id', lead.id);
                    await supabase.from('remarketing_logs').insert({
                      lead_id: lead.id,
                      action: 'entrada',
                      to_stage: 'dia_1',
                      from_stage: statusForView,
                      triggered_by: 'manual',
                    });
                    toast.success('Lead migrado para Remarketing!');
                    onOpenChange(false);
                  } catch (err: any) {
                    toast.error('Erro ao migrar para Remarketing: ' + (err?.message || ''));
                  }
                };

                return (
                  <div className="p-4 bg-warning/5 rounded-lg border border-warning/20 space-y-3">
                    <h4 className="font-medium text-warning flex items-center gap-2">
                      📞 Tentativas de contato — {stageLabel}
                    </h4>
                    {stageAttempts >= 2 && (
                      <div className="text-xs text-destructive bg-destructive/10 rounded p-2 font-medium">
                        ⚠️ Limite de 2 tentativas atingido neste período
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Tentativa:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (stageAttempts > 0) {
                              localStorage.setItem(stageKey, String(stageAttempts - 1));
                              setContactAttempts((c) => c); // force rerender
                              setContactAttempts(stageAttempts - 1);
                            }
                          }}
                        >-</Button>
                        <span className="font-bold text-lg min-w-[3ch] text-center">
                          {stageAttempts}
                        </span>
                        <span className="text-muted-foreground">/2 neste período</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={stageAttempts >= 2}
                          onClick={() => {
                            if (stageAttempts >= 2) {
                              toast.error('Máximo 2 tentativas por período. Avance para o próximo período.');
                              return;
                            }
                            const newVal = stageAttempts + 1;
                            localStorage.setItem(stageKey, String(newVal));
                            setContactAttempts(newVal);
                          }}
                        >+</Button>
                      </div>
                    </div>

                    {stageAttempts >= 2 && !isLastFollowup && followupNum >= 1 && (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full"
                        onClick={advanceToNext}
                      >
                        ➡️ Avançar para próximo período
                      </Button>
                    )}

                    {isLastFollowup && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={sendToRmkt}
                      >
                        🚀 Enviar para RMKT (Dia 1)
                      </Button>
                    )}

                    <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/50 rounded p-2">
                      <p>✅ Máximo 2 tentativas por período (Manhã/Tarde)</p>
                      <p>✅ Histórico mantido por período</p>
                      <p>✅ Avanço automático para o próximo período</p>
                    </div>
                  </div>
                );
              })()}

              {/* Follow-up Copy Template */}
              {statusForView?.startsWith('followup_') && FOLLOWUP_COPY_TEMPLATES[statusForView] && (
                <EditableFollowUpCopy
                  stageKey={statusForView}
                  leadName={lead.name}
                />
              )}

              {statusForView === 'fechado' && newStatus !== 'fechado' && friendlyData && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    🤝 Paciente Amigo
                  </h4>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="friendly_patient_detail"
                        checked={friendlyPatient === true}
                        onChange={async () => {
                          setFriendlyPatient(true);
                          await supabase.from('upsell_opportunities').update({ friendly_patient: true }).eq('lead_id', lead.id);
                          toast.success('Paciente Amigo atualizado para Sim');
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm font-medium">✅ Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="friendly_patient_detail"
                        checked={friendlyPatient === false}
                        onChange={async () => {
                          setFriendlyPatient(false);
                          await supabase.from('upsell_opportunities').update({ friendly_patient: false }).eq('lead_id', lead.id);
                          toast.success('Paciente Amigo atualizado para Não');
                        }}
                        className="h-4 w-4 accent-destructive"
                      />
                      <span className="text-sm font-medium">❌ Não</span>
                    </label>
                  </div>
                  <Badge className={cn("text-xs", friendlyPatient ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                    {friendlyPatient ? '✅ Aceitou participar' : '❌ Não participa'}
                  </Badge>
                </div>
              )}

              {statusForView === 'fechado' && (
                <div className="space-y-4">
                  {/* Paciente Amigo Section */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <h4 className="font-medium text-primary flex items-center gap-2">
                      🤝 Paciente Amigo
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      "Você se sentindo realizado com o tratamento no final, você aceita participar do programa <strong>'Paciente Amigo'</strong>, onde podemos gravar um pequeno vídeo de depoimento ou uma breve entrevista relatando sua experiência com seu tratamento? Isso te dá um <strong>cashback de R$ 200,00</strong> no seu tratamento. Lembrando que é opcional, apenas se realmente se sentir feliz com o tratamento e tiver o desejo de participar!"
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="friendly_patient_detail"
                          checked={friendlyPatient === true}
                          onChange={() => setFriendlyPatient(true)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm font-medium">✅ Sim</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="friendly_patient_detail"
                          checked={friendlyPatient === false}
                          onChange={() => setFriendlyPatient(false)}
                          className="h-4 w-4 accent-destructive"
                        />
                        <span className="text-sm font-medium">❌ Não</span>
                      </label>
                    </div>
                    {friendlyPatient === null && (
                      <p className="text-[10px] text-destructive">* Campo obrigatório antes de confirmar a venda</p>
                    )}
                  </div>

                  {/* Payment info */}
                  <div className="p-4 bg-success/5 rounded-lg border border-success/20 space-y-2">
                    <h4 className="font-medium text-success flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Venda Realizada
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Para marcar como Venda Realizada, é necessário ter um pagamento confirmado. 
                      Use o botão "Registrar Pagamento" acima antes de alterar o status.
                    </p>
                  </div>
                </div>
              )}


              {/* Rescue button for Follow-up 4 */}
              {statusForView === 'followup_4' && (
                <div className="p-3 rounded-lg border-2 border-warning/40 bg-warning/5 space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2 text-warning">
                    🔄 Lead em Follow-up 4
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Este lead chegou ao último follow-up. Marque como resgatado se houver retorno positivo.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-warning/30 text-warning hover:bg-warning/10"
                    onClick={() => {
                      updateStatus.mutate({
                        leadId: lead.id,
                        newStatus: 'resgatado' as LeadStatus,
                      }, {
                        onSuccess: () => onOpenChange(false),
                      });
                    }}
                    disabled={updateStatus.isPending}
                  >
                    ✅ Marcar como Resgatado
                  </Button>
                </div>
              )}

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              <div className="sticky bottom-0 pt-3 bg-card">
                <Button
                  className="w-full"
                  onClick={handleCreateTask}
                  disabled={!taskData.title || !taskData.scheduled_at || createTask.isPending}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {createTask.isPending ? 'Criando...' : 'Criar Tarefa'}
                </Button>
              </div>
            </TabsContent>

            {/* Triage Tab - always visible, editable only when status = compareceu */}
            <TabsContent value="triage" className="m-0">
              <TriageFormDialog
                lead={lead}
                inline
                readOnly={statusForView !== 'compareceu'}
              />
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
          </div>
        </Tabs>

        {/* Global footer - single primary action */}
        <div className="shrink-0 border-t bg-card px-4 sm:px-6 py-3">
          <Button
            className="w-full"
            onClick={async () => {
              const infoSaved = await handleSaveInfo();
              if (!infoSaved) return;

              if (newStatus && newStatus !== lead.status) {
                const saved = await handleChangeStatus();
                if (!saved) return;
              }
              toast.success('Evolução salva!');
              onOpenChange(false);
            }}
            disabled={updateLead.isPending || updateStatus.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateLead.isPending || updateStatus.isPending ? 'Salvando...' : 'Salvar Evolução'}
          </Button>
        </div>

        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          leadId={lead.id}
          leadName={lead.name}
          budgetValue={lead.treatment_value || lead.budget_value || 0}
        />
      </DialogContent>
    </Dialog>
  );
}
