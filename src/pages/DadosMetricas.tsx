import { lazy } from 'react';
import { BarChart3, FileText, Filter, Headset, LineChart, Megaphone, Wallet } from 'lucide-react';
import { HubPage, type HubSection } from '@/components/layout/HubPage';

const FunilVendas = lazy(() => import('./FunilVendas'));
const FunilTrafego = lazy(() => import('./FunilTrafego'));
const CACDashboard = lazy(() => import('./CACDashboard'));
const MetricasVendas = lazy(() => import('./MetricasVendas'));
const Relatorios = lazy(() => import('./Relatorios'));
const DashboardBI = lazy(() => import('./DashboardBI'));
const DashboardCallCenter = lazy(() => import('./DashboardCallCenter'));

const SECTIONS: HubSection[] = [
  { key: 'funil', title: 'Funil de vendas', icon: Filter, module: 'central_funis', Component: FunilVendas,
    description: 'Novos leads, agendamento, comparecimento, venda, conversão, ticket e faturamento, com insights.' },
  { key: 'trafego', title: 'Funil de tráfego pago', icon: Megaphone, module: 'funil_trafego', Component: FunilTrafego,
    description: 'Investimento até a venda por criativo. Pronto para conectar Meta Ads e Google Ads.' },
  { key: 'cac', title: 'CAC & Financeiro', icon: Wallet, module: 'cac', Component: CACDashboard,
    description: 'Investimento, custo por lead e por venda, faturamento e lucro.' },
  { key: 'vendas', title: 'Métricas de vendas', icon: LineChart, module: 'metricas_vendas', Component: MetricasVendas,
    description: 'Vendas em 1 e 2 etapas, faturamento, ticket e desempenho por atendente.' },
  { key: 'relatorios', title: 'Relatórios', icon: FileText, module: 'relatorios', Component: Relatorios,
    description: 'Relatórios do período para exportar e compartilhar.' },
  { key: 'bi', title: 'Dashboard BI', icon: BarChart3, module: 'bi', Component: DashboardBI,
    description: 'Visão 360° de receita, LTV, CAC e projeções.' },
  { key: 'call-center', title: 'Call Center', icon: Headset, module: 'call_center', Component: DashboardCallCenter,
    description: 'Ligações, contatos e produtividade da equipe de atendimento.' },
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
