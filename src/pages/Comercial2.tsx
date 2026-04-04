import { useState, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Search, X, TrendingUp, DollarSign, Users, Target, MessageSquare, Phone, ChevronRight, Gift, Calendar as CalendarIcon, Video } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  useUpsellOpportunities,
  useUpdateUpsellStatus,
  useUpdateUpsellOpportunity,
  useAddContactHistory,
  useContactHistory,
  useUpsellMetrics,
  useTreatmentSuggestions,
  UPSELL_STAGES,
  CONTACT_STATUS_CONFIG,
  type UpsellOpportunity,
} from '@/hooks/useUpsellOpportunities';
import { usePatientTriage } from '@/hooks/usePatientTriage';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* Detail Dialog Content with Triage Integration */
function DetailDialogContent({
  opp, updateOpp, handleUpdateContactStatus, setContactDialogOpen, contactHistory, suggestions,
}: {
  opp: UpsellOpportunity;
  updateOpp: ReturnType<typeof useUpdateUpsellOpportunity>;
  handleUpdateContactStatus: (s: string) => void;
  setContactDialogOpen: (v: boolean) => void;
  contactHistory: Array<{ id: string; contact_type: string; result: string | null; notes: string | null; created_at: string }>;
  suggestions: Array<{ id: string; trigger_treatment: string; suggested_treatment: string; delay_months: number }>;
}) {
  const { data: triage } = usePatientTriage(opp.lead_id);
  const [surgeryCalendarOpen, setSurgeryCalendarOpen] = useState(false);
  const [prosthesisCalendarOpen, setProsthesisCalendarOpen] = useState(false);

  const handleDateChange = (field: 'gift_surgery_date' | 'gift_prosthesis_date', date: Date | undefined) => {
    updateOpp.mutate({
      id: opp.id,
      [field]: date ? format(date, 'yyyy-MM-dd') : null,
    }, {
      onSuccess: () => {
        toast.success(date ? '📅 Data selecionada com sucesso!' : 'Data removida');
        if (field === 'gift_surgery_date') setSurgeryCalendarOpen(false);
        if (field === 'gift_prosthesis_date') setProsthesisCalendarOpen(false);
      },
      onError: () => {
        toast.error('Erro ao salvar data. Tente novamente.');
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Patient Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Tratamento Original</p>
          <p className="font-medium">{opp.lead?.interest_product || '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Valor Original</p>
          <p className="font-medium">{formatCurrency(opp.lead?.treatment_value || 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tratamento Sugerido</p>
          <p className="font-semibold text-primary">{opp.suggested_treatment}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Valor Estimado</p>
          <Input
            type="number"
            value={opp.estimated_value || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              updateOpp.mutate({ id: opp.id, estimated_value: val });
            }}
            className="h-8 text-sm mt-0.5"
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      {/* Triage Personalization Data */}
      {triage && (triage.ice_cream_flavor || triage.post_treatment_food) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">🎁 Personalização de Brinde</p>
          {triage.ice_cream_flavor && (
            <div className="flex items-start gap-2 text-sm">
              <span>🍦</span>
              <div>
                <p className="text-[10px] text-muted-foreground">Sabor de sorvete preferido</p>
                <p className="font-medium">{triage.ice_cream_flavor}</p>
              </div>
            </div>
          )}
          {triage.post_treatment_food && (
            <div className="flex items-start gap-2 text-sm">
              <span>🍽️</span>
              <div>
                <p className="text-[10px] text-muted-foreground">Desejo pós-tratamento</p>
                <p className="font-medium">{triage.post_treatment_food}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gift Management - Two Events */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 text-primary" /> Envio de Brindes
        </p>

        {/* Surgery Gift */}
        <div className={cn(
          "p-2.5 rounded-md border space-y-2",
          opp.gift_surgery_sent ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={opp.gift_surgery_sent}
                onCheckedChange={(checked) => {
                  updateOpp.mutate({
                    id: opp.id,
                    gift_surgery_sent: !!checked,
                    gift_surgery_sent_at: checked ? new Date().toISOString() : null,
                  });
                }}
                className="h-4 w-4"
              />
              <span className="text-xs font-semibold">🎁 Brinde – Dia da Cirurgia</span>
            </div>
            <Badge className={cn("text-[9px]", opp.gift_surgery_sent ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
              {opp.gift_surgery_sent ? 'Realizado' : 'Pendente'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">📅 Data:</Label>
            <Popover open={surgeryCalendarOpen} onOpenChange={setSurgeryCalendarOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {opp.gift_surgery_date ? format(new Date(opp.gift_surgery_date + 'T12:00:00'), 'dd/MM/yyyy') : 'Agendar'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start" side="bottom" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
                <Calendar
                  mode="single"
                  selected={opp.gift_surgery_date ? new Date(opp.gift_surgery_date + 'T12:00:00') : undefined}
                  onSelect={(d) => handleDateChange('gift_surgery_date', d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Prosthesis Gift */}
        <div className={cn(
          "p-2.5 rounded-md border space-y-2",
          opp.gift_prosthesis_sent ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={opp.gift_prosthesis_sent}
                onCheckedChange={(checked) => {
                  updateOpp.mutate({
                    id: opp.id,
                    gift_prosthesis_sent: !!checked,
                    gift_prosthesis_sent_at: checked ? new Date().toISOString() : null,
                  });
                }}
                className="h-4 w-4"
              />
              <span className="text-xs font-semibold">🎁 Brinde – Entrega da Prótese</span>
            </div>
            <Badge className={cn("text-[9px]", opp.gift_prosthesis_sent ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
              {opp.gift_prosthesis_sent ? 'Realizado' : 'Pendente'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">📅 Data:</Label>
            <Popover open={prosthesisCalendarOpen} onOpenChange={setProsthesisCalendarOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {opp.gift_prosthesis_date ? format(new Date(opp.gift_prosthesis_date + 'T12:00:00'), 'dd/MM/yyyy') : 'Agendar'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start" side="bottom" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
                <Calendar
                  mode="single"
                  selected={opp.gift_prosthesis_date ? new Date(opp.gift_prosthesis_date + 'T12:00:00') : undefined}
                  onSelect={(d) => handleDateChange('gift_prosthesis_date', d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Paciente Amigo Section */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          🤝 Paciente Amigo
        </p>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px]", opp.friendly_patient ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
            {opp.friendly_patient ? '✅ Aceitou participar' : '❌ Não participar'}
          </Badge>
        </div>
        {opp.friendly_patient && (
          <div className={cn(
            "p-2.5 rounded-md border space-y-2",
            opp.friendly_patient_video_recorded ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={opp.friendly_patient_video_recorded}
                  onCheckedChange={(checked) => {
                    updateOpp.mutate({
                      id: opp.id,
                      friendly_patient_video_recorded: !!checked,
                      friendly_patient_video_recorded_at: checked ? new Date().toISOString() : null,
                    });
                  }}
                  className="h-4 w-4"
                />
                <span className="text-xs font-semibold">🎬 Gravar Depoimento</span>
              </div>
              <Badge className={cn("text-[9px]", opp.friendly_patient_video_recorded ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                {opp.friendly_patient_video_recorded ? 'Realizado' : 'Pendente'}
              </Badge>
            </div>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Status do Contato</p>
        <Select value={opp.contact_status} onValueChange={handleUpdateContactStatus}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONTACT_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Observações</p>
        <Textarea
          value={opp.notes || ''}
          onChange={(e) => updateOpp.mutate({ id: opp.id, notes: e.target.value })}
          placeholder="Adicione observações..."
          className="text-sm min-h-[60px]"
        />
      </div>

      {/* Register Contact Button */}
      <Button onClick={() => setContactDialogOpen(true)} size="sm" className="w-full">
        <Phone className="h-4 w-4 mr-1" />
        Registrar Contato
      </Button>

      {/* Contact History */}
      {contactHistory.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico de Contatos</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {contactHistory.map((c) => (
              <div key={c.id} className="p-2 rounded-lg border bg-muted/30 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px]">
                    {c.contact_type === 'ligacao' ? '📞 Ligação' : c.contact_type === 'whatsapp' ? '💬 WhatsApp' : '📝 Outro'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(c.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                  </span>
                </div>
                {c.result && <p className="mt-1 font-medium">{c.result}</p>}
                {c.notes && <p className="mt-0.5 text-muted-foreground">{c.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treatment Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">💡 Sugestões de Tratamento</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions
              .filter(s => s.trigger_treatment === (opp.lead?.interest_product || ''))
              .map(s => (
                <Badge key={s.id} variant="outline" className="text-[10px] cursor-default">
                  {s.suggested_treatment}
                  {s.delay_months > 0 && ` (${s.delay_months}m)`}
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

const Comercial2 = () => {
  const { data: opportunities, isLoading } = useUpsellOpportunities();
  const { data: suggestions } = useTreatmentSuggestions();
  const metrics = useUpsellMetrics();
  const updateStatus = useUpdateUpsellStatus();
  const updateOpp = useUpdateUpsellOpportunity();
  const addContact = useAddContactHistory();

  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<UpsellOpportunity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactType, setContactType] = useState('ligacao');
  const [contactResult, setContactResult] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  const { data: contactHistory } = useContactHistory(selectedOpp?.id || null);

  // Auto-sync is handled by database trigger - no manual sync needed

  const filteredOpps = useMemo(() => {
    if (!opportunities) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return opportunities;
    return opportunities.filter(o =>
      o.lead?.name?.toLowerCase().includes(q) ||
      o.suggested_treatment.toLowerCase().includes(q)
    );
  }, [opportunities, searchQuery]);

  const getOppsByStatus = useCallback((status: string) => {
    return filteredOpps.filter(o => o.status === status);
  }, [filteredOpps]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDropTarget(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const opp = opportunities?.find(o => o.id === id);
    if (opp && opp.status !== newStatus) {
      updateStatus.mutate({ id, status: newStatus });
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleSaveContact = () => {
    if (!selectedOpp) return;
    addContact.mutate({
      opportunity_id: selectedOpp.id,
      contact_type: contactType,
      result: contactResult,
      notes: contactNotes,
    }, {
      onSuccess: () => {
        toast.success('Contato registrado!');
        setContactDialogOpen(false);
        setContactResult('');
        setContactNotes('');
      },
    });
  };

  const handleUpdateContactStatus = (newStatus: string) => {
    if (!selectedOpp) return;
    updateOpp.mutate({ id: selectedOpp.id, contact_status: newStatus });
  };

  if (isLoading) {
    return (
      <AppLayout title="Comercial 2 – Pós-Venda e LTV">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Comercial 2 – Pós-Venda e LTV">
      <div className="flex flex-col h-auto md:h-[calc(100vh-8rem)] min-h-0">
        {/* Metrics Bar */}
        {metrics && (
          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mb-4">
            <Card className="monday-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Pacientes</p>
                    <p className="text-lg font-bold">{metrics.uniquePatients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-chart-5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Oportunidades</p>
                    <p className="text-lg font-bold">{metrics.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Conversão</p>
                    <p className="text-lg font-bold">{metrics.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Faturamento Upsell</p>
                    <p className="text-lg font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
                    <p className="text-lg font-bold">{formatCurrency(metrics.avgTicket)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">LTV/Paciente</p>
                    <p className="text-lg font-bold">{formatCurrency(metrics.ltvPerPatient)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card border-warning/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">🎁 Brindes Pendentes</p>
                    <p className="text-lg font-bold text-warning">{metrics.giftsPending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card border-success/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">🎁 Brindes Enviados</p>
                    <p className="text-lg font-bold text-success">{metrics.giftsSent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card border-primary/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">🤝 Pac. Amigo</p>
                    <p className="text-lg font-bold text-primary">{metrics.friendlyAccepted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card border-warning/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">🎬 Dep. Pendentes</p>
                    <p className="text-lg font-bold text-warning">{metrics.videoPending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="monday-card border-success/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">🎬 Dep. Realizados</p>
                    <p className="text-lg font-bold text-success">{metrics.videoRecorded}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header */}
        <div className="shrink-0 flex flex-col gap-3 mb-3">
            <p className="text-sm text-muted-foreground">
              {filteredOpps.length} oportunidades no pipeline
              <span className="text-success ml-2">• Sincronização automática ativa</span>
            </p>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente ou tratamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0 md:min-h-0 overflow-x-auto overflow-y-auto md:overflow-y-hidden scroll-container-x">
          <div className="flex gap-3 min-w-max md:h-full pb-2 px-1">
            {UPSELL_STAGES.map((stage) => {
              const stageOpps = getOppsByStatus(stage.key);
              const isDropping = dropTarget === stage.key && draggedId !== null;
              const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

              return (
                <div
                  key={stage.key}
                  className="w-56 sm:w-64 lg:w-72 flex-shrink-0 flex flex-col min-h-0 md:h-full"
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.key)}
                >
                  <div className={cn(
                    "flex flex-col min-h-0 h-full rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200",
                    isDropping && 'ring-2 ring-primary ring-offset-2'
                  )}>
                    <div className="shrink-0 px-3 pt-3 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                        <span className="text-xs font-semibold flex-1 truncate">{stage.label}</span>
                        <Badge variant="secondary" className="font-semibold bg-muted text-xs h-5 min-w-5 flex items-center justify-center">
                          {stageOpps.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {formatCurrency(totalValue)}
                      </p>
                    </div>

                    <div className="flex-1 min-h-0 px-2 pb-2">
                      <div className="h-full overflow-y-auto scroll-container-y space-y-2 pr-1">
                        {stageOpps.map((opp) => {
                          const contactCfg = CONTACT_STATUS_CONFIG[opp.contact_status] || CONTACT_STATUS_CONFIG.nao_contatado;
                          return (
                            <div
                              key={opp.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, opp.id)}
                              onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                              className={cn(
                                "cursor-grab active:cursor-grabbing",
                                draggedId === opp.id && 'opacity-40'
                              )}
                            >
                              <Card
                                className="monday-card cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => { setSelectedOpp(opp); setDetailOpen(true); }}
                              >
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm font-semibold truncate flex-1">
                                      {opp.lead?.name || 'Paciente'}
                                    </p>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    </div>
                                    {/* Paciente Amigo on card */}
                                    {opp.friendly_patient && (
                                      <div className={cn(
                                        "flex items-center gap-1.5 p-1.5 rounded-md border text-[10px]",
                                        opp.friendly_patient_video_recorded
                                          ? "border-success/30 bg-success/5 text-success"
                                          : "border-warning/30 bg-warning/5 text-warning animate-pulse"
                                      )}>
                                        <span className="font-medium">
                                          {opp.friendly_patient_video_recorded ? '🎬 ✅ Depoimento' : '🎬 Gravar Depoimento'}
                                        </span>
                                      </div>
                                    )}
                                  <Badge variant="outline" className="text-[10px]">
                                    {opp.suggested_treatment}
                                  </Badge>
                                  <div className="flex items-center justify-between">
                                    <Badge className={cn('text-[9px]', contactCfg.color)}>
                                      {contactCfg.label}
                                    </Badge>
                                    {opp.estimated_value > 0 && (
                                      <span className="text-[10px] font-bold text-success">
                                        {formatCurrency(opp.estimated_value)}
                                      </span>
                                    )}
                                  </div>
                                  {opp.attempt_count > 0 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {opp.attempt_count} tentativa{opp.attempt_count > 1 ? 's' : ''}
                                    </p>
                                  )}
                                  {stage.key === 'base_pacientes' && (
                                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                      {/* Surgery Gift */}
                                      <div
                                        className={cn(
                                          "flex items-center gap-1.5 p-1.5 rounded-md border text-[10px]",
                                          opp.gift_surgery_sent
                                            ? "border-success/30 bg-success/5 text-success"
                                            : "border-warning/30 bg-warning/5 text-warning"
                                        )}
                                      >
                                        <Checkbox
                                          checked={opp.gift_surgery_sent}
                                          onCheckedChange={(checked) => {
                                            updateOpp.mutate({
                                              id: opp.id,
                                              gift_surgery_sent: !!checked,
                                              gift_surgery_sent_at: checked ? new Date().toISOString() : null,
                                            });
                                          }}
                                          className="h-3.5 w-3.5"
                                        />
                                        <Gift className="h-3 w-3" />
                                        <span className="font-medium">
                                          {opp.gift_surgery_sent ? '✅ Cirurgia' : '🎁 Cirurgia'}
                                        </span>
                                      </div>
                                      {/* Prosthesis Gift */}
                                      <div
                                        className={cn(
                                          "flex items-center gap-1.5 p-1.5 rounded-md border text-[10px]",
                                          opp.gift_prosthesis_sent
                                            ? "border-success/30 bg-success/5 text-success"
                                            : "border-warning/30 bg-warning/5 text-warning"
                                        )}
                                      >
                                        <Checkbox
                                          checked={opp.gift_prosthesis_sent}
                                          onCheckedChange={(checked) => {
                                            updateOpp.mutate({
                                              id: opp.id,
                                              gift_prosthesis_sent: !!checked,
                                              gift_prosthesis_sent_at: checked ? new Date().toISOString() : null,
                                            });
                                          }}
                                          className="h-3.5 w-3.5"
                                        />
                                        <Gift className="h-3 w-3" />
                                        <span className="font-medium">
                                          {opp.gift_prosthesis_sent ? '✅ Prótese' : '🎁 Prótese'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                        {stageOpps.length === 0 && (
                          <div className={cn(
                            "text-center py-8 rounded-lg",
                            stage.bgColor,
                            isDropping && 'border-2 border-dashed border-primary'
                          )}>
                            <p className="text-xs text-muted-foreground">
                              {isDropping ? 'Solte aqui' : 'Nenhuma oportunidade'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedOpp?.lead?.name || 'Detalhes da Oportunidade'}
            </DialogTitle>
          </DialogHeader>
          {selectedOpp && (
            <DetailDialogContent
              opp={selectedOpp}
              updateOpp={updateOpp}
              handleUpdateContactStatus={handleUpdateContactStatus}
              setContactDialogOpen={setContactDialogOpen}
              contactHistory={contactHistory || []}
              suggestions={suggestions || []}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Register Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1">Tipo de Contato</p>
              <Select value={contactType} onValueChange={setContactType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligacao">📞 Ligação</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="outro">📝 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Resultado</p>
              <Input
                value={contactResult}
                onChange={(e) => setContactResult(e.target.value)}
                placeholder="Ex: Paciente interessado em clareamento"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Observações</p>
              <Textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                placeholder="Detalhes adicionais..."
                className="text-sm min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setContactDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveContact} disabled={addContact.isPending}>
              {addContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Comercial2;
