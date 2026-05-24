
# Reformulação Integrada: Dashboard ↔ Comercial 1 ↔ Metas da Clínica

Esta é uma mudança grande e cruzada (UI + schema + lógica). Proposta dividida em 5 fases entregáveis. Confirme antes de eu começar.

## Fase 1 — Schema: nova origem obrigatória do lead

Adicionar coluna `lead_arrival_source` em `leads` (enum):
- `facebook`, `instagram`, `google`, `passou_na_frente`, `indicacao_pac`, `prospeccao_ativa`, `indicacao_parceria`, `social_selling`

Migrações:
- Criar enum `lead_arrival_source`.
- Adicionar coluna (nullable inicialmente p/ não quebrar leads existentes; default `passou_na_frente`).
- Atualizar `AddLeadDialog` e `LeadDetailDialog` (aba Dados) com Select obrigatório "Como Lead Chegou?".

## Fase 2 — Filtros e proporcionalidade (dias úteis, base 20 du/mês)

- Padronizar filtros **Hoje / Semana / Mês** em:
  - `BusinessMetricsWidget`
  - `MetasClinica` (novo filtro)
  - novos cards de origem
- Helper `useBusinessDays()` com:
  - diário = meta_mensal / 20
  - semanal = meta_mensal / 4 (≈5 du/semana)
  - mensal = meta_mensal
- Cálculos sempre baseados em **dias úteis decorridos** no período.

## Fase 3 — Dashboard: integração total com Comercial 1

Substituir métricas independentes pelas etapas reais do funil (mesma fonte do Funil.tsx):
1. **Novos Leads** (stage `novo_lead`)
2. **Agendado** (`agendado`)
3. **Compareceu** (`compareceu`)
4. **Venda Realizada** (`fechado`)

Mesma nomenclatura, mesma contagem, sem cálculo paralelo.

### Cores semânticas atualizadas
- 🔴 Vermelho = Crítico
- 🟢 Verde = Atenção
- 🔵 Azul = Saudável

Aplicado em: Taxa de Resposta, Tempo Médio de Conversão, Taxa de Recuperação, LTV.

### LTV → replica do Comercial 2
LTV no Dashboard apenas lê `useLTVMetrics` (nada de recálculo).

## Fase 4 — Novos widgets do Dashboard

### a) Card "Origens Estratégicas" (comparativo lead vs agendado)
Para cada origem mostra `Recebidos × Agendados × Taxa%`:
- Indicação Pac
- Prospecção Ativa
- Indicação de Parceria
- Social Selling

### b) ROI Inteligente — aba "Por Origem" reformulada
Para cada origem: leads, agendamentos, comparecimentos, vendas, faturamento, ROI, ROAS, taxa fechamento, ticket médio. Visualizações: pizza (distribuição leads), barras (faturamento), evolutivo (linha mensal por origem).

### c) Perdas por Motivo — gráfico inteligente
Categorias fixas: Preço, Medo, Não tem cartão, Desistiu, Sumiu, Fechou no concorrente. Mostrar quantidade, %, valor perdido estimado. Banner destaque: "Maior perda atual: X (Y%)".

### d) Insights automáticos
Ex.: "Taxa de comparecimento abaixo da meta saudável", "Parceria com maior ticket médio", "Social Selling com melhor ROI", "Gargalo Agendamento → Comparecimento", "Preço é maior motivo de perda".

## Fase 5 — Gestão → Metas da Clínica (motor das metas)

Antes de replicar no Dashboard, **corrigir o módulo original**.

### Filtros: Hoje / Semana / Mês (dias úteis)

### Card premium do objetivo principal
"Faturar R$ 120.000 em 20 dias trabalhados com ticket médio de R$ 6.000" — barra de progresso e % atingido.

### Estrutura oficial (todas editáveis em `meta_settings`)
| Métrica | Meta | Tipo |
|---|---|---|
| Novos Leads | 300/mês | volume |
| Agendamentos | 135 | volume |
| Taxa Agendamento | 45% | % saudável |
| Comparecimentos | 95 | volume |
| Taxa Comparecimento | 70% | % saudável |
| Vendas Realizadas | 20 | volume |
| Taxa Fechamento | 21% | % saudável |
| Ticket Médio | R$ 6.000 | valor |
| Faturamento | R$ 120.000 | valor |
| Investimento Tráfego | R$ 6.000 | valor |
| CPL | R$ 20 | meta inversa |
| CAC | R$ 300 | meta inversa |
| ROI Líquido | 8x | múltiplo |
| ROAS Bruto | 20x | múltiplo |

Visual segue o padrão da última coluna atual (cards premium + barras + animações).

### Replicar no Dashboard
Componente compartilhado `<ClinicGoalsBoard variant="dashboard" />` consumindo o **mesmo hook** (`useClinicGoals`) — sincronia em tempo real, zero divergência.

## Notas técnicas

- Hooks afetados: `useBusinessMetrics`, `useDashboardKPIs`, `useROIAnalytics`, `useStrategicInsights`, `useClinicGoals`, `useLTVMetrics`.
- Componentes novos: `StrategicOriginsWidget`, `LossReasonsAdvancedWidget`, `MainGoalCard`, `useBusinessDays` helper.
- Migrações: 1 (enum + coluna `lead_arrival_source`) + seeds em `meta_settings` para as novas chaves de meta.
- Sem mudança em RLS.

## Pergunta antes de começar

Posso seguir nessa ordem (Fase 1 → 5 numa sequência só) ou prefere que eu entregue **uma fase por vez** para revisar e aprovar entre cada uma? A Fase 1 envolve migração de banco e novo campo obrigatório no cadastro de lead — confirma?
