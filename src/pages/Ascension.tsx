import { lazy } from 'react';
import { ClipboardList, Table2, LifeBuoy, ListChecks } from 'lucide-react';
import { HubPage, type HubSection } from '@/components/layout/HubPage';

const AscensionAcompanhamento = lazy(() => import('./AscensionAcompanhamento'));
const AscensionControle = lazy(() => import('./AscensionControle'));
const AscensionSuporte = lazy(() => import('./AscensionSuporte'));
const AscensionTarefas = lazy(() => import('./AscensionTarefas'));

const SECTIONS: HubSection[] = [
  {
    key: 'acompanhamento', title: 'Acompanhamento', icon: ClipboardList, module: 'ascension', Component: AscensionAcompanhamento,
    description: 'Rainer das Neves Macedo: acompanhamento diário, Dashboard do período e Projeto Ascension. Preenchido pelo sistema; baixe em XLSX.',
  },
  {
    key: 'controle', title: 'Planilha de Controle Geral', icon: Table2, module: 'ascension', Component: AscensionControle,
    description: 'Leads de cada mês com origem, agendamento, comparecimento e fechamento; métricas por origem e por dia. Baixe em XLSX.',
  },
  {
    key: 'suporte', title: 'SCRIPTS CRC', icon: LifeBuoy, module: 'ascension', Component: AscensionSuporte,
    description: 'Guia da CRC: scripts de primeiro contato, régua dos não agendados, comparecimento, faltosos e Comercial 2, com busca e quebra de objeção.',
  },
  {
    key: 'tarefas', title: 'Tarefas', icon: ListChecks, module: 'ascension', Component: AscensionTarefas,
    description: 'Rotina diária da CRC: marque o que foi feito, veja quantos pacientes esperam cada tarefa e o histórico do mês.',
  },
];

/** ASCENSION: as duas planilhas da clínica, alimentadas automaticamente pelo painel. */
export default function Ascension() {
  return (
    <HubPage
      path="/ascension"
      title="ASCENSION"
      intro="As planilhas de Acompanhamento e de Controle Geral, preenchidas sozinhas com o que é lançado no Comercial 1, CRC, Comercial 2 e CAC. O período segue o filtro de data do topo; o botão Baixar XLSX gera o arquivo com as mesmas abas e fórmulas."
      sections={SECTIONS}
    />
  );
}
