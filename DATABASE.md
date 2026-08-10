# Banco de dados — PROSPEX AUTOPILOT

## Modo padrão (demo): localStorage

Sem backend configurado, a app persiste no navegador via zustand
(`localStorage`, prefixo `prospex_`):

| Chave | Conteúdo |
|---|---|
| `prospex_state` | Store completa (companies, leads, campaigns, atividades, etc.) |
| `prospex_logs` | Logs de execução (erros de UI capturados, etc.) |

O schema espelha `src/types/index.ts`.

## Modo Supabase (opcional)

Ao definir `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, `src/database/supabase.ts`
disponibiliza o cliente; a persistência em nuvem é uma capacidade futura
(ver TODO.md). O schema está pronto em `supabase/migrations/`.

### Aplicar migrações

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

Ou via psql:

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/002_seed_demo.sql
psql "$DATABASE_URL" -f supabase/migrations/003_real_discovery.sql
```

## Esquema (`supabase/migrations/001_init.sql`)

Tabelas (todas com RLS por workspace):

- `workspaces` — multi-tenant
- `app_users` — usuários vinculados ao Supabase Auth (papel OWNER/ADMIN/MEMBER/VIEWER)
- `companies` — empresas descobertas (site, whatsapp, rating, review_count, is_demo)
- `campaigns` — campanhas + critérios + oferta (jsonb) + stats
- `leads` — resultado do pipeline (score, tier, website_scan, analysis JSONB)
- `lead_messages` — versões de mensagem (short/consultive/direct, approved, used)
- `lead_activities` — timeline de eventos
- `notes`, `followups`, `proposals`, `tasks`, `notifications`
- `agent_runs` — execuções de agentes (status, duração, erros)
- `automation_rules` — regras de automação
- `audit_log` — trilha de auditoria (quem/que/o que)
- `settings` — configuração global por workspace (pesos de score, limites,
  interruptor mestre, cooldown, follow-up)

Uso de enums Postgres para status (campaign_status, lead_status, ...) e
trigger `updated_at`. RLS filtra tudo por `current_workspace_id()` do usuário.

### Real Discovery (`003_real_discovery.sql`)

- Enums: `data_status`, `discovery_run_status`, `whatsapp_status`,
  `discovery_confidence`, `opportunity_quality`.
- `companies` ganha colunas de proveniência: `data_status`, `source_type`,
  `source_record_id`, `source_url`, `retrieved_at`, `last_verified_at`,
  `verification_status`, `discovery_confidence`, `confidence_reasons`,
  `phone_normalized/country/type`, `whatsapp_status`,
  `website_quality_score/factors/checked_at`, `do_not_contact`, `field_sources`.
- `company_socials` — redes sociais da empresa (nome/fonte/url/status).
- `discovery_runs` — execuções de busca (modo, provider, query, stats, status).
- `discovery_results` — empresa bruta (raw_payload jsonb, status de
  deduplicação, retorno de processamento).
- RLS por workspace em todas as novas tabelas.

### Seed (`002_seed_demo.sql`)

Cria workspace demo + settings com pesos de score padrão. (O front em modo
demo usa `src/database/seed.ts`, que não requer banco.)

## Convenções

- IDs: `uuid` (gen_random_uuid) no banco; `crypto.randomUUID()` no front.
- Datas: `timestamptz` / ISO 8601 strings no front.
- Campos compostos (analysis, offer, criteria, scoreBreakdown): JSONB no banco.
- Dados demo marcados com `is_demo`/`isDemo`.