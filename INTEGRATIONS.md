# Integrações — PROSPEX AUTOPILOT

Todas as integrações vivem em `src/integrations/` e seguem o mesmo padrão:
**fallback demo automático**. Sem credenciais (ou em `DEMO_MODE`), a
integração retorna dados fictícios marcados — nunca falha e nunca faz
chamadas reais. A página `/integrations` mostra o status de cada uma
(READY / CONFIGURATION_REQUIRED / DEMO_ONLY).

## Como funciona

Cada módulo expõe funções assíncronas que:

1. verificam `demoMode` / presença de credenciais;
2. se ausentes → simulam com dados demo (marcados `demoOnly`);
3. se presentes → chamam o provedor real via `fetch`.

Não há SDKs pesados; chamadas HTTP diretas mantêm o bundle enxuto.

## Módulos

### IA (`src/integrations/ai/index.ts`)
- Env: `VITE_AI_PROVIDER` (`openrouter` | `openai` | `anthropic`), `VITE_AI_API_KEY`, `VITE_AI_MODEL`, `VITE_AI_BASE_URL`
- Uso: análise de oportunidades, copywriting de mensagens, redação de propostas.
- Demo: gera textos a partir de templates + nome/negócio da empresa.

### Busca de empresas (`src/integrations/search/index.ts`)
- Env: `VITE_SEARCH_PROVIDER` (`serpapi` | `google_cse`), `VITE_SEARCH_API_KEY`, opções de CSE.
- Uso: DiscoveryAgent (encontrar empresas do nicho+cidade).
- Demo: `src/database/demoData.ts` gera empresas fictícias por nicho/cidade.

### Google Maps / Places (`src/integrations/maps/index.ts`)
- Env: `VITE_MAPS_API_KEY`.
- Uso: enriquecimento (endereço, telefone, rating, review_count, horários).
- Demo: dados fictícios consistentes com a empresa gerada.

### Free & Real Discovery — OpenStreetMap (Overpass API) (`src/discovery/providers/openStreetMap.ts`)
- Env: `VITE_OVERPASS_ENDPOINT` (default: `https://overpass-api.de/api/interpreter`), `VITE_NOMINATIM_ENDPOINT`.
- Uso: **fonte real primária e gratuita de busca de empresas** no wizard (modo REAL/HYBRID).
- Sem necessidade de API Key ou cartão de crédito. Atribuição: `© OpenStreetMap contributors` (ODbL).
- Geocodificação via Nominatim (1 req/s com cache no LocalStorage) e Overpass QL sanitizado.
- Detalhes: `FREE_DISCOVERY.md`.

### Real Discovery — Google Places API (New) (Opcional) (`src/discovery/providers/googlePlaces.ts`)
- Env: `VITE_MAPS_API_KEY` ou chave salva em `/integrations`
  (`localStorage['prospex_provider_key_google-places']`, exibida mascarada).
- Uso: **fonte opcional para busca enriquecida de empresas** no wizard (modo REAL/HYBRID) —
  `POST /v1/places:searchText` com `X-Goog-Api-Key` + `X-Goog-FieldMask`,
  paginação por `pageToken`, sem estimativa de custo (`totalEstimate: null`).
- Requer projeto no Google Cloud com billing ativado.
- Detalhes e contrato de erros (403/429): `REAL_DISCOVERY.md`.

### Website (`src/integrations/website/`)
- Sem env necessário para o scanner base; `index.ts` + `scanner.ts`.
- Uso: detectar se a empresa tem site, status HTTP, HTTPS, mobile-friendly,
  sinais de desatualização (copyright antigo, etc.).
- Demo: simula os resultados conforme score/tier.

### E-mail (`src/integrations/email/index.ts`)
- Env: `VITE_EMAIL_PROVIDER` (`resend` | `sendgrid` | `smtp`), `VITE_EMAIL_API_KEY`.
- Uso: envio real de mensagens aprovadas + follow-ups.
- Demo: simula o envio e registra na timeline (nada sai do navegador).

### WhatsApp (`src/integrations/whatsapp/index.ts`)
- Env: `VITE_WHATSAPP_PROVIDER` (`meta-cloud` | `evolution`), `VITE_WHATSAPP_API_KEY`, `VITE_WHATSAPP_PHONE_ID`.
- Uso: envio de mensagens via WhatsApp (sempre após aprovação manual).
- Demo: simula envio e retorna IDs fictícios (`demo`).

## Adicionar uma integração nova

1. Criar `src/integrations/<nome>/index.ts` seguindo o contrato de
   `src/integrations/types.ts`.
2. Registrar no registry: `src/integrations/registry.ts` (status, envKeys, descrição).
3. Garantir fallback demo sem credenciais e `demoOnly` nos resultados.

## Auditoria

Toda operação de envio (real ou demo) grava atividade no lead
(`CONTACT_MADE`, `FOLLOWUP_SCHEDULED`) e métrica de uso em
`AiUsage` (`requests`, `tokensUsed`, `estimatedCostUsd`) — visível em
`/integrations`.