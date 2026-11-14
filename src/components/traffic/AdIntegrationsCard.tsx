import { PlugZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Integrações de mídia paga: ponto único onde Meta Ads e Google Ads vão alimentar o funil.
 * Enquanto não estão conectadas, o funil usa os criativos cadastrados aqui e os custos do CAC.
 */
const INTEGRATIONS = [
  { name: 'Meta Ads (Facebook e Instagram)', fields: 'investimento, impressões, cliques e leads por campanha e criativo' },
  { name: 'Google Ads', fields: 'investimento, impressões, cliques e conversões por campanha' },
];

export function AdIntegrationsCard() {
  return (
    <section aria-labelledby="ads-integracoes" className="rounded-xl border border-dashed bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="ads-integracoes" className="text-sm font-semibold flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" aria-hidden /> Integrações de tráfego pago
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            O funil já está pronto para receber os dados das plataformas. Até a conexão, ele usa os criativos cadastrados nesta
            tela e o investimento lançado em CAC & Financeiro. Agendamentos, comparecimentos e vendas sempre vêm do Comercial 1.
          </p>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {INTEGRATIONS.map(i => (
          <li key={i.name} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{i.name}</p>
              <Badge variant="outline" className="text-[10px]">Aguardando conexão</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Vai preencher: {i.fields}.</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
