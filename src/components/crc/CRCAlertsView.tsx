import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpDown, MessageCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useSmartAlerts, type SmartAlert, type SmartAlertLevel } from '@/hooks/useSmartAlerts';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { FUNNEL_STAGES } from '@/types/crm';

export const ALERT_LEVELS: { key: SmartAlertLevel; label: string; rule: string; caption: string }[] = [
  { key: 'critical', label: 'Crítico', caption: 'parados 10+ dias', rule: 'Leads parados há 10 dias ou mais na mesma etapa: risco alto de perda.' },
  { key: 'attention', label: 'Atenção', caption: 'parados 5 a 9 dias', rule: 'Leads parados há 5 a 9 dias na mesma etapa.' },
  { key: 'opportunity', label: 'Oportunidades', caption: 'prontos para fechar', rule: 'Leads em "Quase Cliente" ou com crédito aprovado na triagem.' },
];

const LEVEL_TONE: Record<SmartAlertLevel, string> = {
  critical: 'border-l-destructive',
  attention: 'border-l-warning',
  opportunity: 'border-l-success',
};

const STAGE_ORDER = new Map(FUNNEL_STAGES.map((s, i) => [s.key as string, i]));
const PAGE = 30;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Sort = 'dias' | 'valor' | 'nome';

function since(d: Date | null) {
  if (!d) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'hoje';
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

/** Alertas Inteligentes dentro do CRC: uma coluna por etapa do funil, no visual dos quadros. */
export function CRCAlertsView({ level, onLevel, onBack }: { level: SmartAlertLevel; onLevel: (l: SmartAlertLevel) => void; onBack: () => void }) {
  const { alerts, counts } = useSmartAlerts();
  const { data: leads = [] } = useCRMLeads();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('todas');
  const [sort, setSort] = useState<Sort>('dias');
  const [visible, setVisible] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const def = ALERT_LEVELS.find(l => l.key === level)!;
  const ofLevel = useMemo(() => alerts.filter(a => a.level === level), [alerts, level]);

  const stages = useMemo(() => {
    const keys = [...new Set(ofLevel.map(a => a.leadStatus))];
    return keys
      .sort((a, b) => (STAGE_ORDER.get(a) ?? 99) - (STAGE_ORDER.get(b) ?? 99))
      .map(k => ({ key: k, label: ofLevel.find(a => a.leadStatus === k)!.leadStatusLabel }));
  }, [ofLevel]);

  const shown = useMemo(() => {
    const q = norm(query.trim());
    const digits = query.replace(/\D/g, '');
    const list = ofLevel.filter(a =>
      (stage === 'todas' || a.leadStatus === stage)
      && (!q || norm(a.leadName).includes(q) || (digits.length >= 3 && (a.leadPhone ?? '').replace(/\D/g, '').includes(digits))),
    );
    const by: Record<Sort, (a: SmartAlert, b: SmartAlert) => number> = {
      dias: (a, b) => b.daysInStage - a.daysInStage,
      valor: (a, b) => b.potentialValue - a.potentialValue,
      nome: (a, b) => a.leadName.localeCompare(b.leadName, 'pt-BR'),
    };
    return [...list].sort(by[sort]);
  }, [ofLevel, query, stage, sort]);

  const columns = stages.filter(s => stage === 'todas' || s.key === stage);
  const totalValue = shown.reduce((s, a) => s + a.potentialValue, 0);
  const openLead = leads.find(l => l.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> CRC
        </Button>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">Alertas inteligentes · {def.label}</h2>
          <p className="text-xs text-muted-foreground">
            {def.rule}
            {totalValue > 0 && <> · {formatCurrency(totalValue)} em jogo</>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Tipo de alerta">
          {ALERT_LEVELS.map(l => (
            <button
              key={l.key}
              type="button"
              role="tab"
              aria-selected={l.key === level}
              onClick={() => { onLevel(l.key); setStage('todas'); setVisible({}); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                l.key === level ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {l.label}
              <span className="text-xs tabular-nums text-muted-foreground">{counts[l.key]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar paciente" className="h-9 w-48 pl-8" />
          </div>
          <Select value={stage} onValueChange={v => { setStage(v); setVisible({}); }}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as etapas</SelectItem>
              {stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as Sort)}>
            <SelectTrigger className="h-9 w-44" aria-label="Ordenar">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dias">Mais tempo parado</SelectItem>
              <SelectItem value="valor">Maior valor</SelectItem>
              <SelectItem value="nome">Nome (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="monday-card p-10 text-center text-sm text-muted-foreground">
          {ofLevel.length === 0 ? 'Nenhum lead nesta categoria. Tudo em dia.' : 'Nenhum lead encontrado com esses filtros.'}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {columns.map(col => {
            const items = shown.filter(a => a.leadStatus === col.key);
            const limit = visible[col.key] ?? PAGE;
            const value = items.reduce((s, a) => s + a.potentialValue, 0);
            return (
              <div key={col.key} className="w-64 shrink-0 rounded-xl border bg-card flex flex-col max-h-[calc(100vh-280px)]">
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[11px]">{items.length}</Badge>
                  </div>
                  {value > 0 && <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">{formatCurrency(value)}</p>}
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead</p>}
                  {items.slice(0, limit).map(a => (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenId(a.leadId)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(a.leadId); } }}
                      className={cn(
                        'w-full text-left rounded-lg border border-l-2 bg-background px-2.5 py-2 shadow-sm cursor-pointer transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        LEVEL_TONE[a.level],
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate">{a.leadName}</p>
                        {a.potentialValue > 0 && (
                          <span className="text-xs font-semibold tabular-nums shrink-0">{formatCurrency(a.potentialValue)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.level === 'opportunity' ? a.title : `${a.daysInStage} dias parado nesta etapa`}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {a.leadPhone}
                          {since(a.lastInteractionAt) && <> · último contato {since(a.lastInteractionAt)}</>}
                        </span>
                        {a.leadPhone && (
                          <a
                            href={`https://wa.me/55${a.leadPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            aria-label={`Chamar ${a.leadName} no WhatsApp`}
                            className="shrink-0 rounded p-1 text-success hover:bg-success/10"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length > limit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setVisible(v => ({ ...v, [col.key]: limit + PAGE }))}
                    >
                      Mostrar mais {Math.min(PAGE, items.length - limit)} de {items.length - limit}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeadDetailDialog lead={openLead} open={!!openLead} onOpenChange={o => { if (!o) setOpenId(null); }} />
    </div>
  );
}
