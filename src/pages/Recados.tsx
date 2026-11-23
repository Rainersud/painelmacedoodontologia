import { PageShell } from '@/components/layout/PageShell';
import { TeamMessagesWidget } from '@/components/team/TeamMessagesWidget';

/** Comunicação da equipe em tela cheia (atalho no topo do menu, para todos os acessos). */
export default function Recados() {
  return (
    <PageShell title="Comunicação da equipe">
      <TeamMessagesWidget />
    </PageShell>
  );
}
