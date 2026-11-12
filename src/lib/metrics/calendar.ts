// Calendário de dias úteis da clínica — versão pura (sem React/Supabase).
// A configuração vem de meta_settings.working_days_bitmask e da tabela clinic_holidays.
import { eachDayOfInterval, format, getDay } from 'date-fns';

export interface HolidayRow {
  holiday_date: string; // YYYY-MM-DD
  is_recurring: boolean | null;
}

export interface BusinessCalendar {
  /** Bitmask: bit 0=Dom, 1=Seg, ..., 6=Sáb. Padrão 62 = Seg–Sex. */
  workingDaysMask: number;
  isBusinessDay: (d: Date) => boolean;
  countBusinessDays: (start: Date, end: Date) => number;
}

export const DEFAULT_WORKING_DAYS_MASK = 62;

export function createBusinessCalendar(
  workingDaysMask: number = DEFAULT_WORKING_DAYS_MASK,
  holidays: HolidayRow[] = [],
): BusinessCalendar {
  const fixed = new Set<string>();
  const recurring = new Set<string>();
  for (const h of holidays) {
    const ymd = String(h.holiday_date).slice(0, 10);
    if (h.is_recurring) recurring.add(ymd.slice(5));
    else fixed.add(ymd);
  }

  const isBusinessDay = (d: Date) => {
    if ((workingDaysMask & (1 << getDay(d))) === 0) return false;
    if (fixed.has(format(d, 'yyyy-MM-dd'))) return false;
    if (recurring.has(format(d, 'MM-dd'))) return false;
    return true;
  };

  const countBusinessDays = (start: Date, end: Date) =>
    end < start ? 0 : eachDayOfInterval({ start, end }).filter(isBusinessDay).length;

  return { workingDaysMask, isBusinessDay, countBusinessDays };
}
