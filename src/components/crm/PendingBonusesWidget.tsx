import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Loader2, ChevronRight } from 'lucide-react';
import { usePendingBonuses } from '@/hooks/useReferrals';

interface PendingBonusesWidgetProps {
  onReferrerClick: (referrerId: string, name: string) => void;
}

export function PendingBonusesWidget({ onReferrerClick }: PendingBonusesWidgetProps) {
  const { data: bonuses, isLoading } = usePendingBonuses();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

  const total = (bonuses || []).reduce((s, b) => s + b.rewardValue, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-warning" />
            <CardTitle className="text-base font-semibold">Bonificações Pendentes</CardTitle>
          </div>
          {bonuses && bonuses.length > 0 && (
            <Badge className="bg-warning/10 text-warning border-0">
              {bonuses.length} • {formatCurrency(total)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Clique no indicador para abrir os dados e efetuar o pagamento da comissão
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !bonuses?.length ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Nenhuma bonificação pendente no momento
          </div>
        ) : (
          <div className="space-y-2">
            {bonuses.map((b) => (
              <button
                key={b.referralId}
                onClick={() => onReferrerClick(b.referrerId, b.referrerName)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/40 transition-colors text-left group"
              >
                <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {b.referrerName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Indicou: <strong>{b.referredName}</strong>
                    {b.referrerPhone && <span> • {b.referrerPhone}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-warning">{formatCurrency(b.rewardValue)}</p>
                  {b.rewardPercentage > 0 && (
                    <p className="text-[10px] text-muted-foreground">{b.rewardPercentage}% do tratamento</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
