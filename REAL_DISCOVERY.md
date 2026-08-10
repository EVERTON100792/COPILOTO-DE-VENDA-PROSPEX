# Real Discovery Engine — Fase 2 & 2.5

Descoberta de empresas **real** via **OpenStreetMap (Overpass API)** como fonte primária gratuita (sem API key, sem cartão) e **Google Places** como provedor opcional, mantendo modos DEMO / HYBRID / REAL, rastreabilidade total (`data_status`, `source_type`, `retrieved_at`, raw) e sem nunca misturar dados fictícios com reais.

## Modos

| Modo | Comportamento |
|---|---|
| `DEMO` | Usa o provider mock (dados fictícios marcados `DATA DEMO`). Nunca cria dados REAIS. |
| `REAL` | Usa fontes reais disponíveis (**OpenStreetMap** por padrão; Google Places opcional). Se NENHUMA fonte real estiver disponível, a execução falha com aviso. |
| `HYBRID` | Prioriza a fonte real disponível; complementa com mock como DEMO se necessário (cada resultado é identificado). |

## Pipeline

```
DiscoveryService.run()
 → getDiscoveryProvider(providerId)          (registry)
 → provider.search(segment, city, state, pageToken)   (paginação + rate limit)
 → processBusiness:
     normalize → validate (dados mínimos)
     → deduplicate (ID da fonte → telefone → domínio → nome+cidade)
     → persist raw em discovery_results
     → Company (dataStatus REAL|DEMO, source*, retrievedAt, discoveryConfidence)
     → website scan (só se a fonte fornecer URL; orçamento máx. 30 por run)
     → ScoringAgent.computeScore + analyzeOpportunity
     → Lead criado (campaignId se vier do wizard)
```

## Fonte oficial: Google Places API (New)

- Endpoint: `POST https://places.googleapis.com/v1/places:searchText`
- Auth: header `X-Goog-Api-Key` + fieldmask `X-Goog-FieldMask` (`places.id`,
  `displayName`, `formattedAddress`, `internationalPhoneNumber`, `websiteUri`,
  `rating`, `userRatingCount`, `googleMapsUri`, `businessStatus`, `nextPageToken`)
- Pagination com `pageToken` em `nextPageToken` da resposta.
- Erros: `403` → acesso negado (billing), `429` → retryable.
- O preço não é estimado: `totalEstimate: null` até existir faturamento.

## Configurando

1. Google Cloud Console → habilitar "Places API (New)" + billing.
2. Copie `VITE_MAPS_API_KEY=...` no `.env.local` (chave dev ida direto ao browser)
   **ou** salve a chave pela tela `/integrations` (fica em
   `localStorage['prospex_provider_key_google-places']`, nunca exibida
   por completo).
3. `npm run build && npm run test`

## Proveniência de dados (Company)

| Campo | Significado |
|---|---|
| `data_status` | REAL / DEMO / IMPORTED / MANUAL / UNVERIFIED |
| `source_type` | `google-places` / `csv` / `mock` / `manual` |
| `source_record_id` | ID na fonte (dedup por esse ID) |
| `source_url` | link da fonte (ex.: Google Maps) |
| `retrieved_at` / `last_verified_at` | quando foi puxado |
| `verification_status` | VERIFIED (manual/backend) / UNVERIFIED |
| `discovery_confidence` + `confidence_reasons` | confiança da descoberta |
| `raw_data_id` | aponta para `discovery_results.raw_payload` |

## Extras

- **Importação CSV real**: `importExport.ts` marca `IMPORTED` + `source_type=csv` +
  confiança MEDIUM/LOW + `verification_status`.
- **Cancelamento**: execuções longas podem ser canceladas; o que já foi salvo
  permanece (nada é desfeito / corrompido).
- **Testes**: `tests/recovery.test.ts` (serviços), `tests/engine.test.ts`
  (pipeline real fim-a-fim com mock: JSON + dedup + validação + leads).
- **SQL**: `supabase/migrations/003_real_discovery.sql` (schema p/ Supabase;
  o app continua localStorage-first).