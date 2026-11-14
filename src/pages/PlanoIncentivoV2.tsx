import { useMemo, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { useClinicGoalsPanel, type Period, type PanelMetric } from '@/hooks/useClinicGoalsPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMetaSettings } from '@/hooks/useMetaSettings';
import { createBusinessCalendar, periodProportion, type HolidayRow } from '@/lib/metrics';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  eachDayOfInterval, format, getDay,
} from 'date-fns';
import {
  Users, CalendarCheck, UserCheck, Trophy, Heart, Zap, TrendingUp, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusColor = 'azul' | 'verde' | 'vermelho';

const statusToColor = (s: PanelMetric['status']): StatusColor =>
  s === 'healthy' ? 'azul' : s === 'warning' ? 'verde' : 'vermelho';

const colorClasses: Record<StatusColor, { bar: string; text: string; bg: string; ring: string; label: string }> = {
  // mesmas cores de status do painel inteiro (src/components/metrics/status.ts)
  azul:     { bar: 'bg-success',     text: 'text-success',        bg: 'bg-success/10',     ring: 'ring-success/30',     label: 'Saudável' },
  verde:    { bar: 'bg-warning',     text: 'text-warning-strong', bg: 'bg-warning/15',     ring: 'ring-warning/30',     label: 'Atenção' },
  vermelho: { bar: 'bg-destructive', text: 'text-destructive',    bg: 'bg-destructive/10', ring: 'ring-destructive/30', label: 'Crítico' },
};

interface DisplayGoal {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  target: number;
  remaining: number;
  percentage: number;
  status: StatusColor;
  primaryDisplay: string;
  metaSaudavel: string;
  rateInfo?: string;
  trend: number[];
}

function buildPeriodRange(period: Period) {
  const now = new Date();
  if (period === 'hoje') return { start: startOfDay(now), end: endOfDay(now) };
  if (period === 'semana') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

function useReferralsCount(period: Period) {
  const { start, end } = buildPeriodRange(period);
  return useQuery({
    queryKey: ['plano-incentivo-referrals', period],
    queryFn: async () => {
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

function useReferralsTrend(period: Period) {
  const { start, end } = buildPeriodRange(period);
  return useQuery({
    queryKey: ['plano-incentivo-referrals-trend', period],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      const days = eachDayOfInterval({ start, end });
      return days.map(d => {
        const dStart = startOfDay(d).getTime();
        const dEnd = endOfDay(d).getTime();
        return (data ?? []).filter((r: any) => {
          const t = new Date(r.created_at).getTime();
          return t >= dStart && t <= dEnd;
        }).length;
      });
    },
    refetchInterval: 60_000,
  });
}

function useBusinessDaysProportion(period: Period) {
  return useQuery({
    queryKey: ['plano-incentivo-bizdays', period],
    queryFn: async () => {
      // Mesma proporção das outras metas: dias úteis do período ÷ base mensal (camada única)
      const [{ data: settingsRows }, { data: hols }] = await Promise.all([
        supabase.from('meta_settings').select('setting_key, setting_value'),
        supabase.from('clinic_holidays').select('holiday_date, is_recurring'),
      ]);
      const settings: Record<string, number> = {};
      (settingsRows ?? []).forEach(r => { settings[r.setting_key] = Number(r.setting_value); });
      const cal = createBusinessCalendar(Number(settings.working_days_bitmask ?? 62), (hols ?? []) as HolidayRow[]);
      const range = buildPeriodRange(period);
      return { periodBiz: cal.countBusinessDays(range.start, range.end), proportion: periodProportion(range, cal, settings) };
    },
  });
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

export default function PlanoIncentivoV2({ embedded = false }: { embedded?: boolean } = {}) {
  const [period, setPeriod] = useState<Period>('mes');
  const { data: panel, isLoading } = useClinicGoalsPanel(period);
  const { data: referralsCount = 0 } = useReferralsCount(period);
  const { data: referralsTrend = [] } = useReferralsTrend(period);
  const { data: bizDays } = useBusinessDaysProportion(period);
  const { data: metaSettings } = useMetaSettings();

  const goals = useMemo<DisplayGoal[]>(() => {
    if (!panel) return [];
    const find = (k: string) => panel.metrics.find(m => m.key === k);
    const leads = find('leads');
    const agend = find('agendamentos');
    const comp = find('comparecimentos');
    const vendas = find('vendas');

    const buildBase = (m: PanelMetric, icon: any, primaryDisplay?: string, rateInfo?: string): DisplayGoal => ({
      key: m.key,
      label: m.label,
      icon,
      current: m.current,
      target: m.target,
      remaining: Math.max(0, m.target - m.current),
      percentage: m.percentage,
      status: statusToColor(m.status),
      primaryDisplay: primaryDisplay ?? m.display,
      metaSaudavel: m.healthyGoal,
      rateInfo,
      trend: m.trend ?? [],
    });

    const out: DisplayGoal[] = [];
    if (leads) out.push(buildBase(leads, Users));
    if (agend) out.push(buildBase(agend, CalendarCheck,
      `${agend.current} agendamentos`,
      agend.rate ? `Taxa atual ${agend.rate.display} · meta ${agend.rate.targetDisplay}` : undefined));
    if (comp) out.push(buildBase(comp, UserCheck,
      `${comp.current} comparecimentos`,
      comp.rate ? `Taxa atual ${comp.rate.display} · meta ${comp.rate.targetDisplay}` : undefined));
    if (vendas) out.push(buildBase(vendas, Trophy,
      `${vendas.current} vendas`,
      vendas.rate ? `Taxa atual ${vendas.rate.display} · meta ${vendas.rate.targetDisplay}` : undefined));

    // Indicação Pac
    const monthlyIndic = Number(metaSettings?.meta_indicacoes ?? 200);
    const proportion = bizDays?.proportion ?? 1;
    const tgtIndic = proportion === 0 ? 0 : Math.max(1, Math.round(monthlyIndic * proportion));
    const remaining = Math.max(0, tgtIndic - referralsCount);
    const ratio = tgtIndic ? referralsCount / tgtIndic : 1;
    const status: StatusColor = ratio >= 0.85 ? 'azul' : ratio >= 0.55 ? 'verde' : 'vermelho';
    const periodSuffix = period === 'hoje' ? '/dia' : period === 'semana' ? '/semana' : '/mês';
    out.push({
      key: 'indicacoes',
      label: 'Indicação Pac',
      icon: Heart,
      current: referralsCount,
      target: tgtIndic,
      remaining,
      percentage: Math.min(100, Math.round(ratio * 100)),
      status,
      primaryDisplay: `${referralsCount} indicações`,
      metaSaudavel: remaining > 0
        ? `${tgtIndic} indicações${periodSuffix} · faltam ${remaining}`
        : `${tgtIndic} indicações${periodSuffix} · meta atingida`,
      trend: referralsTrend,
    });

    return out;
  }, [panel, referralsCount, referralsTrend, bizDays, metaSettings, period]);

  const totalGoals = goals.length;
  const goalsHealthy = goals.filter(g => g.status === 'azul').length;
  const goalsHit = goals.filter(g => g.current >= g.target).length;
  const overallProgress = totalGoals
    ? Math.round(goals.reduce((s, g) => s + g.percentage, 0) / totalGoals)
    : 0;

  return (
    <PageShell embedded={embedded} title="Plano de Incentivo Inteligente">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Plano de Incentivo Inteligente</h2>
            <p className="text-muted-foreground text-sm">
              Metas oficiais da clínica · sincronizado com o Comercial 1 · proporcional aos dias úteis
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            {PERIOD_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                size="sm"
                variant={period === opt.value ? 'default' : 'ghost'}
                onClick={() => setPeriod(opt.value)}
                className="h-8"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Resumo */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="monday-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progresso geral</p>
                  <p className="text-2xl font-bold">{overallProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="monday-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Metas saudáveis</p>
                  <p className="text-2xl font-bold">{goalsHealthy}/{totalGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="monday-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Metas atingidas</p>
                  <p className="text-2xl font-bold">{goalsHit}/{totalGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="monday-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dias úteis ({PERIOD_OPTIONS.find(p=>p.value===period)?.label})</p>
                  <p className="text-2xl font-bold">{bizDays?.periodBiz ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de metas */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? [1, 2, 3, 4, 5].map(i => <div key={i} className="h-56 rounded-xl bg-muted/50 animate-pulse" />)
            : goals.map(g => {
                const cls = colorClasses[g.status];
                const Icon = g.icon;
                return (
                  <Card key={g.key} className={cn('overflow-hidden ring-1', cls.ring)}>
                    <div className={cn('h-1.5 w-full', cls.bar)} />
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', cls.bg)}>
                            <Icon className={cn('h-5 w-5', cls.text)} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Meta saudável</p>
                            <p className="font-semibold">{g.label}</p>
                          </div>
                        </div>
                        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', cls.bg, cls.text)}>
                          {cls.label}
                        </span>
                      </div>

                      <div>
                        <p className="text-3xl font-bold">{g.primaryDisplay}</p>
                        <p className="text-sm text-muted-foreground mt-1">{g.metaSaudavel}</p>
                        {g.rateInfo && (
                          <p className="text-xs text-muted-foreground mt-1">{g.rateInfo}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Progress value={g.percentage} className="h-2" />
                        <div className="flex justify-between text-xs">
                          <span className={cn('font-semibold', cls.text)}>{g.percentage}% atingido</span>
                          {g.remaining > 0 ? (
                            <span className="text-muted-foreground">faltam {g.remaining}</span>
                          ) : (
                            <span className="text-success font-semibold">meta atingida </span>
                          )}
                        </div>
                      </div>

                      {g.trend.length > 1 && (
                        <div className="pt-2 border-t">
                          <p className="text-[10px] text-muted-foreground mb-1">Evolução</p>
                          <Sparkline data={g.trend} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* Insights */}
        {panel && panel.insights.length > 0 && (
          <Card className="monday-card">
            <CardContent className="p-5 space-y-2">
              <p className="text-sm font-semibold">Insights inteligentes</p>
              <ul className="space-y-1.5">
                {panel.insights.map((it, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">{it}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
