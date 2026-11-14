import { lazy, Suspense, type ComponentType } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CRCView } from '@/components/crc/CRCView';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useMenuCounts } from '@/hooks/useMenuCounts';
import { cn } from '@/lib/utils';

// As telas completas de Follow Up, Remarketing, Retorno, Indicações e Crédito Liberado
// moram dentro do CRC, como abas, com todas as regras e funções que já tinham.
const Funil = lazy(() => import('./Funil'));
const Remarketing = lazy(() => import('./Remarketing'));
const Tarefas = lazy(() => import('./Tarefas'));
const Indicacoes = lazy(() => import('./Indicacoes'));
const CreditoLiberado = lazy(() => import('./CreditoLiberado'));

const FollowUpTab: ComponentType = () => <Funil mode="followup" embedded />;

interface CrcTab {
  key: string;
  label: string;
  /** Permissão necessária (mesma do item de menu que existia antes). */
  module: string;
  Component: ComponentType;
}

const CRC_TABS: CrcTab[] = [
  { key: 'quadros', label: 'Quadros', module: 'funil', Component: CRCView },
  { key: 'follow-up', label: 'Follow Up', module: 'funil', Component: FollowUpTab },
  { key: 'remarketing', label: 'Remarketing', module: 'remarketing', Component: () => <Remarketing embedded /> },
  { key: 'retorno', label: 'Retorno', module: 'tarefas', Component: () => <Tarefas embedded /> },
  { key: 'indicacoes', label: 'Indicações', module: 'indicacoes', Component: () => <Indicacoes embedded /> },
  { key: 'credito', label: 'Crédito Liberado', module: 'credito_liberado', Component: () => <CreditoLiberado embedded /> },
];

const TITLES: Record<string, string> = {
  quadros: 'CRC — Central de Relacionamento',
  'follow-up': 'CRC — Follow Up',
  remarketing: 'CRC — Remarketing',
  retorno: 'CRC — Retorno',
  indicacoes: 'CRC — Indicações',
  credito: 'CRC — Crédito Liberado',
};

const CRC = () => {
  const [params] = useSearchParams();
  const { isAdmin } = useAuth();
  const { canView } = usePermissions();
  const counts = useMenuCounts();

  const tabs = CRC_TABS.filter(t => isAdmin || canView(t.module));
  const requested = params.get('aba') || 'quadros';
  const active = tabs.find(t => t.key === requested) ?? tabs[0];
  const badge: Record<string, number> = {
    retorno: counts['/retorno'] ?? 0,
    indicacoes: counts['/indicacoes'] ?? 0,
    credito: counts['/credito-liberado'] ?? 0,
  };

  return (
    <AppLayout title={TITLES[active?.key ?? 'quadros']}>
      <div className="flex flex-col min-h-0 flex-1">
        <nav className="shrink-0 mb-4 -mx-1 px-1 overflow-x-auto" aria-label="Seções do CRC">
          <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
            {tabs.map(t => {
              const isActive = t.key === active?.key;
              const n = badge[t.key] ?? 0;
              return (
                <Link
                  key={t.key}
                  to={t.key === 'quadros' ? '/crc' : `/crc?aba=${t.key}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  {n > 0 && (
                    <span
                      className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold tabular-nums flex items-center justify-center"
                      aria-label={`${n} em aberto`}
                    >
                      {n > 99 ? '99+' : n}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
        <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}>
          {active ? <active.Component /> : <p className="text-sm text-muted-foreground">Você não tem acesso às telas do CRC.</p>}
        </Suspense>
      </div>
    </AppLayout>
  );
};

export default CRC;
