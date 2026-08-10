# Arquitetura — PROSPEX AUTOPILOT

## Visão geral

SPA React (client-side). Todo o pipeline roda no navegador em modo demo;
em produção, cada agente pode delegar a integrações externas (IA, busca,
maps, e-mail, WhatsApp) via `src/integrations/` — que sempre têm fallback
demo e nunca falham sem credenciais.

```
[NewCampaign wizard] → Campaign (store) → Orchestrator (assíncrono)
    → DiscoveryAgent → NormalizerAgent → WebsiteAgent
    → DigitalPresenceAgent → ScoringAgent → OpportunityAgent
    → BusinessAnalyst → CopywriterAgent → QualityChecker
    → DuplicateDetector → Lead materializado (store)
         ↓ (aprovado manualmente)
    messaging.ts → envio (simulado em demo) → followups.ts → CRM
```

## Estado

- `src/services/store.ts` — zustand com persist (`prospex_`), seed automático
  se vazio, histórico de agentes (`agentRuns`), auditoria (`auditLog`), logs
  (`prospex_logs` via `src/lib/logger.ts`).
- **Regra crítica**: seletores de zustand devem retornar referências estáveis.
  Nunca use `.filter()`/`.map()` dentro do seletor — selecione o array cru e
  filtre com `useMemo` no corpo do componente (evita loop
  "Maximum update depth" no React 18).
- Ações assíncronas do pipeline atualizam a store em pequenos passos
  (`set` por agente), dando progresso visível na UI.

## Camadas

| Camada | Local | Responsabilidade |
|---|---|---|
| Páginas | `src/pages/` | Rotas, formulários, visualização |
| Serviços | `src/services/` | Regras de negócio + orquestração da store |
| Agentes | `src/agents/` | Pipeline de prospecção (pure functions + run) |
| Integrações | `src/integrations/` | Adapters externos com fallback demo |
| Dados | `src/database/` | demoFactory, seed, storage, supabase client |

## Agentes

Todos herdam `AgentBase` (`src/agents/base.ts`) com `run()` + `verify()` e
registram `AgentRun` (status, duração, erros, retries) — visível em
`/agents`. Sempre idempotentes: re-executar um agente não duplica dados.

## Fluxo de envio (human-in-the-loop)

1. Copywriter gera 3 versões (`short | consultive | direct`).
2. QualityChecker valida; mensagens problemáticas são regeneradas.
3. **Ninguém é contatado sem aprovação explícita** na tela do lead
   (`Messages` / `LeadDetail`).
4. `messaging.ts` respeita: interruptor mestre, limites diários/horários,
   cooldown por empresa, `DO_NOT_CONTACT` e opt-out.
5. Em demo, o envio é simulado (marcado) e registrado em atividade.

## Rotas (16 páginas)

`/` dashboard · `/campaigns/new` wizard · `/campaigns` · `/campaigns/:id` ·
`/leads` · `/leads/:id` · `/kanban` · `/messages` · `/followups` ·
`/companies` · `/proposals` · `/agents` · `/automations` ·
`/integrations` · `/reports` · `/settings` · **`/discovery`** (execuções da
descoberta de empresas)

## Decisões de projeto

- **Demo-first**: zero dependência de credenciais para rodar a demo.
- **Sem inventar dados reais**: `demoFactory` só gera dados fictícios, todos
  marcados `isDemo` e exibidos com selo DEMO.
- **Pontuação configurável**: pesos em `src/config/defaults.ts`, editáveis
  em Settings; recálculo sob demanda (explica mudanças com scoreBreakdown).
- **Integrações plugáveis**: registry em `src/integrations/registry.ts`;
  o status de cada uma aparece em `/integrations`.
- **Real Discovery (Fase 2)**: `src/discovery/` (engine + providers), modos
  DEMO/REAL/HYBRID, `data_status`/`source*`/`retrieved_at` em toda empresa,
  execução real com Google Places ou bloqueio com aviso (nunca mock como
  real). Detalhes em `REAL_DISCOVERY.md`.
