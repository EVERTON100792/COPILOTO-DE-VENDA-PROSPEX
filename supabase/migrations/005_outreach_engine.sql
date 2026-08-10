-- ============================================================
-- PROSPEX AUTOPILOT — Migração 005: Outreach Engine
-- Fase 4: campanhas de abordagem comercial, fila, mensagens e histórico.
-- Migration nova: NÃO altera 001/002/003/004 (já executadas).
-- ============================================================

-- ---------- Novos enums ----------
create type public.outreach_campaign_status as enum ('DRAFT', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
create type public.outreach_channel as enum ('MANUAL', 'WHATSAPP', 'EMAIL');
create type public.message_type as enum ('INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP_3', 'RESPONSE', 'CLOSING');
create type public.outreach_message_status as enum ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'READY', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED', 'REJECTED');
create type public.response_category as enum ('INTERESTED', 'QUESTION', 'PRICE', 'LATER', 'NOT_INTERESTED', 'OPT_OUT', 'UNKNOWN');

-- ---------- outreach_campaigns ----------
create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  status public.outreach_campaign_status not null default 'DRAFT',
  target_niche text,
  target_city text,
  target_segment text,
  min_score int not null default 60,
  opportunity_filter text not null default 'ALL',
  offer_name text not null default 'Website Profissional',
  offer_description text,
  offer_price numeric(10,2),
  channel public.outreach_channel not null default 'MANUAL',
  requires_approval boolean not null default true,
  auto_follow_up_enabled boolean not null default true,
  max_contacts_per_day int not null default 20,
  max_contacts_per_hour int not null default 5,
  stats jsonb default '{"selectedCount":0,"readyCount":0,"contactedCount":0,"repliedCount":0,"interestedCount":0,"wonCount":0,"optOutCount":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- ---------- outreach_messages ----------
create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  campaign_id uuid references public.outreach_campaigns (id) on delete set null,
  lead_id uuid not null references public.leads (id) on delete cascade,
  channel public.outreach_channel not null default 'MANUAL',
  type public.message_type not null default 'INITIAL',
  body text not null,
  status public.outreach_message_status not null default 'PENDING_APPROVAL',
  generated_by text not null default 'TEMPLATE',
  ai_provider text,
  ai_model text,
  prompt_version text,
  edited_by_user boolean not null default false,
  approved_at timestamptz,
  sent_at timestamptz,
  copied_at timestamptz,
  whatsapp_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  error_code text,
  error_message text
);

-- ---------- outreach_activities ----------
create table if not exists public.outreach_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  campaign_id uuid references public.outreach_campaigns (id) on delete set null,
  type text not null,
  channel public.outreach_channel not null default 'MANUAL',
  direction text not null default 'OUTBOUND',
  summary text not null,
  detail text,
  actor text not null default 'Sistema',
  created_at timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists idx_outreach_campaigns_ws on public.outreach_campaigns (workspace_id);
create index if not exists idx_outreach_messages_ws on public.outreach_messages (workspace_id);
create index if not exists idx_outreach_messages_lead on public.outreach_messages (lead_id);
create index if not exists idx_outreach_messages_campaign on public.outreach_messages (campaign_id);
create index if not exists idx_outreach_activities_ws on public.outreach_activities (workspace_id);
create index if not exists idx_outreach_activities_lead on public.outreach_activities (lead_id);

-- ---------- RLS ----------
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_activities enable row level security;

create policy "own workspace outreach_campaigns" on public.outreach_campaigns
  for all using (workspace_id = public.current_workspace_id());

create policy "own workspace outreach_messages" on public.outreach_messages
  for all using (workspace_id = public.current_workspace_id());

create policy "own workspace outreach_activities" on public.outreach_activities
  for all using (workspace_id = public.current_workspace_id());
