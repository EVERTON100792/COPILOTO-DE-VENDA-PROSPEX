# PROSPEX AUTOPILOT

Plataforma SaaS de **descoberta, qualificação e prospecção B2B** para negócios locais.
Pipeline autônomo: descoberta → normalização → site/digital presence → scoring → análise de oportunidade → copywriting → aprovação humana → envio → follow-ups → CRM.

> **Demo-first**: roda 100% sem APIs externas. `DEMO_MODE` é o padrão; todos os dados gerados são fictícios e marcados como demo.

## Stack

- React 18 + TypeScript + Vite 5
- zustand (estado + persistência localStorage, prefixo `prospex_`)
- react-router-dom 6
- vitest (66 testes unitários e de integração)
- @supabase/supabase-js (persistência opcional — desligada em demo)

## Funcionalidades Principais

- **Fase 2.5 — Free Real Discovery Engine**: Descoberta pública gratuita de empresas reais via OpenStreetMap / Overpass API (sem necessidade de cartão ou Google Places).
- **Fase 3 — AI Qualification Engine**: Qualificação inteligente de leads com pontuação determinística (Rule-Based), integração opcional com OpenRouter / OpenAI, explicabilidade comercial, evidências rastreáveis, cache por hash e processamento em massa.

## Quick start

```bash
npm install
npm run dev          # dev server (http://localhost:5173)
npm run build        # tsc -b && vite build
npm run preview      # serve o build (http://localhost:4173)
npm run test         # vitest run
```

## Estrutura

```
src/
  agents/        # Pipeline: Discovery, Normalizer, Website, DigitalPresence,
                 # Scoring, Opportunity, BusinessAnalyst, Copywriter,
                 # QualityChecker, DuplicateDetector, Orchestrator
  components/    # UI kit (ui.tsx), charts, exportHelpers, ToastHost, discovery.tsx
  config/        # defaults (scores, limites), env, nichos
  database/      # demoData, demoFactory, seed, storage, supabase
  discovery/     # Free & Real Discovery Engine: engine.ts, providers (openStreetMap real grátis,
                 # google-places opcional, mock), registry — modos DEMO/REAL/HYBRID (Fase 2.5)
  integrations/  # ai, search, maps, email, whatsapp, website (todos com fallback demo)
  layouts/       # AppLayout (nav + busca + notificações)
  lib/           # utils, logger
  pages/         # 16 páginas (Dashboard, NewCampaign, CampaignDetail, Leads,
                 # LeadDetail, Kanban, Messages, Followups, Companies,
                 # Proposals, Agents, Automations, Integrations, Reports, Settings,
                 # Discovery)
  services/      # store (zustand), crm, messaging, followups, insights, importExport,
                 # normalization, deduplication, validation, websiteQuality, opportunity
supabase/migrations/  # 001_init.sql (schema + RLS), 002_seed_demo.sql,
                      # 003_real_discovery.sql (data_status, discovery_runs/results, company_socials)
tests/           # score, normalize, import, recovery, engine, openstreetmap, overpassQuery, openstreetmapProvider (Fase 2.5)
```

## Real Discovery (Fase 2)

Busca real de empresas (Google Places API) com modos DEMO/REAL/HYBRID,
`data_status`, dedup, importação CSV real e painel `/discovery`. Sem API key,
o modo REAL é bloqueado — nunca usa dados fictícios como reais.
Veja `REAL_DISCOVERY.md`.

## Segurança & Modo demo

- `VITE_DEMO_MODE=true` (padrão) → nenhuma chamada externa, nada sai do navegador.
- **Interruptor mestre** (Settings): desliga todas as ações de envio e automação.
- **Human-in-the-loop**: nenhuma mensagem é enviada sem aprovação manual.
- Limites de contato diários/horários e cooldown entre campanhas.
- Dados demo sempre identificados; exportação e importação auditadas.

Veja `ARCHITECTURE.md`, `INTEGRATIONS.md`, `DEPLOYMENT.md`, `SECURITY.md`, `DATABASE.md` e `REAL_DISCOVERY.md`.
