import { useState, useEffect, useRef, useCallback } from 'react';
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
import { usePatientTriage, useSavePatientTriage, useMarkTriageCompleted, type PatientTriageData } from '@/hooks/usePatientTriage';
import { useTriageReferrals, useSaveTriageReferrals, useConvertReferralToLead, useBulkLinkReferrals } from '@/hooks/useTriageReferrals';
import { TriageReferralSection } from '@/components/crm/TriageReferralSection';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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

export function TriageFormDialog({ lead, open, onOpenChange, inline = false, readOnly = false }: TriageFormDialogProps) {
  const { user } = useAuth();
  const { data: existingTriage, isLoading } = usePatientTriage(lead?.id);
  const { data: existingReferrals } = useTriageReferrals(lead?.id);
  const saveTriage = useSavePatientTriage();
  const saveReferrals = useSaveTriageReferrals();
  const convertToLead = useConvertReferralToLead();
  const bulkLink = useBulkLinkReferrals();
  const markCompleted = useMarkTriageCompleted();
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
      setForm(existingTriage);
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
    if (!user) return;
    const entry = referralEntries[index];
    if (!entry.referral_name.trim()) {
      toast.error('Preencha o nome da pessoa para converter em lead');
      return;
    }
    convertToLead.mutate(
      {
        referral: { ...entry, lead_id: lead.id },
        agentId: user.id,
        referrerLeadId: lead.id,
      },
      {
        onSuccess: () => {
          toast.success(`${entry.referral_name} convertido em lead com sucesso!`);
          const updated = [...referralEntries];
          updated[index] = { ...updated[index], converted_lead_id: 'converted' };
          setReferralEntries(updated);
        },
        onError: () => toast.error('Erro ao converter indicação em lead'),
      }
    );
  };

  const handleBulkLink = () => {
    if (!user) return;
    const linkable = referralEntries.filter(
      (e) => !e.converted_lead_id && e.referral_name.trim() && e.phone && e.phone.replace(/\D/g, '').length >= 10
    );
    if (linkable.length === 0) {
      toast.error('Preencha nome e telefone para vincular as indicações');
      return;
    }
    bulkLink.mutate(
      { referrals: linkable.map(r => ({ ...r, lead_id: lead.id })), agentId: user.id, referrerLeadId: lead.id },
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
        onError: () => toast.error('Erro ao vincular indicações'),
      }
    );
  };

  const handleSave = () => {
    const totalCredit = form.credit_status === 'negado' ? 0 :
      (form.credit_pagmais_value || 0) + (form.credit_capim_value || 0) + (form.credit_maioral_value || 0) + (form.credit_drgestao_value || 0);
    
    saveTriage.mutate(
      { ...form, lead_id: lead.id, credit_approved_value: totalCredit } as PatientTriageData,
      {
        onSuccess: (data) => {
          toast.success('Ficha de triagem salva com sucesso!');
          // Save referrals after triage is saved
          const triageId = existingTriage?.id || (data as any)?.id;
          if (triageId && referralEntries.length > 0) {
            saveReferrals.mutate({
              leadId: lead.id,
              triageId,
              referrals: referralEntries.filter(r => r.referral_name.trim()).map(r => ({ ...r, lead_id: lead.id })),
            });
          }
        },
        onError: () => toast.error('Erro ao salvar ficha de triagem'),
      }
    );
  };

  const handleMarkCompleted = () => {
    markCompleted.mutate(lead.id, {
      onSuccess: () => toast.success('Triagem marcada como concluída!'),
      onError: () => toast.error('Erro ao concluir triagem'),
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <html>
      <head>
        <title>Ficha de Triagem - ${form.full_name || lead.name}</title>
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
          <div class="field"><label>Nome Completo:</label> <span>${form.full_name || '-'}</span></div>
          <div class="field"><label>Telefone:</label> <span>${form.phone || '-'}</span></div>
          <div class="field"><label>Como gosta de ser chamado(a):</label> <span>${form.nickname || '-'}</span></div>
          <div class="field"><label>Email:</label> <span>${form.email || '-'}</span></div>
          <div class="field"><label>Endereço:</label> <span>${form.address || '-'}</span></div>
          <div class="field"><label>CEP:</label> <span>${form.cep || '-'}</span></div>
          <div class="field"><label>CPF:</label> <span>${form.cpf || '-'}</span></div>
          <div class="field"><label>Data de Nascimento:</label> <span>${form.birth_date || '-'}</span></div>
          <div class="field"><label>Profissão:</label> <span>${form.profession || '-'}</span></div>
          <div class="field"><label>Instagram:</label> <span>${form.instagram || '-'}</span></div>
          <div class="field"><label>Facebook:</label> <span>${form.facebook || '-'}</span></div>
        </div>
        <h2>Motivo da Consulta</h2>
        <div class="field"><label>Motivações:</label> <span>${(form.motivation || []).join(', ') || '-'}${form.motivation_other ? ', ' + form.motivation_other : ''}</span></div>
        <div class="field"><label>Tempo com incômodo:</label> <span>${form.discomfort_duration || '-'}</span></div>
        <h2>Condição Oral Atual</h2>
        <div class="grid">
          <div class="field"><label>Usa prótese:</label> <span>${form.uses_prosthesis === true ? 'Sim' : form.uses_prosthesis === false ? 'Não' : '-'}</span></div>
          <div class="field"><label>Tempo de prótese:</label> <span>${form.prosthesis_duration || '-'}</span></div>
          <div class="field"><label>Dificuldade para mastigar:</label> <span>${form.difficulty_chewing === true ? 'Sim' : form.difficulty_chewing === false ? 'Não' : '-'}</span></div>
          <div class="field"><label>Vergonha de sorrir:</label> <span>${form.ashamed_to_smile === true ? 'Sim' : form.ashamed_to_smile === false ? 'Não' : '-'}</span></div>
          <div class="field"><label>Implantes anteriores:</label> <span>${form.previous_implants === true ? 'Sim' : form.previous_implants === false ? 'Não' : '-'}</span></div>
          <div class="field"><label>Medo de dentista:</label> <span>${form.fear_of_dentist || '-'}</span></div>
        </div>
        <h2>Expectativa Estética e Emocional</h2>
        <div class="field"><label>Nota do incômodo (0-10):</label> <span>${form.smile_discomfort_score ?? '-'}</span></div>
        <div class="field"><label>O que incomoda no espelho:</label> <span>${form.mirror_concern || '-'}</span></div>
        <div class="field"><label>O que mudaria no sorriso:</label> <span>${form.desired_smile_change || '-'}</span></div>
        <div class="field"><label>Como gostaria de se sentir:</label> <span>${form.desired_feeling || '-'}</span></div>
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
        <div className="mx-4 sm:mx-6 mt-2 mb-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
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
                    <Label className="text-xs">Como gosta de ser chamado(a)?</Label>
                    <Input value={form.nickname || ''} onChange={e => updateField('nickname', e.target.value)} placeholder="Apelido" />
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
                    <Input type="date" value={form.birth_date || ''} onChange={e => updateField('birth_date', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Profissão</Label>
                    <Input value={form.profession || ''} onChange={e => updateField('profession', e.target.value)} placeholder="Sua profissão" />
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

              {/* Consultation reason */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Motivo da Consulta</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">O que te motivou a procurar o consultório?</Label>
                    <div className="space-y-2 mt-2">
                      {MOTIVATION_OPTIONS.map(option => (
                        <div key={option} className="flex items-center gap-2">
                          <Checkbox
                            checked={(form.motivation || []).includes(option)}
                            onCheckedChange={() => toggleMotivation(option)}
                          />
                          <Label className="text-xs font-normal cursor-pointer">{option}</Label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={!!form.motivation_other}
                          onCheckedChange={(checked) => {
                            if (!checked) updateField('motivation_other', '');
                          }}
                        />
                        <Label className="text-xs font-normal">Outro:</Label>
                        <Input
                          className="h-7 text-xs flex-1"
                          value={form.motivation_other || ''}
                          onChange={e => updateField('motivation_other', e.target.value)}
                          placeholder="Descreva..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Há quanto tempo está com este incômodo?</Label>
                    <RadioGroup
                      value={form.discomfort_duration || ''}
                      onValueChange={v => updateField('discomfort_duration', v)}
                      className="grid grid-cols-2 gap-2 mt-2"
                    >
                      {DISCOMFORT_OPTIONS.map(option => (
                        <div key={option} className="flex items-center gap-2">
                          <RadioGroupItem value={option} />
                          <Label className="text-xs font-normal cursor-pointer">{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Oral condition */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Condição Oral Atual</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Você usa prótese?</Label>
                    <RadioGroup
                      value={form.uses_prosthesis === true ? 'sim' : form.uses_prosthesis === false ? 'nao' : ''}
                      onValueChange={v => updateField('uses_prosthesis', v === 'sim')}
                      className="flex gap-4 mt-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="sim" />
                        <Label className="text-xs font-normal">Sim</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="nao" />
                        <Label className="text-xs font-normal">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {form.uses_prosthesis && (
                    <div className="space-y-1 ml-4">
                      <Label className="text-xs">Se sim, há quanto tempo?</Label>
                      <Input className="h-8 text-xs" value={form.prosthesis_duration || ''} onChange={e => updateField('prosthesis_duration', e.target.value)} placeholder="Ex: 5 anos" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Sente dificuldade para mastigar?</Label>
                    <RadioGroup
                      value={form.difficulty_chewing === true ? 'sim' : form.difficulty_chewing === false ? 'nao' : ''}
                      onValueChange={v => updateField('difficulty_chewing', v === 'sim')}
                      className="flex gap-4 mt-1"
                    >
                      <div className="flex items-center gap-2"><RadioGroupItem value="sim" /><Label className="text-xs font-normal">Sim</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="nao" /><Label className="text-xs font-normal">Não</Label></div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tem vergonha de sorrir ou falar por causa dos dentes?</Label>
                    <RadioGroup
                      value={form.ashamed_to_smile === true ? 'sim' : form.ashamed_to_smile === false ? 'nao' : ''}
                      onValueChange={v => updateField('ashamed_to_smile', v === 'sim')}
                      className="flex gap-4 mt-1"
                    >
                      <div className="flex items-center gap-2"><RadioGroupItem value="sim" /><Label className="text-xs font-normal">Sim</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="nao" /><Label className="text-xs font-normal">Não</Label></div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Já fez implantes antes?</Label>
                    <RadioGroup
                      value={form.previous_implants === true ? 'sim' : form.previous_implants === false ? 'nao' : ''}
                      onValueChange={v => updateField('previous_implants', v === 'sim')}
                      className="flex gap-4 mt-1"
                    >
                      <div className="flex items-center gap-2"><RadioGroupItem value="sim" /><Label className="text-xs font-normal">Sim</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="nao" /><Label className="text-xs font-normal">Não</Label></div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Você tem algum medo ou trauma de dentista?</Label>
                    <RadioGroup
                      value={form.fear_of_dentist || ''}
                      onValueChange={v => updateField('fear_of_dentist', v)}
                      className="flex gap-4 mt-1"
                    >
                      {FEAR_OPTIONS.map(option => (
                        <div key={option} className="flex items-center gap-2">
                          <RadioGroupItem value={option} />
                          <Label className="text-xs font-normal">{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Aesthetic expectations */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Expectativa Estética e Emocional</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">De 0 a 10, quanto seu sorriso te incomoda hoje?</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-4">0</span>
                      <Slider
                        value={[form.smile_discomfort_score ?? 5]}
                        onValueChange={([v]) => updateField('smile_discomfort_score', v)}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-4">10</span>
                      <Badge variant="outline" className="min-w-[2rem] justify-center">
                        {form.smile_discomfort_score ?? 5}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">O que mais te incomoda ao se olhar no espelho?</Label>
                    <Textarea
                      value={form.mirror_concern || ''}
                      onChange={e => updateField('mirror_concern', e.target.value)}
                      placeholder="Descreva..."
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">O que mudaria em seu sorriso se pudesse?</Label>
                    <Textarea
                      value={form.desired_smile_change || ''}
                      onChange={e => updateField('desired_smile_change', e.target.value)}
                      placeholder="Descreva..."
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Em uma palavra, como gostaria de se sentir depois do tratamento?</Label>
                    <Input
                      value={form.desired_feeling || ''}
                      onChange={e => updateField('desired_feeling', e.target.value)}
                      placeholder="Ex: Confiante, Feliz, Livre..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Personalização de Brinde */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary flex items-center gap-2">
                  🎁 Personalização de Brinde
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      🍦 Qual sabor de sorvete você mais prefere? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.ice_cream_flavor || ''}
                      onChange={e => updateField('ice_cream_flavor', e.target.value)}
                      placeholder="Ex: Chocolate, Morango, Açaí..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      🍽️ O que você mais deseja comer assim que arrumar seus dentes novos? <span className="text-destructive">*</span>
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
                    <Label className="text-xs font-semibold">CAPIM</Label>
                    <CurrencyInput
                      value={form.credit_capim_value || 0}
                      onChange={(v) => updateField('credit_capim_value', v)}
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
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">DR GESTÃO</Label>
                    <CurrencyInput
                      value={form.credit_drgestao_value || 0}
                      onChange={(v) => updateField('credit_drgestao_value', v)}
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
                      { name: 'CAPIM', value: form.credit_capim_value || 0 },
                      { name: 'MAIORAL', value: form.credit_maioral_value || 0 },
                      { name: 'DR GESTÃO', value: form.credit_drgestao_value || 0 },
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
            onClick={() => {
              handleSave();
              if (!isCompleted) handleMarkCompleted();
              if (!inline) onOpenChange?.(false);
            }}
            disabled={saveTriage.isPending || markCompleted.isPending}
            className="flex-1"
          >
            {(saveTriage.isPending || markCompleted.isPending) ? (
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
