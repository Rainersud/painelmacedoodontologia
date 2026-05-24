
# Reformulação Completa da Dashboard

Vou reformular a dashboard inteira (`src/pages/Dashboard.tsx` + widgets) para ficar estratégica, integrada ao funil real e orientada a decisão comercial.

## Estrutura nova da Dashboard (ordem vertical)

```
┌─────────────────────────────────────────────────────────┐
│ 1. HEADER ESTRATÉGICO                                   │
│    Saudação + filtros de período (Hoje/7d/30d/Mês/Custom)│
│    + botão "Atualizar agora" (já é realtime)            │
├─────────────────────────────────────────────────────────┤
│ 2. KPIs PRINCIPAIS (6 cards grandes, integrados)        │
│    Leads Recebidos | Leads Atendidos | Consultas        │
│    Taxa Comparec.  | Taxa Conversão  | ROI              │
│    (cada card mostra valor + variação % vs período ant.)│
├─────────────────────────────────────────────────────────┤
│ 3. TAREFAS DO DIA (premium)                             │
│    Cards categorizados: Retornos / Confirmações /       │
│    Aniversariantes / Faltosos / Sem resposta / Pós-venda│
├─────────────────────────────────────────────────────────┤
│ 4. CONVERSÃO DO FUNIL (única, sem duplicar)             │
│    Funil visual com perdas entre etapas e gargalos      │
├─────────────────────────────────────────────────────────┤
│ 5. PRINCIPAIS MÉTRICAS DO NEGÓCIO (substitui            │
│    "Métricas-Chave"). Grid 4 colunas:                   │
│    Leads Gerados | CPL | T.Resposta | T.Agendamento     │
│    T.Comparec.   | T.Fechamento | Ticket Médio | CAC    │
│    ROAS | T.Médio Conversão | T.Recuperação | LTV       │
├─────────────────────────────────────────────────────────┤
│ 6. ROI INTELIGENTE                                      │
│    Gráfico evolutivo (dia/semana/mês) + ROI por origem  │
│    + ROI por campanha + ROI por vendedor                │
├─────────────────────────────────────────────────────────┤
│ 7. ORIGEM DOS LEADS + PERDAS POR MOTIVO (lado a lado)   │
│    Pie/bar com qtd, conversão, faturamento, ROI         │
├─────────────────────────────────────────────────────────┤
│ 8. ALERTAS INTELIGENTES (mantém atual já refeito)       │
├─────────────────────────────────────────────────────────┤
│ 9. EXTRAS ESTRATÉGICOS                                  │
│    Ranking de vendedores | Ranking de campanhas         │
│    Horários/dias com maior conversão                    │
│    Previsão de faturamento | Progresso da meta          │
│    Insights automáticos                                 │
├─────────────────────────────────────────────────────────┤
│ 10. LEADS RECENTES (filtros Hoje / 7d / 30d)            │
│     Pega do "Novos Leads" do Comercial 1                │
└─────────────────────────────────────────────────────────┘
```

REMOVIDO: "Pacientes com mais faltas".

## Arquivos / mudanças

**Hooks (lógica integrada ao funil real):**
- `src/hooks/useDashboardKPIs.ts` (novo) — calcula os 6 KPIs principais com variação % vs período anterior, usando leads, appointments, payments, acquisition_costs.
- `src/hooks/useBusinessMetrics.ts` (novo) — Leads Gerados, CPL, T.Resposta, T.Agendamento, T.Comparecimento, T.Fechamento, Ticket Médio, CAC, ROAS, Tempo Médio Conversão, T.Recuperação, LTV.
- `src/hooks/useROIAnalytics.ts` (novo) — ROI evolutivo, por origem, por campanha (ad_creatives), por vendedor.
- `src/hooks/useLeadOrigins.ts` (novo) — quantidade, conversão, faturamento e ROI por `lead.source`.
- `src/hooks/useLossAnalysis.ts` (novo) — agrupa `loss_reason` com qtd, %, valor perdido.
- `src/hooks/useStrategicInsights.ts` (novo) — ranking vendedores, ranking campanhas, horários/dias top, previsão faturamento, insights textuais (IA comercial baseada em regras: comparações de períodos, deltas notáveis).
- `src/hooks/useTodayTasksGrouped.ts` (novo) — agrupa tarefas em categorias (retornos, confirmações, aniversariantes, faltosos, sem resposta, pós-venda).

**Widgets novos:**
- `src/components/dashboard/DashboardHeader.tsx` — saudação + filtro de período global (context).
- `src/components/dashboard/MainKPIsWidget.tsx` — 6 KPIs grandes com sparkline e delta %.
- `src/components/dashboard/TodayTasksPremiumWidget.tsx` — substitui `TodayTasksWidget` com categorias e visual premium.
- `src/components/dashboard/BusinessMetricsWidget.tsx` — substitui `KeyMetricsWidget` (que será deletado).
- `src/components/dashboard/ROIAnalyticsWidget.tsx` — gráficos evolutivos e por dimensão.
- `src/components/dashboard/LeadOriginsWidget.tsx`
- `src/components/dashboard/LossReasonsWidget.tsx`
- `src/components/dashboard/StrategicInsightsWidget.tsx` — rankings, melhores horários/dias, previsão, insights.
- `src/components/dashboard/RecentLeadsWidget.tsx` — leads recentes com filtros Hoje / 7d / 30d.
- `src/components/dashboard/PeriodFilterContext.tsx` — contexto de período compartilhado por todos os widgets.

**Widgets mantidos / ajustados:**
- `FunnelConversionWidget.tsx` — mantido como única visualização do funil; melhorar visual (barras com perda entre etapas, destaque de gargalo).
- `SmartAlertsWidget.tsx` — mantido como está (já foi refeito).
- `ClinicGoalsWidget.tsx` — mantido (progresso da meta).
- `VisualFunnelWidget.tsx` — REMOVIDO da dashboard (duplicava o funil).
- `KeyMetricsWidget.tsx` — DELETADO.
- `TodayTasksWidget.tsx` — DELETADO (substituído pelo premium).
- Pacientes com mais faltas — REMOVIDO (qualquer ref na Dashboard).

**Página:**
- `src/pages/Dashboard.tsx` — recomposta na ordem acima, envolvida em `PeriodFilterProvider`.

## Detalhes técnicos por integração

- **Leads Recebidos**: `count(leads)` no período (todos os criados via Comercial 1 ou manual).
- **Leads Atendidos**: leads que saíram de `novo_lead` (tem `first_response_at` não-nulo OU stage_history mostra movimento) no período.
- **Consultas Agendadas**: `count(appointments)` agendados no período + leads em status `agendado`.
- **Taxa de Comparecimento**: `appointments.attended_at IS NOT NULL` ÷ `appointments` agendados × 100.
- **Taxa de Conversão**: leads com `status='fechado'` E `payments.status='pago'` ÷ leads que compareceram × 100.
- **ROI**: `(SUM(payments.net_value WHERE pago) - SUM(acquisition_costs.amount)) ÷ SUM(acquisition_costs.amount) × 100`.
- **CPL**: `SUM(acquisition_costs) ÷ count(leads)` no período.
- **CAC**: `SUM(acquisition_costs) ÷ count(leads fechados pagos)`.
- **ROAS**: `SUM(payments pago) ÷ SUM(acquisition_costs)`.
- **Ticket Médio**: `SUM(payments pago) ÷ count(vendas)`.
- **Tempo Médio de Conversão**: avg(`closed_at - created_at`) em dias.
- **Taxa de Recuperação**: leads com `rescued_at NOT NULL` ÷ leads perdidos (status `perdido`/`nao_fechou`) × 100.
- **LTV**: avg total `payments.net_value` por `lead_id` (agregando upsells via `upsell_opportunities`).
- **Origem dos Leads**: agrupa por `leads.source`.
- **Perdas por Motivo**: agrupa por `leads.loss_reason`.
- **Ranking vendedores**: agrupa por `assigned_agent_id`, mostra fechamentos + receita.
- **Ranking campanhas**: usa `ad_creatives` com revenue/investment para ROAS.
- **Horários/dias top**: agrupa `closed_at` por hora/dow.
- **Previsão faturamento**: projeção linear do ritmo do mês + receivables pendentes (já existe `useRevenueProjection`).
- **Insights**: comparar período atual vs anterior, gerar frases dinâmicas quando delta > 10%.

## Visual

- Cards `monday-card` com gradient sutil em KPIs principais.
- Sparklines (mini-charts via `recharts`) nos KPIs.
- Cores semânticas: `success`/`warning`/`destructive` para deltas.
- Chips de filtro de período sticky no topo.
- Animações suaves via classes Tailwind (`transition-all`, `animate-fade-in`).
- Realtime já garantido por `useRealtimeSync`.

## Escopo fora deste plano

- Não vou criar UI de input para custos por campanha além do que já existe em `acquisition_costs` / `ad_creatives`.
- Não vou alterar schema do banco — todas as métricas calculadas a partir de tabelas existentes.
- "IA comercial" para insights = regras determinísticas em TS (sem chamada a LLM) para manter custo zero e tempo real.
