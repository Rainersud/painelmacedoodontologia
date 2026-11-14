import { lazy } from 'react';
import { Award, Target, TrendingUp } from 'lucide-react';
import { HubPage, type HubSection } from '@/components/layout/HubPage';

const MetasClinica = lazy(() => import('./MetasClinica'));
const BonusMetas = lazy(() => import('./BonusMetas'));
const PlanoIncentivoV2 = lazy(() => import('./PlanoIncentivoV2'));

const SECTIONS: HubSection[] = [
  { key: 'metas', title: 'Metas da clínica', icon: Target, module: 'metas_clinica', Component: MetasClinica,
    description: 'Objetivo central (faturamento + ticket), escada de metas, funil, eficiência, origens, ROI e perdas.' },
  { key: 'bonus', title: 'Bônus por metas', icon: Award, module: 'bonus_metas', Component: BonusMetas,
    description: 'Metas individuais da equipe e bônus ganho no dia, na semana e no mês.' },
  { key: 'incentivo', title: 'Plano de incentivo', icon: TrendingUp, module: 'plano_incentivo', Component: PlanoIncentivoV2,
    description: 'Progresso da equipe nas metas do período, com o que falta para cada uma.' },
];

export default function Objetivos() {
  return (
    <HubPage
      path="/objetivos"
      title="Metas / Objetivos"
      intro="Tudo nasce do objetivo central: o faturamento do mês e o ticket médio definem as metas, os bônus e o plano de incentivo."
      sections={SECTIONS}
    />
  );
}
