import { lazy } from 'react';
import { FileSpreadsheet, ListTodo, MessageSquareQuote, Sheet } from 'lucide-react';
import { HubPage, type HubSection } from '@/components/layout/HubPage';

const AscensionAcompanhamento = lazy(() => import('./AscensionAcompanhamento'));
const AscensionControle = lazy(() => import('./AscensionControle'));
const AscensionSuporte = lazy(() => import('./AscensionSuporte'));
const AscensionTarefas = lazy(() => import('./AscensionTarefas'));

const SECTIONS: HubSection[] = [
  {
    key: 'suporte', title: 'Scripts CRC', icon: MessageSquareQuote, module: 'ascension', Component: AscensionSuporte,
    description: 'Material CRC: scripts de primeiro contato, régua dos não agendados, comparecimento, faltosos e Comercial 2, com busca e quebra de objeção.',
  },
  {
    key: 'tarefas', title: 'Tarefas CRC', icon: ListTodo, module: 'ascension', Component: AscensionTarefas,
    description: 'Material CRC: rotina diária, PROJETO - CRC e PROJETO - COMERCIAL 2 num lugar só, marcados por dia.',
  },
  {
    key: 'acompanhamento', title: 'Acompanhamento', icon: FileSpreadsheet, module: 'ascension', Component: AscensionAcompanhamento,
    description: 'Planilha: Rainer das Neves Macedo, acompanhamento diário, Dashboard do período e Projeto Ascension. Preenchida pelo sistema; baixe em XLSX.',
  },
  {
    key: 'controle', title: 'Planilha de Controle Geral', icon: Sheet, module: 'ascension', Component: AscensionControle,
    description: 'Planilha: leads de cada mês com origem, agendamento, comparecimento e fechamento; métricas por origem e por dia. Baixe em XLSX.',
  },
];

/** ASCENSION: as duas planilhas da clínica, alimentadas automaticamente pelo painel. */
export default function Ascension() {
  return (
    <HubPage
      path="/ascension"
      title="ASCENSION"
      intro="Material CRC (scripts e tarefas) e as planilhas de Acompanhamento e Controle Geral, preenchidas sozinhas com o que é lançado no Comercial 1, CRC, Comercial 2 e CAC."
      sections={SECTIONS}
    />
  );
}
