-- ============================================================
-- PROSPEX AUTOPILOT — Migração 003: Real Discovery Engine
-- Fase 2: descoberta real de empresas + rastreio de fonte de dados.
-- Migration nova: NÃO altera 001/002 (já executadas).
-- ============================================================

-- ---------- Novos enums ----------
create type public.data_status as enum ('REAL','DEMO','IMPORTED','MANUAL','UNVERIFIED');
create type public.discovery_run_status as enum ('QUEUED','RUNNING','COMPLETED','PARTIAL','FAILED','CANCELLED');
create type public.whatsapp_status as enum ('UNKNOWN','VERIFIED','NOT_VERIFIED');

-- ---------- companies: campos de fonte de dados ----------
alter table public.companies
  add column if not exists data_status public.data_status not null default 'DEMO',
  add column if not exists source_type text,
  add column if not exists source_record_id text,
  add column if not exists source_url text,
  add column if not exists retrieved_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_status text,
  add column if not exists raw_data_id uuid,
  add column if not exists discovery_confidence text,
  add column if not exists confidence_reasons text[] default '{}',
  add column if not exists phone_normalized text,
  add column if not exists phone_country text,
  add column if not exists phone_type text,
  add column if not exists whatsapp_status public.whatsapp_status not null default 'UNKNOWN',
  add column if not exists website_status text,
  add column if not exists website_quality_score numeric(5,2),
  add column if not exists website_quality_factors jsonb,
  add column if not exists website_checked_at timestamptz,
  add column if not exists do_not_contact boolean not null default false,
  add column if not exists field_sources jsonb default '{}'::jsonb;

-- ---------- company_socials (Instagram, Facebook, LinkedIn, YouTube, TikTok) ----------
create table if not exists public.company_socials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','linkedin','youtube','tiktok','website','other')),
  url text not null,
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.company_socials enable row level security;

create policy "own company_socials" on public.company_socials
  using (company_id in (select id from public.companies));

-- ---------- discovery_runs (execuções de busca) ----------
create table if not exists public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  mode text not null default 'DEMO',
  provider text not null,
  query text not null,
  location text,
  requested_limit int not null default 20,
  found_count int not null default 0,
  processed_count int not null default 0,
  new_count int not null default 0,
  duplicate_count int not null default 0,
  error_count int not null default 0,
  status public.discovery_run_status not null default 'QUEUED',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  quota jsonb,
  cost_estimate_usd numeric(10,4)
);
alter table public.discovery_runs enable row level security;

create policy "own discovery_runs" on public.discovery_runs
  for all using (workspace_id = public.current_workspace_id());

create index if not exists idx_discovery_runs_workspace on public.discovery_runs (workspace_id, started_at desc);

-- ---------- discovery_results (dado bruto não confiável) ----------
create table if not exists public.discovery_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_id uuid references public.discovery_runs (id) on delete cascade,
  provider text not null,
  provider_record_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  status text not null default 'NEW',
  company_id uuid references public.companies (id) on delete set null,
  processed boolean not null default false
);
alter table public.discovery_results enable row level security;

create policy "own discovery_results" on public.discovery_results
  for all using (workspace_id = public.current_workspace_id());

create index if not exists idx_discovery_results_run on public.discovery_results (run_id);