import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useReferralsByLead } from '@/hooks/useReferrals';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Gift, Users, Tag, Loader2, Plus, Trash2, Phone, Save,
  Copy, RotateCcw, Sparkles, Trophy, MessageSquare, CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReferralSectionProps {
  leadId: string;
  leadName: string;
}

interface DraftEntry {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  saving?: boolean;
}

const REWARD_TIERS = [
  {
    count: 10,
    percent: 2,
    perks: ['1 limpeza gratuita', '2% sobre cada tratamento fechado'],
    color: 'text-chart-2',
    bg: 'bg-chart-2/10',
    border: 'border-chart-2/30',
  },
  {
    count: 20,
    percent: 4,
    perks: ['1 limpeza gratuita', '1 clareamento de plaquinha', '4% sobre cada tratamento fechado'],
    color: 'text-chart-5',
    bg: 'bg-chart-5/10',
    border: 'border-chart-5/30',
  },
  {
    count: 50,
    percent: 5,
    perks: ['1 limpeza gratuita', '4 sessões de clareamento a laser', '5% sobre cada tratamento fechado'],
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
];

const DEFAULT_RMKT_SCRIPT = (patientName: string) =>
  `Olá, aqui é do consultório do Dr. Rainer Macedo, dentista. Estou entrando em contato porque nosso paciente ${patientName || '[NOME DO PACIENTE]'}, que é seu(ua) [GRAU DE PARENTESCO], presenteou você com uma avaliação odontológica com filmagem 3D gratuita + uma limpeza gratuita válida para esta semana. Além disso, você ainda ganha 10% de desconto em qualquer tratamento que desejar realizar em nosso consultório.`;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function ReferralSection({ leadId, leadName }: ReferralSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: referrals, isLoading } = useReferralsByLead(leadId);

  const [drafts, setDrafts] = useState<DraftEntry[]>([
    { id: uid(), name: '', phone: '', relationship: '' },
  ]);

  // RMKT script (per-lead) with localStorage
  const scriptKey = `referral_rmkt_script_${leadId}`;
  const [rmktScript, setRmktScript] = useState<string>(() => {
    try {
      return localStorage.getItem(scriptKey) ?? DEFAULT_RMKT_SCRIPT(leadName);
    } catch {
      return DEFAULT_RMKT_SCRIPT(leadName);
    }
  });
  const [scriptDirty, setScriptDirty] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(scriptKey);
      setRmktScript(saved ?? DEFAULT_RMKT_SCRIPT(leadName));
      setScriptDirty(false);
    } catch {
      // ignore
    }
  }, [scriptKey, leadName]);

  const handleSaveScript = () => {
    try {
      localStorage.setItem(scriptKey, rmktScript);
      setScriptDirty(false);
      toast.success('Script salvo');
    } catch {
      toast.error('Erro ao salvar script');
    }
  };

  const handleResetScript = () => {
    try {
      localStorage.removeItem(scriptKey);
      setRmktScript(DEFAULT_RMKT_SCRIPT(leadName));
      setScriptDirty(false);
      toast.success('Script restaurado');
    } catch {
      // ignore
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(rmktScript);
      toast.success('Script copiado!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Drafts management
  const updateDraft = (id: string, patch: Partial<DraftEntry>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };
  const addDraft = () => {
    setDrafts((prev) => [...prev, { id: uid(), name: '', phone: '', relationship: '' }]);
  };
  const removeDraft = (id: string) => {
    setDrafts((prev) => (prev.length === 1 ? prev : prev.filter((d) => d.id !== id)));
  };

  const handleSaveDraft = async (draft: DraftEntry) => {
    const cleanPhone = draft.phone.replace(/\D/g, '');
    if (!draft.name.trim() || cleanPhone.length < 10) {
      toast.error('Preencha nome e telefone válidos');
      return;
    }
    updateDraft(draft.id, { saving: true });
    try {
      const { data: existing } = await supabase
        .from('leads')
        .select('id, name')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (existing) {
        toast.error(`Já existe um contato com esse telefone: ${existing.name}`);
        updateDraft(draft.id, { saving: false });
        return;
      }

      const noteParts: string[] = [`Indicado por ${leadName}`];
      if (draft.relationship.trim()) noteParts.push(`Parentesco: ${draft.relationship.trim()}`);

      const { data: newLead, error: leadErr } = await supabase
        .from('leads')
        .insert({
          name: draft.name.trim(),
          phone: cleanPhone,
          whatsapp: cleanPhone,
          source: 'indicacao' as any,
          status: 'indicacoes' as any,
          notes: noteParts.join(' | '),
          assigned_agent_id: user?.id || null,
        })
        .select('id')
        .single();
      if (leadErr) throw leadErr;

      const { error: refErr } = await supabase.from('referrals').insert({
        referrer_lead_id: leadId,
        referred_lead_id: newLead.id,
        reward_type: 'dinheiro',
        reward_value: 0,
        discount_type: 'percentual',
        discount_value: 10,
      } as any);
      if (refErr) throw refErr;

      if (user) {
        supabase.from('activity_logs').insert({
          agent_id: user.id,
          lead_id: newLead.id,
          activity_type: 'lead_created',
          title: `Indicação: ${draft.name.trim()} (por ${leadName})`,
        });
      }

      toast.success('Indicação cadastrada!');
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['referral-tags'] });

      // Reset this draft (or remove if more than one)
      setDrafts((prev) => {
        const remaining = prev.filter((d) => d.id !== draft.id);
        return remaining.length === 0
          ? [{ id: uid(), name: '', phone: '', relationship: '' }]
          : remaining;
      });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar indicação');
    } finally {
      updateDraft(draft.id, { saving: false });
    }
  };

  // Stats
  const totalReferrals = referrals?.asReferrer.length || 0;

  const currentTier = useMemo(() => {
    let active: typeof REWARD_TIERS[number] | null = null;
    for (const t of REWARD_TIERS) if (totalReferrals >= t.count) active = t;
    return active;
  }, [totalReferrals]);

  const nextTier = useMemo(() => {
    return REWARD_TIERS.find((t) => totalReferrals < t.count) || null;
  }, [totalReferrals]);

  const commission = useMemo(() => {
    if (!referrals?.asReferrer || !currentTier) return 0;
    return referrals.asReferrer.reduce((sum, r) => {
      const closed = r.referred?.status === 'fechado'
        || r.referred?.status === 'tratamento_andamento'
        || r.referred?.status === 'concluido';
      if (!closed) return sum;
      const value = Number(r.referred?.treatment_value || 0);
      return sum + (value * currentTier.percent) / 100;
    }, 0);
  }, [referrals, currentTier]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Indicated by */}
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

      {/* Reward tiers panel */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-background to-chart-5/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Programa de Recompensas</p>
                <p className="text-[11px] text-muted-foreground">
                  {totalReferrals} indicação{totalReferrals === 1 ? '' : 'ões'} cadastrada{totalReferrals === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            {currentTier && (
              <Badge className={`${currentTier.bg} ${currentTier.color} border-0 text-[10px] gap-1`}>
                <Sparkles className="h-3 w-3" /> Nível {currentTier.count}+ desbloqueado
              </Badge>
            )}
          </div>

          {nextTier ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  Faltam <strong className="text-foreground">{nextTier.count - totalReferrals}</strong> para o próximo nível ({nextTier.count})
                </span>
                <span className="font-medium">{totalReferrals}/{nextTier.count}</span>
              </div>
              <Progress value={Math.min(100, (totalReferrals / nextTier.count) * 100)} className="h-2" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-success">
              <CheckCircle2 className="h-4 w-4" />
              Todos os níveis desbloqueados! 🎉
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {REWARD_TIERS.map((tier) => {
              const unlocked = totalReferrals >= tier.count;
              return (
                <div
                  key={tier.count}
                  className={`rounded-lg border p-2.5 transition-all ${
                    unlocked
                      ? `${tier.border} ${tier.bg}`
                      : 'border-border bg-muted/30 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${unlocked ? tier.color : 'text-muted-foreground'}`}>
                      {tier.count} indicações
                    </span>
                    {unlocked && <CheckCircle2 className={`h-3.5 w-3.5 ${tier.color}`} />}
                  </div>
                  <ul className="space-y-0.5">
                    {tier.perks.map((p, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground leading-tight flex gap-1">
                        <span>•</span><span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {currentTier && commission > 0 && (
            <div className="flex items-center gap-2 text-xs pt-2 border-t">
              <Gift className="h-4 w-4 text-warning" />
              <span>
                Comissão acumulada ({currentTier.percent}%):{' '}
                <strong className="text-warning">
                  R$ {commission.toFixed(2)}
                </strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RMKT Script */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-chart-5" />
              <span className="text-sm font-semibold">Script de Remarketing</span>
              {scriptDirty && (
                <Badge variant="outline" className="text-[9px] h-4">não salvo</Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={handleCopyScript}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={handleResetScript} title="Restaurar padrão">
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                className="h-7 text-[11px]"
                onClick={handleSaveScript}
                disabled={!scriptDirty}
              >
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
          </div>
          <Textarea
            value={rmktScript}
            onChange={(e) => {
              setRmktScript(e.target.value);
              setScriptDirty(true);
            }}
            rows={5}
            className="text-xs leading-relaxed resize-none"
          />
          <p className="text-[10px] text-muted-foreground">
            Substitua <code>[GRAU DE PARENTESCO]</code> conforme a indicação. O nome do paciente já é preenchido automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* Existing referrals list */}
      {totalReferrals > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Indicações feitas ({totalReferrals})</span>
          </div>
          {referrals!.asReferrer.map((ref) => {
            const closed = ref.referred?.status === 'fechado'
              || ref.referred?.status === 'tratamento_andamento'
              || ref.referred?.status === 'concluido';
            const treatmentValue = Number(ref.referred?.treatment_value || 0);
            const tierCommission = currentTier && closed ? (treatmentValue * currentTier.percent) / 100 : 0;
            return (
              <Card key={ref.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{ref.referred?.name || 'Desconhecido'}</p>
                        <Badge className="bg-chart-5/10 text-chart-5 border-0 text-[9px]">🏷️ Indicação</Badge>
                      </div>
                      {ref.referred?.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" /><span>{ref.referred.phone}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(ref.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {ref.referred?.status === 'compareceu' && (
                        <Badge className="bg-success/10 text-success border-0 text-[10px]">Compareceu</Badge>
                      )}
                      {ref.referred?.status === 'fechado' && (
                        <Badge className="bg-success/10 text-success border-0 text-[10px]">Convertido</Badge>
                      )}
                      {ref.referred?.status === 'tratamento_andamento' && (
                        <Badge className="bg-chart-2/10 text-chart-2 border-0 text-[10px]">Em Tratamento</Badge>
                      )}
                      {closed && treatmentValue > 0 && (
                        <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">
                          R$ {treatmentValue.toFixed(2)}
                        </Badge>
                      )}
                      {tierCommission > 0 && (
                        <Badge className="bg-warning/10 text-warning border-0 text-[10px]">
                          🎁 +R$ {tierCommission.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New referral drafts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Indicação</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addDraft}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>

        {drafts.map((draft, idx) => (
          <Card key={draft.id} className="border-dashed">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Indicação {idx + 1}
                </span>
                {drafts.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeDraft(draft.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Nome *</Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.name}
                    onChange={(e) => updateDraft(draft.id, { name: e.target.value })}
                    placeholder="Nome do indicado"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefone *
                  </Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.phone}
                    onChange={(e) => updateDraft(draft.id, { phone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={16}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] text-muted-foreground">Parentesco</Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.relationship}
                    onChange={(e) => updateDraft(draft.id, { relationship: e.target.value })}
                    placeholder="Ex: marido, amigo, irmã..."
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleSaveDraft(draft)}
                  disabled={draft.saving}
                >
                  {draft.saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <><Save className="h-3.5 w-3.5 mr-1" /> Salvar indicação</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
