import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, UserPlus, CheckCircle2, Users } from 'lucide-react';
import type { TriageReferral } from '@/hooks/useTriageReferrals';

interface ReferralEntry {
  referral_name: string;
  situation: string;
  relationship: string;
  converted_lead_id?: string | null;
}

interface TriageReferralSectionProps {
  referrals: ReferralEntry[];
  onChange: (referrals: ReferralEntry[]) => void;
  onConvertToLead?: (index: number) => void;
}

const SITUATION_OPTIONS = [
  { value: 'dentadura', label: 'Usa dentadura' },
  { value: 'ponte', label: 'Usa ponte' },
  { value: 'perda_dente', label: 'Perda de dente' },
];

export function TriageReferralSection({
  referrals,
  onChange,
  onConvertToLead,
}: TriageReferralSectionProps) {
  const [knownCount, setKnownCount] = useState<number>(referrals.length || 0);

  const handleCountChange = (value: string) => {
    const count = Math.max(0, parseInt(value) || 0);
    setKnownCount(count);

    if (count > referrals.length) {
      const newEntries: ReferralEntry[] = Array.from(
        { length: count - referrals.length },
        () => ({ referral_name: '', situation: 'dentadura', relationship: '' })
      );
      onChange([...referrals, ...newEntries]);
    } else if (count < referrals.length) {
      onChange(referrals.slice(0, count));
    }
  };

  const updateEntry = (index: number, field: keyof ReferralEntry, value: string) => {
    const updated = [...referrals];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addEntry = () => {
    setKnownCount(prev => prev + 1);
    onChange([...referrals, { referral_name: '', situation: 'dentadura', relationship: '' }]);
  };

  const removeEntry = (index: number) => {
    if (referrals[index].converted_lead_id) return;
    const updated = referrals.filter((_, i) => i !== index);
    setKnownCount(updated.length);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary">Indicações de Novos Pacientes</h3>
      </div>

      <div className="bg-primary/5 rounded-lg p-3">
        <Label className="text-xs font-medium">
          Quantas pessoas você conhece que usam dentadura, ponte ou têm perda de dente? *
        </Label>
        <Input
          type="number"
          min={0}
          value={knownCount}
          onChange={(e) => handleCountChange(e.target.value)}
          className="h-8 text-xs mt-2 w-24"
          placeholder="0"
        />
      </div>

      {referrals.length > 0 && (
        <div className="space-y-3">
          {referrals.map((entry, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 space-y-2 bg-card relative"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  Pessoa {index + 1}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  <Label className="text-[10px] text-muted-foreground">Situação *</Label>
                  <RadioGroup
                    value={entry.situation}
                    onValueChange={(v) => updateEntry(index, 'situation', v)}
                    className="flex flex-col gap-1 mt-0.5"
                    disabled={!!entry.converted_lead_id}
                  >
                    {SITUATION_OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-1.5">
                        <RadioGroupItem value={opt.value} className="h-3 w-3" />
                        <Label className="text-[10px] font-normal cursor-pointer">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Parentesco</Label>
                  <Input
                    value={entry.relationship}
                    onChange={(e) => updateEntry(index, 'relationship', e.target.value)}
                    placeholder="Ex: marido, amigo..."
                    className="h-7 text-xs"
                    disabled={!!entry.converted_lead_id}
                    maxLength={50}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEntry}
            className="w-full text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar pessoa
          </Button>
        </div>
      )}
    </div>
  );
}
