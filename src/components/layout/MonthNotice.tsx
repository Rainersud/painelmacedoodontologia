import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

/**
 * Selo do mês mostrado nas telas de contas mensais. Quando o filtro global não está em "Mês",
 * avisa que a tela usa o mês da data escolhida.
 */
export function MonthNotice({ month, exact }: { month: Date; exact: boolean }) {
  const label = format(month, 'MMMM yyyy', { locale: ptBR });
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
      title={exact ? undefined : 'Esta tela trabalha por mês: mostra o mês da data escolhida no filtro do topo.'}>
      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
      <span className="capitalize">{label}</span>
      {!exact && <span>(mês da data escolhida)</span>}
    </span>
  );
}
