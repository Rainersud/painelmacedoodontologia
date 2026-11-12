// Status de meta — único para o painel inteiro.
// Cor forte só aparece aqui, e sempre acompanhada de ícone e texto.
import { CheckCircle2, AlertTriangle, AlertOctagon, type LucideIcon } from 'lucide-react';

export type GoalStatusKey = 'healthy' | 'warning' | 'critical';

export interface StatusStyle {
  label: string;
  icon: LucideIcon;
  /** texto e ícone */
  text: string;
  /** preenchimento da barra */
  fill: string;
  /** fundo suave do selo */
  soft: string;
}

export const STATUS: Record<GoalStatusKey, StatusStyle> = {
  healthy: {
    label: 'No ritmo',
    icon: CheckCircle2,
    text: 'text-success',
    fill: 'bg-success',
    soft: 'bg-success/10',
  },
  warning: {
    label: 'Atenção',
    icon: AlertTriangle,
    text: 'text-warning-strong',
    fill: 'bg-warning',
    soft: 'bg-warning/15',
  },
  critical: {
    label: 'Crítico',
    icon: AlertOctagon,
    text: 'text-destructive',
    fill: 'bg-destructive',
    soft: 'bg-destructive/10',
  },
};
