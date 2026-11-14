import { Suspense, type ComponentType } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2, type LucideIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

export interface HubSection {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** permissão necessária (a mesma do item de menu que existia antes) */
  module: string;
  Component: ComponentType<{ embedded?: boolean }>;
}

/**
 * Tela única de uma área (como o CRC): cards no topo; clicar abre a tela completa,
 * com todas as funções, e "voltar" retorna aos cards.
 */
export function HubPage({ path, title, intro, sections }: { path: string; title: string; intro: string; sections: HubSection[] }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { canView } = usePermissions();
  const visible = sections.filter(s => isAdmin || canView(s.module));
  const active = visible.find(s => s.key === params.get('aba')) ?? null;

  if (active) {
    const C = active.Component;
    return (
      <AppLayout title={`${title} — ${active.title}`}>
        <div className="mb-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(path)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> {title}
          </Button>
        </div>
        <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}>
          <C embedded />
        </Suspense>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={title}>
      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">{intro}</p>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você não tem acesso às telas desta área.</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => navigate(`${path}?aba=${s.key}`)}
              className="monday-card group flex items-start gap-3 p-4 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 font-semibold">
                  {s.title}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="block text-sm text-muted-foreground mt-0.5">{s.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
