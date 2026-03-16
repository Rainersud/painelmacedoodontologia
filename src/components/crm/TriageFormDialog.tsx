import { useState, useEffect, useRef } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Save, Printer, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { usePatientTriage, useSavePatientTriage, useMarkTriageCompleted, type PatientTriageData } from '@/hooks/usePatientTriage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Lead } from '@/types/crm';

interface TriageFormDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function TriageFormDialog({ lead, open, onOpenChange }: TriageFormDialogProps) {
  const { user } = useAuth();
  const { data: existingTriage, isLoading } = usePatientTriage(lead?.id);
  const saveTriage = useSavePatientTriage();
  const markCompleted = useMarkTriageCompleted();
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<Partial<PatientTriageData>>({});

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

  const handleSave = () => {
    saveTriage.mutate(
      { ...form, lead_id: lead.id } as PatientTriageData,
      {
        onSuccess: () => toast.success('Ficha de triagem salva com sucesso!'),
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
        <p class="intro">Preenchida em ${form.filled_at ? new Date(form.filled_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</p>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-[700px] lg:max-w-[800px] max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 px-6 pb-4">
            <div ref={printRef} className="space-y-6">
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

              {/* Credit Limit */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Limite de Crédito</h3>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={form.credit_status === 'aprovado'}
                        onCheckedChange={(checked) => {
                          updateField('credit_status', checked ? 'aprovado' : 'pendente');
                        }}
                      />
                      <Label className="text-xs font-normal cursor-pointer">Aprovado</Label>
                    </div>
                    {form.credit_status === 'aprovado' && (
                      <div className="flex items-center gap-2 flex-1">
                        <Label className="text-xs whitespace-nowrap">Valor:</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 text-xs"
                          value={form.credit_approved_value || ''}
                          onChange={e => updateField('credit_approved_value', parseFloat(e.target.value) || 0)}
                          placeholder="R$ 0,00"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={form.credit_status === 'negado'}
                        onCheckedChange={(checked) => {
                          updateField('credit_status', checked ? 'negado' : 'pendente');
                          if (checked) updateField('credit_approved_value', 0);
                        }}
                      />
                      <Label className="text-xs font-normal cursor-pointer">Negado</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filled info */}
              {existingTriage?.filled_at && (
                <div className="text-[10px] text-muted-foreground text-right">
                  Preenchida em {new Date(existingTriage.filled_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30">
          <Button onClick={handleSave} disabled={saveTriage.isPending} className="flex-1">
            {saveTriage.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Ficha
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} size="icon" title="Imprimir Ficha" className="shrink-0">
              <Printer className="h-4 w-4" />
            </Button>
            {!isCompleted && (
              <Button
                variant="outline"
                onClick={handleMarkCompleted}
                disabled={markCompleted.isPending}
                className="text-success border-success/30 hover:bg-success/10 flex-1 sm:flex-none"
                title="Marcar como Triagem Concluída"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Concluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
