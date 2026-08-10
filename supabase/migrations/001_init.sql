-- ============================================================
-- PROSPEX AUTOPILOT — Migração inicial
-- Supabase / PostgreSQL 15+
-- Executar via: supabase db push  |  psql $DATABASE_URL -f 001_init.sql
-- ============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type public.campaign_status as enum ('DRAFT','RUNNING','PAUSED','FINISHED','STOPPED','FAILED');
create type public.lead_status as enum ('NEW','QUALIFIED','READY_TO_CONTACT','CONTACTED','REPLIED','INTERESTED','NEGOTIATION','PROPOSAL_SENT','WON','LOST','NO_RESPONSE','DO_NOT_CONTACT');
create type public.lead_tier as enum ('HOT','HIGH','MEDIUM','LOW','VERY_LOW');
create type public.website_status as enum ('NO_WEBSITE','WEBSITE_FOUND','WEBSITE_UNVERIFIED','WEBSITE_BROKEN','WEBSITE_OUTDATED','WEBSITE_POOR_MOBILE','WEBSITE_UNKNOWN');
create type public.proposal_status as enum ('DRAFT','SENT','VIEWED','NEGOTIATING','ACCEPTED','REJECTED');
create type public.followup_status as enum ('PENDING','SENT','SKIPPED','DONE');
create type public.task_priority as enum ('LOW','MEDIUM','HIGH','URGENT');
create type public.task_status as enum ('TODO','IN_PROGRESS','DONE','CANCELLED');
create type public.agent_status as enum ('QUEUED','RUNNING','SUCCESS','FAILED','RETRYING','CANCELLED');
create type public.app_role as enum ('OWNER','ADMIN','MEMBER','VIEWER');
create type public.master_switch as enum ('ON','OFF','PAUSED');

-- ---------- Workspaces ----------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- Usuários (vinculados ao Supabase Auth) ----------
create table public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  email text not null,
  role public.app_role not null default 'MEMBER',
  created_at timestamptz not null default now()
);

-- ---------- Empresas ----------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  category text,
  city text,
  state text,
  country text,
  address text,
  phone text,
  whatsapp text,
  email text,
  website text,
  instagram text,
  facebook text,
  rating numeric(3,1),
  review_count integer,
  hours text,
  source text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index companies_workspace_idx on public.companies (workspace_id);
create index companies_city_idx on public.companies (city);
create index companies_category_idx on public.companies (category);

-- ---------- Campanhas ----------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  niche text not null,
  city text,
  state text,
  country text default 'BR',
  quantity integer not null default 50,
  keywords text[] not null default '{}',
  criteria jsonb not null default '{}'::jsonb,
  offer jsonb not null default '{}'::jsonb,
  message_prompt text,
  status public.campaign_status not null default 'DRAFT',
  progress numeric(5,2) not null default 0,
  stats jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_campaigns_workspace on public.campaigns (workspace_id);

-- ---------- Leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  status public.lead_status not null default 'NEW',
  tier public.lead_tier,
  score integer,
  score_breakdown jsonb,
  website_status public.website_status not null default 'WEBSITE_UNKNOWN',
  website_scan jsonb,
  digital_presence_score numeric(5,2),
  has_whatsapp boolean not null default false,
  has_instagram boolean not null default false,
  has_facebook boolean not null default false,
  has_phone boolean not null default false,
  analysis jsonb,
  analysis_hash text,
  last_analyzed_at timestamptz,
  proposal jsonb,
  favorite boolean not null default false,
  tags text[] not null default '{}',
  notes_count int not null default 0,
  next_action text,
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_workspace on public.leads (workspace_id);
create index idx_leads_campaign on public.leads (campaign_id);
create index idx_leads_status on public.leads (status);
create index idx_leads_score on public.leads (score desc);

-- ---------- Mensagens ----------
create table public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  version text not null check (version in ('short','consultive','direct')),
  body text not null,
  approved boolean not null default false,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index idx_lead_messages_lead on public.lead_messages (lead_id);

-- ---------- Atividades ----------
create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type text not null,
  description text not null,
  detail text,
  actor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_activities_lead on public.lead_activities (lead_id);

-- ---------- Notas ----------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null,
  author text,
  created_at timestamptz not null default now()
);

-- ---------- Follow-ups ----------
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  sequence int not null default 1,
  scheduled_at timestamptz not null,
  status public.followup_status not null default 'PENDING',
  message_id uuid references public.lead_messages (id) on delete set null,
  body text,
  created_at timestamptz not null default now()
);
create index idx_followups_due on public.followups (status, scheduled_at);

-- ---------- Propostas ----------
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  offer jsonb not null default '{}'::jsonb,
  description text,
  deadline timestamptz,
  observations text,
  status public.proposal_status not null default 'DRAFT',
  created_at timestamptz not null default now()
);

-- ---------- Tarefas ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  title text not null,
  description text,
  assignee text,
  due_at timestamptz,
  priority public.task_priority not null default 'MEDIUM',
  status public.task_status not null default 'TODO',
  created_at timestamptz not null default now()
);

-- ---------- Notificações ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  lead_id uuid references public.leads (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Execuções de agentes ----------
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  agent text not null,
  status public.agent_status not null default 'QUEUED',
  input jsonb,
  output jsonb,
  error text,
  duration_ms int,
  retries int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index idx_agent_runs_agent on public.agent_runs (agent, started_at desc);

-- ---------- Regras de automação ----------
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger text not null,
  conditions jsonb not null default '[]'::jsonb,
  actions text[] not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Trilha de auditoria ----------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
create index idx_audit_workspace on public.audit_log (workspace_id, created_at desc);

-- ---------- Configuração global por workspace ----------
create table public.settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  demo_mode boolean not null default true,
  master_switch public.master_switch not null default 'ON',
  score_weights jsonb not null default '{}'::jsonb,
  daily_contact_limit int not null default 20,
  hourly_contact_limit int not null default 5,
  campaign_limit int not null default 5,
  cooldown_days int not null default 30,
  followup_interval_days int[] not null default '{3,7,14}',
  followup_max int not null default 3,
  company_name text default 'Minha Empresa',
  ai_provider text default 'demo',
  data_retention_days int not null default 365,
  cache_hours int not null default 168,
  updated_at timestamptz not null default now()
);

-- ---------- Trigger updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.workspaces      enable row level security;
alter table public.app_users       enable row level security;
alter table public.companies       enable row level security;
alter table public.campaigns       enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_messages   enable row level security;
alter table public.lead_activities enable row level security;
alter table public.notes           enable row level security;
alter table public.followups       enable row level security;
alter table public.proposals       enable row level security;
alter table public.tasks           enable row level security;
alter table public.notifications   enable row level security;
alter table public.agent_runs      enable row level security;
alter table public.automation_rules enable row level security;
alter table public.audit_log       enable row level security;
alter table public.settings        enable row level security;

-- helper: workspace do usuário logado
create or replace function public.current_workspace_id()
returns uuid language sql stable security definer as $$
  select workspace_id from public.app_users where id = auth.uid()
$$;

create or replace policy "own workspace" on public.workspaces
  for all using (id = public.current_workspace_id());

create or replace policy "own companies" on public.companies
  for all using (workspace_id = public.current_workspace_id());

create or replace policy "own campaigns" on public.campaigns
  for all using (workspace_id = public.current_workspace_id());

create or replace policy "own leads" on public.leads
  for all using (workspace_id = public.current_workspace_id());

create or replace policy "own lead_messages" on public.lead_messages
  using (lead_id in (select id from public.leads));

create or replace policy "own lead_activities" on public.lead_activities
  using (lead_id in (select id from public.leads));

create or replace policy "own notes" on public.notes
  using (lead_id in (select id from public.leads));

create or replace policy "own followups" on public.followups
  using (lead_id in (select id from public.leads));

create or replace policy "own proposals" on public.proposals
  using (lead_id in (select id from public.leads));

create or replace policy "own tasks" on public.tasks
  using (lead_id in (select id from public.leads) or lead_id is null);

create or replace policy "own notifications" on public.notifications
  for all using (workspace_id = public.current_workspace_id());

create or replace policy "own agent_runs" on public.agent_runs
  for select using (true);

create or replace policy "own automation_rules" on public.automation_rules
  for all using (workspace_id = public.current_workspace_id());

create or replace policy "own audit_log" on public.audit_log
  for all using (workspace_id = public.current_workspace_id());

create or replace policy "own settings" on public.settings
  for all using (workspace_id = public.current_workspace_id());

-- app_users: usuário só vê a própria linha (criadores podem ler o workspace)
create policy "self app_users" on public.app_users
  for all using (id = auth.uid());