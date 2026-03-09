import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useReferralsByLead, useCreateReferral, useUpdateReferral } from '@/hooks/useReferrals';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { Gift, Users, DollarSign, Percent, Tag, Loader2, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReferralSectionProps {
  leadId: string;
  leadName: string;
}

export function ReferralSection({ leadId, leadName }: ReferralSectionProps) {
  const { data: referrals, isLoading } = useReferralsByLead(leadId);
  const { data: allLeads } = useCRMLeads();
  const createReferral = useCreateReferral();
  const updateReferral = useUpdateReferral();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    referred_lead_id: '',
    reward_type: 'dinheiro',
    reward_value: '',
    discount_type: 'percentual',
    discount_value: '',
  });

  const availableLeads = allLeads?.filter(l => l.id !== leadId) || [];

  const handleCreate = () => {
    if (!form.referred_lead_id) return;
    createReferral.mutate({
      referrer_lead_id: leadId,
      referred_lead_id: form.referred_lead_id,
      reward_type: form.reward_type,
      reward_value: parseFloat(form.reward_value) || 0,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
    }, {
      onSuccess: () => {
        setForm({ referred_lead_id: '', reward_type: 'dinheiro', reward_value: '', discount_type: 'percentual', discount_value: '' });
        setShowForm(false);
      },
    });
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
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
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
      {showForm && (
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Contato indicado</Label>
              <Select value={form.referred_lead_id} onValueChange={(v) => setForm(prev => ({ ...prev, referred_lead_id: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o contato" />
                </SelectTrigger>
                <SelectContent>
                  {availableLeads.map(l => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      {l.name} - {l.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Recompensa</Label>
                <Select value={form.reward_type} onValueChange={(v) => setForm(prev => ({ ...prev, reward_type: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro (R$)</SelectItem>
                    <SelectItem value="credito">Crédito tratamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor recompensa</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.reward_value}
                  onChange={(e) => setForm(prev => ({ ...prev, reward_value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Desconto indicado</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm(prev => ({ ...prev, discount_type: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor desconto</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm(prev => ({ ...prev, discount_value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleCreate} disabled={!form.referred_lead_id || createReferral.isPending}>
                {createReferral.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Registrar Indicação'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List of referrals */}
      {referrals?.asReferrer.map(ref => (
        <Card key={ref.id} className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{ref.referred?.name || 'Desconhecido'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ref.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-1">
                {Number(ref.reward_value) > 0 && (
                  <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">
                    🎁 R$ {Number(ref.reward_value).toFixed(2)}
                  </Badge>
                )}
                {ref.referred?.status === 'compareceu' && (
                  <Badge className="bg-success/10 text-success border-0 text-[10px]">Compareceu</Badge>
                )}
                {ref.referred?.status === 'fechado' && (
                  <Badge className="bg-success/10 text-success border-0 text-[10px]">Convertido</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
