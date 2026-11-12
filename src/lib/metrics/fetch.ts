// Busca as linhas que a camada de indicadores precisa, para um intervalo de datas.
// Paginada: o Supabase devolve no máximo 1000 linhas por consulta.
import { supabase } from '@/integrations/supabase/client';
import { createBusinessCalendar, DEFAULT_WORKING_DAYS_MASK, type HolidayRow } from './calendar';
import type { DateRange } from './period';
import type { AcquisitionCostRow, AppointmentRow, LeadRow, MetricsInput, PaymentRow } from './rules';
import type { MetaSettingsMap } from './goals';

const PAGE = 1000;

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const between = (col: string, s: string, e: string) => `and(${col}.gte.${s},${col}.lte.${e})`;

const LEAD_COLS = 'id, status, created_at, closed_at, assigned_agent_id, lead_arrival_source';

export interface MetricsData extends MetricsInput {
  settings: MetaSettingsMap;
}

/** Tudo que é preciso para calcular os indicadores de qualquer período dentro de `span`. */
export async function fetchMetricsData(span: DateRange): Promise<MetricsData> {
  const s = span.start.toISOString();
  const e = span.end.toISOString();
  const sDay = s.slice(0, 10);
  const eDay = e.slice(0, 10);
  const firstMonth = `${sDay.slice(0, 7)}-01`;

  const [leads, appointments, payments, costs, settingsRows, holidays] = await Promise.all([
    fetchAll<LeadRow>((f, t) => supabase.from('leads').select(LEAD_COLS)
      .or(`${between('created_at', s, e)},${between('closed_at', s, e)}`).order('id').range(f, t)),
    fetchAll<AppointmentRow>((f, t) => supabase.from('appointments')
      .select('id, lead_id, agent_id, created_at, scheduled_at, attended_at, cancelled_at')
      .or(`${between('created_at', s, e)},${between('scheduled_at', s, e)},${between('attended_at', s, e)}`)
      .order('id').range(f, t)),
    fetchAll<PaymentRow>((f, t) => supabase.from('payments')
      .select('id, lead_id, status, net_value, gross_value, paid_at, due_date, agent_id')
      .or(`${between('paid_at', s, e)},${between('due_date', sDay, eDay)}`)
      .order('id').range(f, t)),
    fetchAll<AcquisitionCostRow>((f, t) => supabase.from('acquisition_costs')
      .select('amount, category, reference_month')
      .gte('reference_month', firstMonth).lte('reference_month', eDay)
      .order('reference_month').range(f, t)),
    supabase.from('meta_settings').select('setting_key, setting_value'),
    supabase.from('clinic_holidays').select('holiday_date, is_recurring'),
  ]);

  // Pagamentos de leads antigos (criados antes do intervalo) também precisam do dono do lead.
  const known = new Set(leads.map(l => l.id));
  const missing = Array.from(new Set(payments.map(p => p.lead_id).filter(id => id && !known.has(id))));
  for (let i = 0; i < missing.length; i += 200) {
    const { data, error } = await supabase.from('leads').select(LEAD_COLS).in('id', missing.slice(i, i + 200));
    if (error) throw error;
    leads.push(...((data ?? []) as LeadRow[]));
  }

  const settings: MetaSettingsMap = {};
  for (const r of settingsRows.data ?? []) settings[r.setting_key] = Number(r.setting_value);

  const calendar = createBusinessCalendar(
    Number(settings.working_days_bitmask ?? DEFAULT_WORKING_DAYS_MASK),
    (holidays.data ?? []) as HolidayRow[],
  );

  return { leads, appointments, payments, costs, calendar, settings };
}
