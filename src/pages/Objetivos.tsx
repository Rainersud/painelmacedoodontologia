import { lazy } from 'react';
import { Target, Trophy } from 'lucide-react';
import { HubPage, type HubSection } from '@/components/layout/HubPage';

const MetasClinica = lazy(() => import('./MetasClinica'));
const PlanoIncentivoV2 = lazy(() => import('./PlanoIncentivoV2'));

const SECTIONS: HubSection[] = [
  { key: 'metas', title: 'Metas da clínica', icon: Target, module: 'metas_clinica', Component: MetasClinica,
    description: 'Objetivo central (faturamento + ticket), escada de metas, funil, eficiência, origens, ROI e perdas.' },
  { key: 'incentivo', title: 'Plano de Incentivo Inteligente', icon: Trophy, module: 'plano_incentivo', Component: PlanoIncentivoV2,
    description: 'Rainer, Ariane e Lidiane: R$ 100 por semana batida, bônus dobrado no mês e viagem de R$ 5.000 com 6 meses seguidos.' },
];

export default function Objetivos() {
  return (
    <HubPage
      path="/objetivos"
      title="Metas / Objetivos"
      intro="Tudo nasce do objetivo central: o faturamento do mês e o ticket médio definem as metas e o plano de incentivo."
      sections={SECTIONS}
    />
  );
}
