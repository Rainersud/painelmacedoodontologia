import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarDays, Trash2, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEEKDAYS = [
  { idx: 0, label: 'Dom' },
  { idx: 1, label: 'Seg' },
  { idx: 2, label: 'Ter' },
  { idx: 3, label: 'Qua' },
  { idx: 4, label: 'Qui' },
  { idx: 5, label: 'Sex' },
  { idx: 6, label: 'Sáb' },
];

interface Holiday {
  id: string;
  holiday_date: string;
  description: string;
  is_recurring: boolean;
}

export function BusinessCalendarPanel() {
  const qc = useQueryClient();
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRecurring, setNewRecurring] = useState(false);

  const { data: maskRow } = useQuery({
    queryKey: ['working-days-mask'],
    queryFn: async () => {
      const { data } = await supabase
        .from('meta_settings')
        .select('id, setting_value')
        .eq('setting_key', 'working_days_bitmask')
        .maybeSingle();
      return data;
    },
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['clinic-holidays'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clinic_holidays')
        .select('*')
        .order('holiday_date');
      return (data || []) as Holiday[];
    },
  });

  const mask = Number(maskRow?.setting_value ?? 62);
  const isOn = (i: number) => (mask & (1 << i)) !== 0;
  const businessDaysCount = WEEKDAYS.filter(w => isOn(w.idx)).length;

  const toggleDay = async (i: number) => {
    const newMask = mask ^ (1 << i);
    if (maskRow?.id) {
      await supabase.from('meta_settings').update({ setting_value: newMask }).eq('id', maskRow.id);
    } else {
      await supabase.from('meta_settings').insert({
        setting_key: 'working_days_bitmask',
        setting_value: newMask,
        description: 'Dias úteis da semana',
      });
    }
    qc.invalidateQueries({ queryKey: ['working-days-mask'] });
    qc.invalidateQueries({ queryKey: ['business-calendar'] });
    qc.invalidateQueries({ queryKey: ['clinic-goals-panel'] });
    toast.success('Dias úteis atualizados');
  };

  const addHoliday = async () => {
    if (!newDate || !newDesc.trim()) {
      toast.error('Preencha data e descrição');
      return;
    }
    const { error } = await supabase.from('clinic_holidays').insert({
      holiday_date: newDate,
      description: newDesc.trim(),
      is_recurring: newRecurring,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewDate('');
    setNewDesc('');
    setNewRecurring(false);
    qc.invalidateQueries({ queryKey: ['clinic-holidays'] });
    qc.invalidateQueries({ queryKey: ['business-calendar'] });
    qc.invalidateQueries({ queryKey: ['clinic-goals-panel'] });
    toast.success('Feriado adicionado');
  };

  const removeHoliday = async (id: string) => {
    await supabase.from('clinic_holidays').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['clinic-holidays'] });
    qc.invalidateQueries({ queryKey: ['business-calendar'] });
    qc.invalidateQueries({ queryKey: ['clinic-goals-panel'] });
    toast.success('Feriado removido');
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Dias úteis da semana
          </CardTitle>
          <CardDescription>
            Selecione os dias da semana em que a clínica funciona. Os cálculos de metas são proporcionais a esses dias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(w => (
              <button
                key={w.idx}
                onClick={() => toggleDay(w.idx)}
                className={`h-12 w-16 rounded-lg border text-sm font-semibold transition ${
                  isOn(w.idx)
                    ? 'bg-primary text-primary-foreground border-primary shadow'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            <Badge variant="outline">{businessDaysCount} dias úteis/semana</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Feriados da clínica
          </CardTitle>
          <CardDescription>
            Datas marcadas aqui não contam como dias úteis. Marque "Recorrente" para feriados que se repetem todo ano.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input
                placeholder="Ex.: Natal, Confraternização"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 h-10">
              <Switch checked={newRecurring} onCheckedChange={setNewRecurring} id="recurring" />
              <Label htmlFor="recurring" className="text-xs whitespace-nowrap">Anual</Label>
            </div>
            <Button onClick={addHoliday} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            {holidays.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum feriado cadastrado
              </div>
            ) : (
              <div className="divide-y">
                {holidays.map(h => (
                  <div key={h.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                        {format(parseISO(h.holiday_date), 'dd/MM', { locale: ptBR })}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{h.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(h.holiday_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          {h.is_recurring && <Badge variant="secondary" className="ml-2 h-4 text-[10px]">Recorrente</Badge>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeHoliday(h.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
