# TODO — PROSPEX AUTOPILOT

Status: produto MVP demo-first completo + **Real Discovery (Fase 2 & 2.5 - OpenStreetMap)** + **AI Qualification Engine (Fase 3)**
(build/typecheck/66 testes ok). Itens por prioridade.

## Concluído recentemente

- [x] **Fase 2.5 — Free Real Discovery Engine (OpenStreetMap / Overpass API)**
- [x] **Fase 3 — AI Qualification Engine (Qualificação comercial, score determinístico, OpenRouter, explicabilidade e evidências)**

## Alta prioridade

- [ ] Autenticação de verdade (Supabase Auth) + multi-usuário com papéis
  (app_users/RLS já preparados em `001_init.sql`).
- [ ] Persistência real em Supabase: trocar localStorage por banco
  (criar camada `repository` abstrata sobre `src/database/supabase.ts`);
  sync de `discovery_runs`/`discovery_results` inclui 003.
- [ ] Servidor para chamadas externas em produção (CORS, fila, envio):
  hoje as integrações chamam os provedores direto do browser.
- [ ] Testes de UI/QA automatizados em CI (Playwright/Patchright) via
  scripts: `qa-script.mjs`, `qa-error.mjs`, `qa-loop.mjs`.
- [ ] Rate-limit por domínio e dedup de mensagens por empresa/intervalo.
- [ ] Real Discovery: apontar `discovery_results` também para o Supabase
  e expor campo `data_status` no filtro de exportação/relatórios.

## Média

- [ ] Fonte real de busca adicional além do Google Places (ex.: SerpAPI/
      CSE), reusando `src/discovery/providers/types.ts` (busca com
      `getConfiguredRealProviders`).
- [ ] Integração real de IA: prompt tuning com schema estruturado de
      saída (JSON) + fallback de provisão.
- [ ] Fila de envio com retry (expo) e status por mensagem (api, email).
- [ ] Dashboard de custo de IA real (consumo por campanha).
- [ ] Exportar relatórios: PDF e e-mail periódico (cron).
- [ ] Módulo de usuários: papel OWNER/ADMIN/MEMBER/VIEWER no UI.
- [ ] Multi-workspace: seletor de workspace + isolamento por tenant no UI.

## Baixa / polish

- [ ] i18n (EN) — atual só pt-BR.
- [ ] Dark mode.
- [ ] PWA/offline (service worker).
- [ ] Upload de logo/avatar; theme branding.
- [ ] Métricas de posição do produto (funnel real a partir de eventos).

## Manutenção contínua

- [ ] Varrer `src/pages` e selar seletores zustand (regra AGENTS.md).
- [ ] Remover scripts QA temporários (`qa-*.mjs`) quando o CI eventual
      fornecer cobertura.
- [ ] Revisar `src/database/demoFactory` para nunca gerar dados reais.