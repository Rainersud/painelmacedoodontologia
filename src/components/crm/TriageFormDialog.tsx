import { useState, useEffect, useRef, useCallback } from 'react';
import { describeError } from '@/lib/errors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Save, Printer, CheckCircle2, Loader2, FileText, Building2 } from 'lucide-react';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { formatCurrency } from '@/lib/currency';
import { usePatientTriage, useSavePatientTriage, formatBirthDateBR, type PatientTriageData } from '@/hooks/usePatientTriage';
import { useTriageReferrals, useSaveTriageReferrals, useConvertReferralToLead, useBulkLinkReferrals } from '@/hooks/useTriageReferrals';
import { TriageReferralSection } from '@/components/crm/TriageReferralSection';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { esc, escapeHtml } from '@/lib/sanitize';
import type { Lead } from '@/types/crm';

interface TriageFormDialogProps {
  lead: Lead | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
  readOnly?: boolean;
}

const MOTIVATION_OPTIONS = [
  'Colocar dentes que estão faltando',
  'Melhorar a mastigação',
  'Melhorar o sorriso / estética',
  'Dores / desconfortos',
];

const DISCOMFORT_OPTIONS = [
  '6 meses',
  '1 a 5 anos',
  '6 a 10 anos',
  'Mais de 10 anos',
];

const FEAR_OPTIONS = ['Não', 'Sim', 'Muito'];

/** Situação profissional (guardada em spin_answers, sem mudança no banco). */
const WORK_STATUS_OPTIONS = ['Aposentado', 'Registrado', 'Autônomo', 'Desempregado'];
const WORK_STATUS_KEY = 'perfil_situacao_profissional';
const FAMILY_INCOME_KEY = 'perfil_renda_familiar';

/**
 * Roteiro SPIN. As chaves (spin_s1, spin_p1...) são as mesmas de antes, para manter as respostas
 * já gravadas; as perguntas foram reescritas para trazer mais consciência emocional.
 */
type SpinQuestion = { key: string; label: string; type: 'open' | 'yesno' };
const SPIN_BLOCKS: { title: string; questions: SpinQuestion[] }[] = [
  {
    title: 'SITUAÇÃO',
    questions: [
      { key: 'spin_s1', label: 'O que aconteceu na sua vida que fez você decidir cuidar do seu sorriso justamente agora?', type: 'open' },
      { key: 'spin_s2', label: 'Quando você se olha no espelho, sorri numa foto ou está à mesa com outras pessoas, o que mais te incomoda?', type: 'open' },
      { key: 'spin_s3', label: 'Você já chegou a fazer alguma avaliação antes?', type: 'yesno' },
      { key: 'spin_s4', label: 'Se sim, como foi essa experiência e o que fez você não seguir com o tratamento naquela época?', type: 'open' },
      { key: 'spin_s5', label: 'Quem é o responsável pelo pagamento do tratamento?', type: 'open' },
    ],
  },
  {
    title: 'PROBLEMA',
    questions: [
      { key: 'spin_p1', label: 'Você já deixou de sorrir, de aparecer em fotos ou de ir a algum compromisso por causa dos seus dentes?', type: 'yesno' },
      { key: 'spin_p2', label: 'Hoje você evita algum alimento ou sente dor ou desconforto para mastigar, falar ou sorrir?', type: 'yesno' },
      { key: 'spin_p3', label: 'Você sente que isso vem piorando com o tempo?', type: 'yesno' },
      { key: 'spin_p4', label: 'Como você se sente quando percebe que alguém está olhando para o seu sorriso?', type: 'open' },
    ],
  },
  {
    title: 'IMPLICAÇÃO',
    questions: [
      { key: 'spin_i1', label: 'Se nada mudar, como você imagina sua saúde, sua alimentação e sua autoestima daqui a 1 ou 2 anos?', type: 'open' },
      { key: 'spin_i2', label: 'O que você já deixou de viver ou de aproveitar por causa disso? E o que mais te preocupa em continuar adiando?', type: 'open' },
      { key: 'spin_i3', label: 'Como isso afeta as pessoas mais próximas de você, ou a forma como você se relaciona com elas no trabalho e na família?', type: 'open' },
    ],
  },
  {
    title: 'NECESSIDADE / SOLUÇÃO',
    questions: [
      { key: 'spin_n1', label: 'Como você gostaria que fosse seu sorriso ideal?', type: 'open' },
      { key: 'spin_n3', label: 'O que seria importante para você conseguir começar o tratamento?', type: 'open' },
    ],
  },
];

/** Auto-format birth date input as DD/MM/AAAA while typing. */
function maskBirthDate(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function TriageFormDialog({ lead, open, onOpenChange, inline = false, readOnly = false }: TriageFormDialogProps) {
  const { user } = useAuth();
  const { data: existingTriage, isLoading } = usePatientTriage(lead?.id);
  const { data: existingReferrals } = useTriageReferrals(lead?.id);
  const saveTriage = useSavePatientTriage();
  const saveReferrals = useSaveTriageReferrals();
  const convertToLead = useConvertReferralToLead();
  const bulkLink = useBulkLinkReferrals();
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<Partial<PatientTriageData>>({});
  const [referralEntries, setReferralEntries] = useState<Array<{
    referral_name: string;
    situation: string;
    relationship: string;
    phone?: string;
    converted_lead_id?: string | null;
    id?: string;
  }>>([]);

  useEffect(() => {
    if (existingTriage) {
      setForm({ ...existingTriage, birth_date: formatBirthDateBR(existingTriage.birth_date) });
    } else if (lead) {
      setForm({
        lead_id: lead.id,
        full_name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        motivation: [],
      });
    }
  }, [existingTriage, lead]);

  useEffect(() => {
    if (existingReferrals && existingReferrals.length > 0) {
      setReferralEntries(existingReferrals.map(r => ({
        id: r.id,
        referral_name: r.referral_name,
        situation: r.situation,
        relationship: r.relationship || '',
        phone: r.phone || '',
        converted_lead_id: r.converted_lead_id,
      })));
    }
  }, [existingReferrals]);

  if (!lead) return null;

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleMotivation = (option: string) => {
    const current = form.motivation || [];
    const updated = current.includes(option)
      ? current.filter(m => m !== option)
      : [...current, option];
    updateField('motivation', updated);
  };

  const handleConvertToLead = (index: number) => {
    
    const entry = referralEntries[index];
    if (!entry.referral_name.trim()) {
      toast.error('Preencha o nome da pessoa para converter em lead');
      return;
    }
    convertToLead.mutate(
      {
        referral: { ...entry, lead_id: lead.id },
        agentId: user?.id ?? null,
        referrerLeadId: lead.id,
      },
      {
        onSuccess: () => {
          toast.success(`${entry.referral_name} convertido em lead com sucesso!`);
          const updated = [...referralEntries];
          updated[index] = { ...updated[index], converted_lead_id: 'converted' };
          setReferralEntries(updated);
        },
        onError: (e) => toast.error(`Não foi possível converter indicação em lead. ${describeError(e)}`),
      }
    );
  };

  const handleBulkLink = () => {
    
    const linkable = referralEntries.filter(
      (e) => !e.converted_lead_id && e.referral_name.trim() && e.phone && e.phone.replace(/\D/g, '').length >= 10
    );
    if (linkable.length === 0) {
      toast.error('Preencha nome e telefone para vincular as indicações');
      return;
    }
    bulkLink.mutate(
      { referrals: linkable.map(r => ({ ...r, lead_id: lead.id })), agentId: user?.id ?? null, referrerLeadId: lead.id },
      {
        onSuccess: (results) => {
          const success = results.filter(r => r.success);
          const failed = results.filter(r => !r.success);
          if (success.length > 0) {
            toast.success(`${success.length} indicação(ões) vinculadas com sucesso!`);
            const updated = referralEntries.map(entry => {
              const wasLinked = success.find(r => r.name === entry.referral_name);
              if (wasLinked) return { ...entry, converted_lead_id: 'converted' };
              return entry;
            });
            setReferralEntries(updated);
          }
          if (failed.length > 0) {
            failed.forEach(f => toast.error(`${f.name}: ${f.error}`));
          }
        },
        onError: (e) => toast.error(`Não foi possível vincular indicações. ${describeError(e)}`),
      }
    );
  };

  /** Salva a ficha; com `complete`, conclui no MESMO salvamento (antes eram duas gravações
   *  simultâneas e a do formulário, com triage_completed=false, desfazia a conclusão). */
  const handleSave = async (complete = false): Promise<boolean> => {
    const totalCredit = form.credit_status === 'negado' ? 0 :
      (form.credit_pagmais_value || 0) + (form.credit_maioral_value || 0);
    const now = new Date().toISOString();
    const payload = {
      ...form,
      lead_id: lead.id,
      credit_approved_value: totalCredit,
      ...(complete
        ? { triage_completed: true, completed_at: existingTriage?.completed_at || now }
        : {}),
    } as PatientTriageData;

    try {
      const data = await saveTriage.mutateAsync(payload);
      toast.success(complete ? 'Triagem concluída e salva!' : 'Ficha de triagem salva com sucesso!');
      const triageId = existingTriage?.id || (data as { id?: string } | null)?.id;
      if (triageId && referralEntries.length > 0) {
        saveReferrals.mutate({
          leadId: lead.id,
          triageId,
          referrals: referralEntries.filter(r => r.referral_name.trim()).map(r => ({ ...r, lead_id: lead.id })),
        });
      }
      return true;
    } catch (err) {
      toast.error(`Não foi possível salvar a triagem. ${describeError(err)}`);
      return false;
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <html>
      <head>
        <title>Ficha de Triagem - ${esc(form.full_name || lead.name, '')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
          .intro { text-align: center; font-size: 13px; color: #666; margin-bottom: 24px; }
          .field { margin-bottom: 8px; }
          .field label { font-weight: bold; font-size: 13px; }
          .field span { font-size: 13px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        </style>
      </head>
      <body>
        <h1>Ficha de Triagem do Paciente</h1>
        <p class="intro">Preenchida em ${form.filled_at ? new Date(form.filled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
        <h2>Identificação</h2>
        <div class="grid">
          <div class="field"><label>Nome Completo:</label> <span>${esc(form.full_name)}</span></div>
          <div class="field"><label>Telefone:</label> <span>${esc(form.phone)}</span></div>
          <div class="field"><label>Email:</label> <span>${esc(form.email)}</span></div>
          <div class="field"><label>Endereço:</label> <span>${esc(form.address)}</span></div>
          <div class="field"><label>CEP:</label> <span>${esc(form.cep)}</span></div>
          <div class="field"><label>CPF:</label> <span>${esc(form.cpf)}</span></div>
          <div class="field"><label>Data de Nascimento:</label> <span>${esc(form.birth_date)}</span></div>
          <div class="field"><label>Profissão:</label> <span>${esc(form.profession)}</span></div>
          <div class="field"><label>Situação profissional:</label> <span>${esc(((form.spin_answers || {}) as Record<string, string>)[WORK_STATUS_KEY])}</span></div>
          <div class="field"><label>Renda familiar aproximada:</label> <span>${Number(((form.spin_answers || {}) as Record<string, string>)[FAMILY_INCOME_KEY]) ? formatCurrency(Number(((form.spin_answers || {}) as Record<string, string>)[FAMILY_INCOME_KEY])) : '-'}</span></div>
          <div class="field"><label>Instagram:</label> <span>${esc(form.instagram)}</span></div>
          <div class="field"><label>Facebook:</label> <span>${esc(form.facebook)}</span></div>
        </div>
        <h2>Roteiro SPIN</h2>
        ${(() => {
          const a = (form.spin_answers || {}) as Record<string, string>;
          const blocks: Array<[string, Array<[string, string]>]> = SPIN_BLOCKS.map(bl => [
            bl.title, bl.questions.map(q => [q.label, a[q.key] || '-'] as [string, string]),
          ]);
          return blocks.map(([title, qs]) => `
            <h3 style="font-size:14px;margin-top:12px;">${title}</h3>
            ${qs.map(([q, ans]) => `<div class="field"><label>${q}</label> <span>${escapeHtml(ans)}</span></div>`).join('')}
          `).join('');
        })()}
      </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const isCompleted = existingTriage?.triage_completed;

  const body = (
    <>
      {!inline && (
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">Ficha de Triagem do Paciente</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {lead.name} • {lead.phone}
              </DialogDescription>
            </div>
            {isCompleted && (
              <Badge className="bg-success/10 text-success border-success/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Triagem Concluída
              </Badge>
            )}
          </div>
        </DialogHeader>
      )}

      {inline && readOnly && (
        <div className="mx-4 sm:mx-6 mt-2 mb-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning-strong">
          A ficha de triagem está em modo leitura. Edição liberada apenas quando o status do lead for "Compareceu".
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className={inline ? "px-4 sm:px-6 pb-4" : "flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4"}>
          <fieldset disabled={readOnly} className={readOnly ? "opacity-90" : ""}>
          <div ref={printRef} className="space-y-5 sm:space-y-6">
              {/* Intro text */}
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-primary">
                  GOSTARÍAMOS DE CONHECER UM POUCO MAIS SOBRE VOCÊ :)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Para que possamos proporcionar uma experiência totalmente diferenciada, separamos algumas perguntas diferentes das habituais. Fique à vontade para responder somente o que achar confortável.
                </p>
              </div>

              {/* Identification */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Identificação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Seu nome completo</Label>
                    <Input value={form.full_name || ''} onChange={e => updateField('full_name', e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone / WhatsApp</Label>
                    <Input value={form.phone || ''} onChange={e => updateField('phone', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={form.email || ''} onChange={e => updateField('email', e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Endereço</Label>
                    <Input value={form.address || ''} onChange={e => updateField('address', e.target.value)} placeholder="Rua, número, bairro, cidade" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CEP</Label>
                    <Input value={form.cep || ''} onChange={e => updateField('cep', e.target.value)} placeholder="00000-000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CPF</Label>
                    <Input value={form.cpf || ''} onChange={e => updateField('cpf', e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Nascimento</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.birth_date || ''}
                      onChange={e => updateField('birth_date', maskBirthDate(e.target.value))}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Profissão</Label>
                    <Input value={form.profession || ''} onChange={e => updateField('profession', e.target.value)} placeholder="Sua profissão" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Situação profissional</Label>
                    <RadioGroup
                      value={((form.spin_answers as Record<string, string> | undefined) || {})[WORK_STATUS_KEY] || ''}
                      onValueChange={v => updateField('spin_answers', { ...((form.spin_answers as Record<string, string> | undefined) || {}), [WORK_STATUS_KEY]: v })}
                      className="flex flex-wrap gap-x-4 gap-y-1 pt-1"
                    >
                      {WORK_STATUS_OPTIONS.map(opt => (
                        <div key={opt} className="flex items-center gap-1.5">
                          <RadioGroupItem value={opt} id={`work-${opt}`} />
                          <Label htmlFor={`work-${opt}`} className="text-xs font-normal cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Renda familiar aproximada (por mês)</Label>
                    <CurrencyInput
                      value={Number(((form.spin_answers as Record<string, string> | undefined) || {})[FAMILY_INCOME_KEY]) || 0}
                      onChange={v => updateField('spin_answers', { ...((form.spin_answers as Record<string, string> | undefined) || {}), [FAMILY_INCOME_KEY]: String(v) })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Instagram</Label>
                    <Input value={form.instagram || ''} onChange={e => updateField('instagram', e.target.value)} placeholder="@usuario" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Facebook</Label>
                    <Input value={form.facebook || ''} onChange={e => updateField('facebook', e.target.value)} placeholder="facebook.com/usuario" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SPIN Script */}
              <div>
                <h3 className="text-sm font-semibold mb-1 text-primary">Roteiro SPIN — Primeiro Contato Odontológico</h3>
                <p className="text-xs text-muted-foreground mb-4">Perguntas estruturadas para entender situação, problema, implicação e necessidade do paciente.</p>

                {SPIN_BLOCKS.map(block => (
                  <div key={block.title} className="mb-5">
                    <h4 className="text-xs font-bold text-primary/80 mb-2">{block.title}</h4>
                    <div className="space-y-3 pl-1">
                      {block.questions.map(q => {
                        const answers = (form.spin_answers as Record<string, string> | undefined) || {};
                        const value = answers[q.key] || '';
                        return (
                          <div key={q.key} className="space-y-1">
                            <Label className="text-xs">{q.label}</Label>
                            {q.type === 'yesno' ? (
                              <RadioGroup
                                value={value}
                                onValueChange={v => updateField('spin_answers', { ...answers, [q.key]: v })}
                                className="flex gap-4 mt-1"
                              >
                                <div className="flex items-center gap-2"><RadioGroupItem value="Sim" /><Label className="text-xs font-normal">Sim</Label></div>
                                <div className="flex items-center gap-2"><RadioGroupItem value="Não" /><Label className="text-xs font-normal">Não</Label></div>
                              </RadioGroup>
                            ) : (
                              <Textarea
                                value={value}
                                onChange={e => updateField('spin_answers', { ...answers, [q.key]: e.target.value })}
                                placeholder="Resposta do paciente..."
                                rows={2}
                                className="text-xs"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Personalização de Brinde */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary flex items-center gap-2">
                  Personalização de Brinde
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-chart-5">Brinde 1 — Dia da Cirurgia</p>
                    <Label className="text-xs flex items-center gap-1">
                      Qual sabor de sorvete você mais prefere? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.ice_cream_flavor || ''}
                      onChange={e => updateField('ice_cream_flavor', e.target.value)}
                      placeholder="Ex: Chocolate, Morango, Açaí..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-chart-5">Brinde 2 — Entrega da Prótese</p>
                    <Label className="text-xs flex items-center gap-1">
                      O que você mais deseja comer assim que arrumar seus dentes novos? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.post_treatment_food || ''}
                      onChange={e => updateField('post_treatment_food', e.target.value)}
                      placeholder="Ex: Churrasco, Maçã, Pizza..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Referral Section */}
              <TriageReferralSection
                referrals={referralEntries}
                onChange={setReferralEntries}
                onConvertToLead={handleConvertToLead}
                onBulkLink={handleBulkLink}
                isBulkLinking={bulkLink.isPending}
                leadId={lead.id}
                leadName={lead.name}
              />

              <Separator />

              {/* Credit Status */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Status de Crédito</h3>
                <RadioGroup
                  value={form.credit_status || ''}
                  onValueChange={v => {
                    updateField('credit_status', v);
                    if (v === 'negado') {
                      updateField('credit_pagmais_value', 0);
                      updateField('credit_capim_value', 0);
                      updateField('credit_maioral_value', 0);
                      updateField('credit_drgestao_value', 0);
                      updateField('credit_approved_value', 0);
                    }
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="aprovado" />
                    <Label className="text-xs font-normal cursor-pointer">APROVADO</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="negado" />
                    <Label className="text-xs font-normal cursor-pointer">NEGADO</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Credit Companies */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-primary">Empresas de Crédito</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">PAGMAIS</Label>
                    <CurrencyInput
                      value={form.credit_pagmais_value || 0}
                      onChange={(v) => updateField('credit_pagmais_value', v)}
                      placeholder="Valor liberado"
                      className="h-8 text-xs"
                      disabled={form.credit_status === 'negado'}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">MAIORAL</Label>
                    <CurrencyInput
                      value={form.credit_maioral_value || 0}
                      onChange={(v) => updateField('credit_maioral_value', v)}
                      placeholder="Valor liberado"
                      className="h-8 text-xs"
                      disabled={form.credit_status === 'negado'}
                    />
                  </div>
                </div>

                {/* Credit summary - per company, no sum */}
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1">
                  <Label className="text-xs font-semibold text-primary">Crédito Liberado</Label>
                  {(() => {
                    const entries = [
                      { name: 'PAGMAIS', value: form.credit_pagmais_value || 0 },
                      { name: 'MAIORAL', value: form.credit_maioral_value || 0 },
                    ].filter(e => e.value > 0);

                    if (form.credit_status === 'negado' || entries.length === 0) {
                      return <p className="text-xs text-muted-foreground">Sem crédito liberado</p>;
                    }

                    return entries.map(e => (
                      <div key={e.name} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{e.name}:</span>
                        <span className="font-semibold text-primary">{formatCurrency(e.value)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>


              {/* Filled info */}
              {existingTriage?.filled_at && (
                <div className="text-[10px] text-muted-foreground text-right">
                  Preenchida em {new Date(existingTriage.filled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </div>
              )}
          </div>
          </fieldset>
        </div>
      )}

      {/* Action buttons - placed right after the form content */}
      {!readOnly && (
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={handlePrint} size="icon" title="Imprimir Ficha" className="shrink-0">
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            onClick={async () => {
              const ok = await handleSave(true);
              if (ok && !inline) onOpenChange?.(false);
            }}
            disabled={saveTriage.isPending}
            className="flex-1"
          >
            {saveTriage.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Concluir Triagem
          </Button>
        </div>
      )}
    </>
  );

  if (inline) {
    return <div className="rounded-lg border bg-card overflow-hidden">{body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-[700px] lg:max-w-[800px] max-h-[92vh] h-[92vh] flex flex-col p-0 overflow-hidden">
        {body}
      </DialogContent>
    </Dialog>
  );
}
