import { lazy } from 'react';
import { ClipboardList, Table2 } from 'lucide-react';
import { HubPage, type HubSection } from '@/components/layout/HubPage';

const AscensionAcompanhamento = lazy(() => import('./AscensionAcompanhamento'));
const AscensionControle = lazy(() => import('./AscensionControle'));

const SECTIONS: HubSection[] = [
  {
    key: 'acompanhamento', title: 'Acompanhamento', icon: ClipboardList, module: 'ascension', Component: AscensionAcompanhamento,
    description: 'Rainer das Neves Macedo: acompanhamento diário, Dashboard do período e Projeto Ascension. Preenchido pelo sistema; baixe em XLSX.',
  },
  {
    key: 'controle', title: 'Planilha de Controle Geral', icon: Table2, module: 'ascension', Component: AscensionControle,
    description: 'Leads de cada mês com origem, agendamento, comparecimento e fechamento; métricas por origem e por dia. Baixe em XLSX.',
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
