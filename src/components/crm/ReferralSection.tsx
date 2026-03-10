import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useReferralsByLead, useCreateReferral, useUpdateReferral } from '@/hooks/useReferrals';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Gift, Users, Tag, Loader2, UserPlus, Edit2, Check, X, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReferralSectionProps {
  leadId: string;
  leadName: string;
}

export function ReferralSection({ leadId, leadName }: ReferralSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: referrals, isLoading } = useReferralsByLead(leadId);
  const { data: allLeads } = useCRMLeads();
  const createReferral = useCreateReferral();
  const updateReferral = useUpdateReferral();

  const [showNewForm, setShowNewForm] = useState(false);
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // New referral form - create new lead inline
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    notes: '',
    reward_type: 'dinheiro',
    reward_value: '',
    discount_type: 'percentual',
    discount_value: '',
  });

  // Link existing lead
  const [existingLeadId, setExistingLeadId] = useState('');
  const [linkReward, setLinkReward] = useState({ reward_type: 'dinheiro', reward_value: '', discount_type: 'percentual', discount_value: '' });

  const availableLeads = allLeads?.filter(l => l.id !== leadId) || [];

  const handleCreateNewReferral = async () => {
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast.error('Preencha nome e telefone');
      return;
    }

    setSaving(true);
    try {
      const cleanPhone = newLeadForm.phone.replace(/\D/g, '');

      // Check duplicates
      const { data: existing } = await supabase
        .from('leads')
        .select('id, name')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existing) {
        toast.error(`Já existe um contato com esse telefone: ${existing.name}. Use "Vincular existente" para criar a indicação.`);
        setSaving(false);
        return;
      }

      // Create new lead in "indicacoes" column
      const { data: newLead, error: leadErr } = await supabase
        .from('leads')
        .insert({
          name: newLeadForm.name.trim(),
          phone: cleanPhone,
          whatsapp: cleanPhone,
          source: 'indicacao' as any,
          status: 'indicacoes' as any,
          notes: newLeadForm.notes.trim() || null,
          assigned_agent_id: user?.id || null,
        })
        .select('id')
        .single();

      if (leadErr) throw leadErr;

      // Create referral link
      const { error: refErr } = await supabase.from('referrals').insert({
        referrer_lead_id: leadId,
        referred_lead_id: newLead.id,
        reward_type: newLeadForm.reward_type,
        reward_value: parseFloat(newLeadForm.reward_value) || 0,
        discount_type: newLeadForm.discount_type,
        discount_value: parseFloat(newLeadForm.discount_value) || 0,
      } as any);

      if (refErr) throw refErr;

      // Log
      if (user) {
        await supabase.from('activity_logs').insert({
          agent_id: user.id,
          lead_id: newLead.id,
          activity_type: 'lead_created',
          title: `Indicação: ${newLeadForm.name.trim()} (por ${leadName})`,
        });
      }

      toast.success('Indicação criada e adicionada ao funil!');
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['referral-tags'] });
      setNewLeadForm({ name: '', phone: '', notes: '', reward_type: 'dinheiro', reward_value: '', discount_type: 'percentual', discount_value: '' });
      setShowNewForm(false);
    } catch {
      toast.error('Erro ao criar indicação');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkExisting = () => {
    if (!existingLeadId) return;
    createReferral.mutate({
      referrer_lead_id: leadId,
      referred_lead_id: existingLeadId,
      reward_type: linkReward.reward_type,
      reward_value: parseFloat(linkReward.reward_value) || 0,
      discount_type: linkReward.discount_type,
      discount_value: parseFloat(linkReward.discount_value) || 0,
    }, {
      onSuccess: () => {
        setExistingLeadId('');
        setLinkReward({ reward_type: 'dinheiro', reward_value: '', discount_type: 'percentual', discount_value: '' });
        setShowNewForm(false);
      },
    });
  };

  const handleStartEdit = (ref: any) => {
    setEditingId(ref.referred_lead_id);
    setEditForm({
      name: ref.referred?.name || '',
      phone: ref.referred?.phone || '',
      notes: '',
    });
  };

  const handleSaveEdit = async (referredLeadId: string) => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editForm.name.trim()) updates.name = editForm.name.trim();
      if (editForm.phone.trim()) updates.phone = editForm.phone.replace(/\D/g, '');
      if (editForm.notes.trim()) updates.notes = editForm.notes.trim();

      const { error } = await supabase.from('leads').update(updates).eq('id', referredLeadId);
      if (error) throw error;

      toast.success('Indicado atualizado!');
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setEditingId(null);
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const totalReward = referrals?.asReferrer.reduce((sum, r) => sum + Number(r.reward_value), 0) || 0;

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* If this lead was referred by someone */}
      {referrals?.asReferred && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Paciente Indicado</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Indicado por <strong>{referrals.asReferred.referrer?.name || 'Desconhecido'}</strong>
            </p>
            {Number(referrals.asReferred.discount_value) > 0 && (
              <Badge className="mt-1 bg-success/10 text-success border-0 text-xs">
                💰 Desconto: {referrals.asReferred.discount_type === 'percentual'
                  ? `${referrals.asReferred.discount_value}%`
                  : `R$ ${Number(referrals.asReferred.discount_value).toFixed(2)}`}
              </Badge>
            )}
            {referrals.asReferred.attendance_discount_applied && (
              <Badge className="mt-1 ml-1 bg-success/10 text-success border-0 text-xs">
                📅 Compareceu +5%
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referrals made by this lead */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Indicações feitas ({referrals?.asReferrer.length || 0})</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowNewForm(!showNewForm)}>
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          Nova Indicação
        </Button>
      </div>

      {totalReward > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Gift className="h-4 w-4 text-warning" />
          <span>Recompensa acumulada: <strong className="text-warning">R$ {totalReward.toFixed(2)}</strong></span>
        </div>
      )}

      {/* New referral form */}
      {showNewForm && (
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button size="sm" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')} className="flex-1 text-xs">
                Criar novo contato
              </Button>
              <Button size="sm" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')} className="flex-1 text-xs">
                Vincular existente
              </Button>
            </div>

            {mode === 'new' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome *</Label>
                    <Input className="h-8 text-xs" value={newLeadForm.name} onChange={(e) => setNewLeadForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do indicado" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefone / WhatsApp *</Label>
                    <Input className="h-8 text-xs" value={newLeadForm.phone} onChange={(e) => setNewLeadForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea className="text-xs min-h-[50px]" value={newLeadForm.notes} onChange={(e) => setNewLeadForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações..." rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Recompensa p/ indicador</Label>
                    <div className="flex gap-1">
                      <Select value={newLeadForm.reward_type} onValueChange={(v) => setNewLeadForm(p => ({ ...p, reward_type: v }))}>
                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">R$</SelectItem>
                          <SelectItem value="credito">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input className="h-8 text-xs flex-1" type="number" min="0" value={newLeadForm.reward_value} onChange={(e) => setNewLeadForm(p => ({ ...p, reward_value: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Desconto p/ indicado</Label>
                    <div className="flex gap-1">
                      <Select value={newLeadForm.discount_type} onValueChange={(v) => setNewLeadForm(p => ({ ...p, discount_type: v }))}>
                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentual">%</SelectItem>
                          <SelectItem value="fixo">R$</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input className="h-8 text-xs flex-1" type="number" min="0" value={newLeadForm.discount_value} onChange={(e) => setNewLeadForm(p => ({ ...p, discount_value: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleCreateNewReferral} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Criar Indicação'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>Cancelar</Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Selecionar contato existente</Label>
                  <Select value={existingLeadId} onValueChange={setExistingLeadId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o contato" /></SelectTrigger>
                    <SelectContent>
                      {availableLeads.map(l => (
                        <SelectItem key={l.id} value={l.id} className="text-xs">{l.name} - {l.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Recompensa</Label>
                    <div className="flex gap-1">
                      <Select value={linkReward.reward_type} onValueChange={(v) => setLinkReward(p => ({ ...p, reward_type: v }))}>
                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">R$</SelectItem>
                          <SelectItem value="credito">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input className="h-8 text-xs flex-1" type="number" min="0" value={linkReward.reward_value} onChange={(e) => setLinkReward(p => ({ ...p, reward_value: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Desconto</Label>
                    <div className="flex gap-1">
                      <Select value={linkReward.discount_type} onValueChange={(v) => setLinkReward(p => ({ ...p, discount_type: v }))}>
                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentual">%</SelectItem>
                          <SelectItem value="fixo">R$</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input className="h-8 text-xs flex-1" type="number" min="0" value={linkReward.discount_value} onChange={(e) => setLinkReward(p => ({ ...p, discount_value: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleLinkExisting} disabled={!existingLeadId || createReferral.isPending}>
                    {createReferral.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Vincular Indicação'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>Cancelar</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* List of referrals - editable */}
      {referrals?.asReferrer.map(ref => (
        <Card key={ref.id} className="border-0 shadow-sm">
          <CardContent className="p-3">
            {editingId === ref.referred_lead_id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-8 text-xs" value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome" />
                  <Input className="h-8 text-xs" value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="Telefone" />
                </div>
                <Textarea className="text-xs min-h-[40px]" value={editForm.notes} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações" rows={1} />
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7" onClick={() => handleSaveEdit(ref.referred_lead_id)} disabled={saving}>
                    <Check className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{ref.referred?.name || 'Desconhecido'}</p>
                    <Badge className="bg-chart-5/10 text-chart-5 border-0 text-[9px]">🏷️ Indicação</Badge>
                  </div>
                  {ref.referred?.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>{ref.referred.phone}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(ref.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {Number(ref.reward_value) > 0 && (
                    <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">
                      🎁 R$ {Number(ref.reward_value).toFixed(2)}
                    </Badge>
                  )}
                  {(ref as any).bonus_status === 'pago' && (
                    <Badge className="bg-success/10 text-success border-0 text-[10px]">✅ Pago</Badge>
                  )}
                  {(ref as any).bonus_status !== 'pago' && Number(ref.reward_value) > 0 && (ref.referred?.status === 'fechado' || ref.referred?.status === 'tratamento_andamento' || ref.referred?.status === 'concluido') && (
                    <Badge className="bg-warning/10 text-warning border-0 text-[10px]">⏳ Pendente</Badge>
                  )}
                  {ref.referred?.status === 'compareceu' && (
                    <Badge className="bg-success/10 text-success border-0 text-[10px]">Compareceu</Badge>
                  )}
                  {ref.referred?.status === 'fechado' && (
                    <Badge className="bg-success/10 text-success border-0 text-[10px]">Convertido</Badge>
                  )}
                  {ref.referred?.status === 'tratamento_andamento' && (
                    <Badge className="bg-chart-2/10 text-chart-2 border-0 text-[10px]">Em Tratamento</Badge>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEdit(ref)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
