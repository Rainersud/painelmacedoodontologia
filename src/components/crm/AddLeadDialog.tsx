import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'site', label: 'Site' },
  { value: 'outro', label: 'Outros' },
];

const TREATMENT_OPTIONS = [
  { value: 'implante', label: 'Implante' },
  { value: 'protese_flexivel', label: 'Prótese Flexível' },
  { value: 'protese_total', label: 'Prótese Total' },
  { value: 'outro', label: 'Outro' },
];

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    source: 'outro' as string,
    interest_product: undefined as string | undefined,
    notes: '',
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.interest_product) {
      toast.error('Preencha nome, telefone e interesse de tratamento');
      return;
    }

    setSaving(true);
    try {
      const cleanPhone = form.phone.replace(/\D/g, '');

      const { error } = await supabase.from('leads').insert({
        name: form.name.trim(),
        phone: cleanPhone,
        whatsapp: cleanPhone,
        source: form.source as any,
        status: (form.source === 'indicacao' ? 'indicacoes' : 'novo_lead') as any,
        interest_product: form.interest_product,
        notes: form.notes.trim() || null,
        assigned_agent_id: user?.id || null,
      });

      if (error) throw error;

      // Log activity
      if (user) {
        await supabase.from('activity_logs').insert({
          lead_id: null,
          agent_id: user.id,
          activity_type: 'lead_created',
          title: `Novo lead: ${form.name.trim()}`,
        });
      }

      toast.success('Lead adicionado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      setForm({ name: '', phone: '', source: 'outro', interest_product: '', notes: '' });
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao adicionar lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Adicionar Lead</DialogTitle>
          <DialogDescription>
            O lead será adicionado na coluna "Novos Leads" e na Base de Contatos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 flex-1 overflow-y-auto scroll-container-y">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome do contato"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone / WhatsApp *</Label>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label>Origem do Lead</Label>
            <Select
              value={form.source}
              onValueChange={(value) => setForm(prev => ({ ...prev, source: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Interesse de Tratamento *</Label>
            <Select
              value={form.interest_product}
              onValueChange={(value) => setForm(prev => ({ ...prev, interest_product: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tratamento" />
              </SelectTrigger>
              <SelectContent>
                {TREATMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre o contato..."
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
