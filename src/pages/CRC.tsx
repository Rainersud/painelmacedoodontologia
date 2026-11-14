import { lazy, Suspense, type ComponentType } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Clock, Gift, Loader2, Megaphone, RotateCcw, Sparkles, Wallet, Workflow, type LucideIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CRCView } from '@/components/crc/CRCView';
import { HubCard } from '@/components/crc/HubCard';
import { ALERT_LEVELS, CRCAlertsView } from '@/components/crc/CRCAlertsView';
import { useSmartAlerts, type SmartAlertLevel } from '@/hooks/useSmartAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useMenuCounts } from '@/hooks/useMenuCounts';
import { useDueReturns } from '@/components/crm/ReturnColumn';
import { useRemarketingEntries } from '@/hooks/useRemarketing';
import { supabase } from '@/integrations/supabase/client';

// Tela única do CRC: os quadros de relacionamento e as telas completas de Follow Up,
// Remarketing, Retorno, Indicações e Crédito Liberado, todas como cards. Clicar num card
// abre a tela com todas as regras e funções que ela já tinha.
const Funil = lazy(() => import('./Funil'));
const Remarketing = lazy(() => import('./Remarketing'));
const Tarefas = lazy(() => import('./Tarefas'));
const Indicacoes = lazy(() => import('./Indicacoes'));
const CreditoLiberado = lazy(() => import('./CreditoLiberado'));

const FOLLOWUP_STATUSES = [
  'followup_1', 'followup_2', 'followup_3', 'followup_4', 'followup_5', 'followup_6', 'followup_7',
  'followup_8', 'followup_9', 'followup_10', 'followup_11', 'followup_12', 'followup_13', 'followup_14',
] as const;

/** Leads que estão hoje em alguma etapa de follow-up. */
function useFollowUpCount() {
  return useQuery({
    queryKey: ['crc-followup-count'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads').select('id', { count: 'exact', head: true }).in('status', FOLLOWUP_STATUSES);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

interface CrcSection {
  key: string;
  label: string;
  rule: string;
  caption: string;
  icon: LucideIcon;
  /** Permissão necessária (mesma do item de menu que existia antes). */
  module: string;
  Component: ComponentType;
}

const SECTIONS: CrcSection[] = [
  {
    key: 'follow-up', label: 'Follow Up', icon: Workflow, module: 'funil', caption: 'em follow-up',
    rule: 'Cadência de 14 contatos (D1 a D14) para quem ainda não agendou.',
    Component: () => <Funil mode="followup" embedded />,
  },
  {
    key: 'remarketing', label: 'Remarketing', icon: Megaphone, module: 'remarketing', caption: 'leads ativos',
    rule: 'Recuperação contínua de 365 dias para leads não convertidos.',
    Component: () => <Remarketing embedded />,
  },
  {
    key: 'retorno', label: 'Retorno', icon: RotateCcw, module: 'tarefas', caption: '',
    rule: 'Retornos pendentes do dia e os em atraso de dias anteriores.',
    Component: () => <Tarefas embedded />,
  },
  {
    key: 'indicacoes', label: 'Indicações', icon: Gift, module: 'indicacoes', caption: 'abertas',
    rule: 'Pessoas indicadas que ainda não fecharam nem foram perdidas.',
    Component: () => <Indicacoes embedded />,
  },
  {
    key: 'credito', label: 'Crédito Liberado', icon: Wallet, module: 'credito_liberado', caption: 'pacientes',
    rule: 'Pacientes com crédito aprovado na PAGMAIS ou na MAIORAL.',
    Component: () => <CreditoLiberado embedded />,
  },
];

const ALERT_ICONS: Record<SmartAlertLevel, LucideIcon> = { critical: AlertTriangle, attention: Clock, opportunity: Sparkles };

const Spinner = () => (
  <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
);

const CRC = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { canView } = usePermissions();
  const counts = useMenuCounts();
  const followUp = useFollowUpCount();
  const remarketing = useRemarketingEntries();
  const returns = useDueReturns();
  const smart = useSmartAlerts();

  const sections = SECTIONS.filter(s => isAdmin || canView(s.module));
  const showBoards = isAdmin || canView('funil');
  const active = sections.find(s => s.key === params.get('aba')) ?? null;

  const count: Record<string, number | null> = {
    'follow-up': followUp.data ?? null,
    remarketing: remarketing.data ? remarketing.data.length : null,
    retorno: returns.isLoading ? null : returns.due.length,
    indicacoes: counts['/indicacoes'] ?? null,
    credito: counts['/credito-liberado'] ?? null,
  };

  const alertLevel = ALERT_LEVELS.find(l => l.key === params.get('alerta'))?.key ?? null;
  if (alertLevel && showBoards) {
    return (
      <AppLayout title="CRC — Alertas inteligentes">
        <CRCAlertsView
          level={alertLevel}
          onLevel={l => setParams({ alerta: l }, { replace: true })}
          onBack={() => navigate('/crc')}
        />
      </AppLayout>
    );
  }

  if (active) {
    return (
      <AppLayout title={`CRC — ${active.label}`}>
        <div className="flex flex-col min-h-0 flex-1">
          <div className="shrink-0 mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/crc')} className="-ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> CRC
            </Button>
          </div>
          <Suspense fallback={<Spinner />}>
            <active.Component />
          </Suspense>
        </div>
      </AppLayout>
    );
  }

  const alertCards = showBoards && (
    <section aria-labelledby="crc-alertas" className="space-y-2">
      <h2 id="crc-alertas" className="text-sm font-semibold text-muted-foreground">Alertas inteligentes</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {ALERT_LEVELS.map(l => (
          <HubCard
            key={l.key}
            icon={ALERT_ICONS[l.key]}
            label={l.label}
            rule={l.rule}
            count={smart.counts[l.key]}
            caption={l.caption}
            onClick={() => navigate(`/crc?alerta=${l.key}`)}
          />
        ))}
      </div>
    </section>
  );

  const sectionCards = sections.length > 0 && (
    <section aria-labelledby="crc-acompanhamento" className="space-y-2">
      <h2 id="crc-acompanhamento" className="text-sm font-semibold text-muted-foreground">Acompanhamento</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sections.map(s => (
          <HubCard
            key={s.key}
            icon={s.icon}
            label={s.label}
            rule={s.rule}
            count={count[s.key]}
            caption={s.key === 'retorno' ? `${returns.today} do dia · ${returns.late} em atraso` : s.caption}
            onClick={() => navigate(`/crc?aba=${s.key}`)}
          />
        ))}
      </div>
    </section>
  );

  return (
    <AppLayout title="CRC — Central de Relacionamento">
      {showBoards ? (
        <CRCView footer={<>{alertCards}{sectionCards}</>} />
      ) : sections.length > 0 ? (
        <div className="space-y-4">{sectionCards}</div>
      ) : (
        <p className="text-sm text-muted-foreground">Você não tem acesso às telas do CRC.</p>
      )}
    </AppLayout>
  );
};

export default CRC;
