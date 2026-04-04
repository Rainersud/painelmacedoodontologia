import { useState, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, X, TrendingUp, DollarSign, Users, Target, Plus, MessageSquare, Phone, ChevronRight } from 'lucide-react';
import {
  useUpsellOpportunities,
  useUpdateUpsellStatus,
  useUpdateUpsellOpportunity,
  useAddContactHistory,
  useContactHistory,
  useUpsellMetrics,
  useTreatmentSuggestions,
  useAutoGenerateUpsell,
  UPSELL_STAGES,
  CONTACT_STATUS_CONFIG,
  type UpsellOpportunity,
} from '@/hooks/useUpsellOpportunities';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Comercial2 = () => {
  const { data: opportunities, isLoading } = useUpsellOpportunities();
  const { data: allLeads } = useCRMLeads();
  const { data: suggestions } = useTreatmentSuggestions();
  const metrics = useUpsellMetrics();
  const updateStatus = useUpdateUpsellStatus();
  const updateOpp = useUpdateUpsellOpportunity();
  const addContact = useAddContactHistory();
  const autoGenerate = useAutoGenerateUpsell();

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
      <div className="flex flex-col h-[calc(100vh-8rem)] min-h-0">
        {/* Metrics Bar */}
        {metrics && (
          <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
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
          </div>
        )}

        {/* Header */}
        <div className="shrink-0 flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredOpps.length} oportunidades no pipeline
              {closedLeadsNotInPipeline.length > 0 && (
                <span className="text-warning ml-2">
                  • {closedLeadsNotInPipeline.length} pacientes aguardando sincronização
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {closedLeadsNotInPipeline.length > 0 && (
                <Button onClick={handleSyncClosedLeads} size="sm" variant="outline" disabled={autoGenerate.isPending}>
                  {autoGenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Sincronizar Pacientes
                </Button>
              )}
            </div>
          </div>
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
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scroll-container-x">
          <div className="flex gap-3 min-w-max h-full pb-2 px-1">
            {UPSELL_STAGES.map((stage) => {
              const stageOpps = getOppsByStatus(stage.key);
              const isDropping = dropTarget === stage.key && draggedId !== null;
              const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

              return (
                <div
                  key={stage.key}
                  className="w-64 lg:w-72 flex-shrink-0 flex flex-col min-h-0 h-full"
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedOpp?.lead?.name || 'Detalhes da Oportunidade'}
            </DialogTitle>
          </DialogHeader>
          {selectedOpp && (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Tratamento Original</p>
                  <p className="font-medium">{selectedOpp.lead?.interest_product || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Original</p>
                  <p className="font-medium">{formatCurrency(selectedOpp.lead?.treatment_value || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tratamento Sugerido</p>
                  <p className="font-semibold text-primary">{selectedOpp.suggested_treatment}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Estimado</p>
                  <Input
                    type="number"
                    value={selectedOpp.estimated_value || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      updateOpp.mutate({ id: selectedOpp.id, estimated_value: val });
                    }}
                    className="h-8 text-sm mt-0.5"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              {/* Contact Status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Status do Contato</p>
                <Select value={selectedOpp.contact_status} onValueChange={handleUpdateContactStatus}>
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
                  value={selectedOpp.notes || ''}
                  onChange={(e) => updateOpp.mutate({ id: selectedOpp.id, notes: e.target.value })}
                  placeholder="Adicione observações..."
                  className="text-sm min-h-[60px]"
                />
              </div>

              {/* Register Contact Button */}
              <Button
                onClick={() => setContactDialogOpen(true)}
                size="sm"
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-1" />
                Registrar Contato
              </Button>

              {/* Contact History */}
              {contactHistory && contactHistory.length > 0 && (
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
              {suggestions && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">💡 Sugestões de Tratamento</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions
                      .filter(s => s.trigger_treatment === (selectedOpp.lead?.interest_product || ''))
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
