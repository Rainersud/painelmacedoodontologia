import { lazy } from 'react';
import { BarChart3, FileText, LineChart, Megaphone, Wallet } from 'lucide-react';
import { HubPage, type HubSection } from '@/components/layout/HubPage';

const FunilTrafego = lazy(() => import('./FunilTrafego'));
const CACDashboard = lazy(() => import('./CACDashboard'));
const MetricasVendas = lazy(() => import('./MetricasVendas'));
const Relatorios = lazy(() => import('./Relatorios'));
const DashboardBI = lazy(() => import('./DashboardBI'));

const SECTIONS: HubSection[] = [
  { key: 'trafego', title: 'Funil de tráfego pago', icon: Megaphone, module: 'funil_trafego', Component: FunilTrafego,
    description: 'Investimento até a venda por criativo. Pronto para conectar Meta Ads e Google Ads.' },
  { key: 'bi', title: 'Dashboard BI', icon: BarChart3, module: 'bi', Component: DashboardBI,
    description: 'Visão 360° de receita, LTV, CAC e projeções.' },
  { key: 'vendas', title: 'Métricas de vendas', icon: LineChart, module: 'metricas_vendas', Component: MetricasVendas,
    description: 'Vendas em 1 e 2 etapas, faturamento, ticket e desempenho por atendente.' },
  { key: 'cac', title: 'CAC & Financeiro', icon: Wallet, module: 'cac', Component: CACDashboard,
    description: 'Investimento, custo por lead e por venda, faturamento e lucro.' },
  { key: 'relatorios', title: 'Relatórios', icon: FileText, module: 'relatorios', Component: Relatorios,
    description: 'Relatórios do período para exportar e compartilhar.' },
];

export default function DadosMetricas() {
  return (
    <HubPage
      path="/dados"
      title="Dados / Métricas"
      intro="Números do Comercial 1, CRC e Comercial 2 em tempo real: funis, custos, vendas e relatórios."
      sections={SECTIONS}
    />
  );
}
