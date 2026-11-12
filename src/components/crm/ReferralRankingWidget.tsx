import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReferralRanking, useReferralDashboard, type ReferrerRanking } from '@/hooks/useReferrals';
import { Users, Loader2, Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { value: '30', label: 'Mês atual' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Últimos 12 meses' },
  { value: 'all', label: 'Todo o período' },
];

interface ReferralRankingWidgetProps {
  onLeadClick?: (leadId: string, name?: string) => void;
}

export function ReferralRankingWidget({ onLeadClick }: ReferralRankingWidgetProps) {
  const [period, setPeriod] = useState('30');
  const periodDays = period === 'all' ? undefined : parseInt(period);
  const { data: ranking, isLoading } = useReferralRanking(periodDays);
  const { data: dashData } = useReferralDashboard();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

  const getMedal = (pos: number) => {
    if (pos <= 2) return `${pos + 1}º`;
    return `${pos + 1}º`;
  };

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning-strong" />
            <CardTitle className="text-base font-semibold">Ranking de Indicações</CardTitle>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Summary metric */}
        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-primary/5">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm">
            Total de indicações no período: <strong className="text-primary">{ranking?.reduce((s, r) => s + r.totalReferrals, 0) || 0}</strong>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !ranking?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma indicação no período</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <div
                key={r.leadId}
                onClick={() => onLeadClick?.(r.leadId, r.name)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                  i < 3 && "bg-muted/30"
                )}
              >
                {/* Position */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  i === 0 && "bg-warning/20 text-warning-strong",
                  i === 1 && "bg-muted-foreground/20 text-muted-foreground",
                  i === 2 && "bg-chart-2/20 text-chart-2",
                  i > 2 && "bg-muted text-muted-foreground",
                )}>
                  {getMedal(i)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.phone}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">{r.totalReferrals}</p>
                    <p className="text-[9px] text-muted-foreground">Indicações</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-success">{r.attended}</p>
                    <p className="text-[9px] text-muted-foreground">Compareceu</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-chart-2">{r.converted}</p>
                    <p className="text-[9px] text-muted-foreground">Vendas</p>
                  </div>
                  <div className="text-center min-w-[70px]">
                    <p className="text-sm font-bold">{formatCurrency(r.revenue)}</p>
                    <p className="text-[9px] text-muted-foreground">Faturamento</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
