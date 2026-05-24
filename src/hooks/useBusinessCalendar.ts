import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { eachDayOfInterval, format, getDay, getMonth, getDate } from 'date-fns';

export interface BusinessCalendar {
  /** Bitmask: bit 0=Dom, 1=Seg, ..., 6=Sab. Padrão 62 = Seg-Sex */
  workingDaysMask: number;
  /** YYYY-MM-DD */
  holidays: Set<string>;
  /** MM-DD para feriados recorrentes */
  recurringHolidays: Set<string>;
  isBusinessDay: (d: Date) => boolean;
  countBusinessDays: (start: Date, end: Date) => number;
  /** dias úteis em um mês "padrão" (referência para proporcionalidade) */
  monthlyBusinessDays: number;
}

export function useBusinessCalendar() {
  return useQuery<BusinessCalendar>({
    queryKey: ['business-calendar'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: settings }, { data: hols }] = await Promise.all([
        supabase.from('meta_settings').select('setting_key, setting_value').eq('setting_key', 'working_days_bitmask'),
        supabase.from('clinic_holidays').select('holiday_date, is_recurring'),
      ]);
      const mask = Number(settings?.[0]?.setting_value ?? 62);
      const holidays = new Set<string>();
      const recurringHolidays = new Set<string>();
      (hols ?? []).forEach((h: any) => {
        if (h.is_recurring) recurringHolidays.add(h.holiday_date.slice(5));
        else holidays.add(h.holiday_date);
      });

      const isBusinessDay = (d: Date) => {
        const dow = getDay(d);
        if ((mask & (1 << dow)) === 0) return false;
        const ymd = format(d, 'yyyy-MM-dd');
        if (holidays.has(ymd)) return false;
        const mmdd = format(d, 'MM-dd');
        if (recurringHolidays.has(mmdd)) return false;
        return true;
      };

      const countBusinessDays = (start: Date, end: Date) =>
        eachDayOfInterval({ start, end }).filter(isBusinessDay).length;

      // calcula dias úteis médios de um mês de 30 dias para uso como referência
      const sampleStart = new Date();
      sampleStart.setDate(1);
      const sampleEnd = new Date(sampleStart);
      sampleEnd.setMonth(sampleEnd.getMonth() + 1);
      sampleEnd.setDate(0);
      const monthlyBusinessDays = countBusinessDays(sampleStart, sampleEnd);

      return { workingDaysMask: mask, holidays, recurringHolidays, isBusinessDay, countBusinessDays, monthlyBusinessDays };
    },
  });
}
