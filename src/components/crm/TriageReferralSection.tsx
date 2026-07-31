import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Plus, Trash2, UserPlus, CheckCircle2, Users, Phone, Loader2, Link2,
  Trophy, Sparkles, Gift, MessageSquare, Copy, RotateCcw, Save,
} from 'lucide-react';

interface ReferralEntry {
  referral_name: string;
  situation: string;
  relationship: string;
  phone?: string;
  converted_lead_id?: string | null;
  id?: string;
}

interface TriageReferralSectionProps {
  referrals: ReferralEntry[];
  onChange: (referrals: ReferralEntry[]) => void;
  onConvertToLead?: (index: number) => void;
  onBulkLink?: () => void;
  isBulkLinking?: boolean;
  leadId?: string;
  leadName?: string;
}

const REWARD_TIERS = [
  {
    count: 5,
    percent: 2,
    perks: ['1 limpeza gratuita', '2% sobre cada tratamento fechado'],
    color: 'text-chart-2',
    bg: 'bg-chart-2/10',
    border: 'border-chart-2/30',
  },
  {
    count: 15,
    percent: 4,
    perks: ['1 limpeza gratuita', '1 clareamento de plaquinha', '4% sobre cada tratamento fechado'],
    color: 'text-chart-5',
    bg: 'bg-chart-5/10',
    border: 'border-chart-5/30',
  },
  {
    count: 40,
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

export function TriageReferralSection({
  referrals,
  onChange,
  onConvertToLead,
  onBulkLink,
  isBulkLinking,
  leadId,
  leadName,
}: TriageReferralSectionProps) {
  // RMKT script (per-lead) with localStorage
  const scriptKey = `referral_rmkt_script_${leadId || 'global'}`;
  const [rmktScript, setRmktScript] = useState<string>(() => {
    try {
      return localStorage.getItem(scriptKey) ?? DEFAULT_RMKT_SCRIPT(leadName || '');
    } catch {
      return DEFAULT_RMKT_SCRIPT(leadName || '');
    }
  });
  const [scriptDirty, setScriptDirty] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(scriptKey);
      setRmktScript(saved ?? DEFAULT_RMKT_SCRIPT(leadName || ''));
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
      setRmktScript(DEFAULT_RMKT_SCRIPT(leadName || ''));
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

  // Entries
  const updateEntry = (index: number, field: keyof ReferralEntry, value: string) => {
    const updated = [...referrals];
    if (field === 'phone') {
      updated[index] = { ...updated[index], phone: formatPhone(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    onChange(updated);
  };

  const addEntry = () => {
    onChange([
      ...referrals,
      { referral_name: '', situation: 'dentadura', relationship: '', phone: '' },
    ]);
  };

  const removeEntry = (index: number) => {
    if (referrals[index].converted_lead_id) return;
    onChange(referrals.filter((_, i) => i !== index));
  };

  const totalReferrals = referrals.length;

  const currentTier = useMemo(() => {
    let active: typeof REWARD_TIERS[number] | null = null;
    for (const t of REWARD_TIERS) if (totalReferrals >= t.count) active = t;
    return active;
  }, [totalReferrals]);

  const nextTier = useMemo(
    () => REWARD_TIERS.find((t) => totalReferrals < t.count) || null,
    [totalReferrals]
  );

  const unlinkable = referrals.filter(
    (e) => !e.converted_lead_id && e.referral_name.trim()
  );
  const linkable = referrals.filter(
    (e) =>
      !e.converted_lead_id &&
      e.referral_name.trim() &&
      e.phone &&
      e.phone.replace(/\D/g, '').length >= 10
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary">Indicações de Novos Pacientes</h3>
      </div>

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
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[11px] text-primary font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-chart-2 mr-1.5" />
                    Quem você indica ganha: 1 limpeza gratuita + 10% de desconto em qualquer tratamento
                  </p>
                  <p className="text-[11px] text-chart-5 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-chart-5 mr-1.5" />
                    Você ganha ao indicar: limpezas, clareamentos e % sobre tratamentos fechados (veja os níveis abaixo)
                  </p>
                </div>
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
                    unlocked ? `${tier.border} ${tier.bg}` : 'border-border bg-muted/30 opacity-70'
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
        </CardContent>
      </Card>

      {/* RMKT Script */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-chart-5" />
              <span className="text-sm font-semibold">Script para pac indicado</span>
              {scriptDirty && <Badge variant="outline" className="text-[9px] h-4">não salvo</Badge>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={handleCopyScript}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={handleResetScript} title="Restaurar padrão">
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button size="sm" className="h-7 text-[11px]" onClick={handleSaveScript} disabled={!scriptDirty}>
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
            Substitua <code>[GRAU DE PARENTESCO]</code> conforme a indicação.
          </p>
        </CardContent>
      </Card>

      {/* Header with + button */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Indicação</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={addEntry}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Entries */}
      {referrals.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          Nenhuma indicação adicionada. Clique em "Adicionar" para começar.
        </p>
      )}

      <div className="space-y-3">
        {referrals.map((entry, index) => (
          <div
            key={index}
            className="border rounded-lg p-3 space-y-2 bg-card relative"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Indicação {index + 1}
              </span>
              <div className="flex items-center gap-1">
                {entry.converted_lead_id ? (
                  <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Convertido em Lead
                  </Badge>
                ) : (
                  <>
                    {onConvertToLead && entry.referral_name.trim() && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-primary hover:text-primary"
                        onClick={() => onConvertToLead(index)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Converter em Lead
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removeEntry(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Nome *</Label>
                <Input
                  value={entry.referral_name}
                  onChange={(e) => updateEntry(index, 'referral_name', e.target.value)}
                  placeholder="Nome da pessoa"
                  className="h-7 text-xs"
                  disabled={!!entry.converted_lead_id}
                  maxLength={100}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone *
                </Label>
                <Input
                  value={entry.phone || ''}
                  onChange={(e) => updateEntry(index, 'phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-7 text-xs"
                  disabled={!!entry.converted_lead_id}
                  maxLength={16}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] text-muted-foreground">Parentesco</Label>
                <Input
                  value={entry.relationship}
                  onChange={(e) => updateEntry(index, 'relationship', e.target.value)}
                  placeholder="Ex: marido, amigo, irmã..."
                  className="h-7 text-xs"
                  disabled={!!entry.converted_lead_id}
                  maxLength={50}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk link */}
      {unlinkable.length > 0 && onBulkLink && (
        <div className="mt-2 p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Vincular indicações ao CRM
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Cria cada pessoa como novo lead no CRM com origem "Indicação", vinculado a este paciente.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={onBulkLink}
              disabled={isBulkLinking || linkable.length === 0}
            >
              {isBulkLinking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>Vincular ({linkable.length})</>
              )}
            </Button>
          </div>

          {linkable.length === 0 && (
            <p className="text-[10px] text-destructive">
              Preencha nome e telefone para habilitar a vinculação.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
