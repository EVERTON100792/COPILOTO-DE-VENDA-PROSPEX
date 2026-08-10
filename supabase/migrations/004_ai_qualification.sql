-- ============================================================
-- PROSPEX AUTOPILOT — Migração 004: AI Qualification Engine
-- Fase 3: qualificação de leads, scoring explicável e inteligência comercial.
-- Migration nova: NÃO altera 001/002/003 (já executadas).
-- ============================================================

-- ---------- Novos enums ----------
create type public.qualification_level as enum ('HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED');
create type public.qualification_method as enum ('AI', 'RULE_BASED', 'RULE_BASED_FALLBACK', 'DEMO');
create type public.ai_mode as enum ('DISABLED', 'OPTIONAL', 'REQUIRED');

-- ---------- lead_qualifications (Análises e qualificações de leads) ----------
create table if not exists public.lead_qualifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,

  rule_based_score numeric(5,2) not null default 0,
  ai_score numeric(5,2),
  final_score numeric(5,2) not null default 0,

  qualification public.qualification_level not null default 'UNVERIFIED',
  confidence numeric(3,2) not null default 0.50,
  qualification_method public.qualification_method not null default 'RULE_BASED',

  opportunity_types text[] default '{}',
  positive_signals text[] default '{}',
  negative_signals text[] default '{}',
  evidence jsonb default '[]'::jsonb,
  opportunity_reasons text[] default '{}',

  recommended_service text,
  recommended_approach text,
  next_action text,
  summary text,
  website_assessment text,

  ai_provider text,
  ai_model text,
  prompt_version text,
  input_hash text not null,

  status text not null default 'COMPLETED',
  error_code text,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists idx_lead_qualifications_workspace on public.lead_qualifications (workspace_id);
create index if not exists idx_lead_qualifications_lead on public.lead_qualifications (lead_id);
create index if not exists idx_lead_qualifications_company on public.lead_qualifications (company_id);
create index if not exists idx_lead_qualifications_campaign on public.lead_qualifications (campaign_id);
create index if not exists idx_lead_qualifications_qualification on public.lead_qualifications (qualification);
create index if not exists idx_lead_qualifications_hash on public.lead_qualifications (input_hash);

-- ---------- RLS ----------
alter table public.lead_qualifications enable row level security;

create policy "own workspace lead_qualifications" on public.lead_qualifications
  for all using (workspace_id = public.current_workspace_id());
